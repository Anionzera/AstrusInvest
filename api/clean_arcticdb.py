#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import logging
import argparse
from datetime import datetime

# Adicionar o diretório pai ao caminho para permitir a importação
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.services.arctic_service import ArcticDBService

# Configuração de logging
logging_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
logging.basicConfig(
    level=logging.INFO,
    format=logging_format,
    handlers=[
        logging.FileHandler("arcticdb_clean.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('arcticdb-cleaner')

def list_libraries(service, args):
    """Lista todas as bibliotecas disponíveis no ArcticDB"""
    try:
        libraries = service.store.list_libraries()
        if libraries:
            logger.info(f"Bibliotecas ArcticDB disponíveis ({len(libraries)}):")
            for i, lib in enumerate(libraries, 1):
                logger.info(f"{i}. {lib}")
        else:
            logger.info("Nenhuma biblioteca encontrada no ArcticDB")
        return libraries
    except Exception as e:
        logger.error(f"Erro ao listar bibliotecas: {str(e)}")
        return []

def list_symbols(service, args):
    """Lista todos os símbolos em uma biblioteca ou em todas as bibliotecas"""
    try:
        libraries = []
        if args.library:
            # Verificar se a biblioteca existe
            all_libs = service.store.list_libraries()
            if args.library not in all_libs:
                logger.error(f"Biblioteca '{args.library}' não encontrada")
                return False
            libraries = [args.library]
        else:
            # Listar todas as bibliotecas
            libraries = service.store.list_libraries()
        
        total_symbols = 0
        for lib_name in libraries:
            try:
                lib = service.store.get_library(lib_name)
                symbols = lib.list_symbols()
                total_symbols += len(symbols)
                logger.info(f"Biblioteca: {lib_name} - {len(symbols)} símbolos")
                if symbols:
                    for i, symbol in enumerate(sorted(symbols), 1):
                        try:
                            # Tentar obter metadados para mostrar informações adicionais
                            try:
                                item = lib.read(symbol)
                                metadata = item.metadata
                                last_updated = metadata.get('last_updated', 'N/A')
                                rows = metadata.get('rows', 'N/A')
                                info = f"(última atualização: {last_updated}, linhas: {rows})"
                            except:
                                info = "(sem metadados)"
                            logger.info(f"  {i}. {symbol} {info}")
                        except Exception as sym_err:
                            logger.warning(f"  {i}. {symbol} (erro: {str(sym_err)})")
            except Exception as lib_err:
                logger.error(f"Erro ao acessar biblioteca {lib_name}: {str(lib_err)}")
                
        logger.info(f"Total de símbolos em todas as bibliotecas: {total_symbols}")
        return True
    except Exception as e:
        logger.error(f"Erro ao listar símbolos: {str(e)}")
        return False

def remove_symbol(service, args):
    """Remove um símbolo específico de uma biblioteca ou todas as bibliotecas"""
    if not args.symbol:
        logger.error("Nome do símbolo não especificado")
        return False
    
    try:
        libraries = []
        if args.library:
            # Verificar se a biblioteca existe
            all_libs = service.store.list_libraries()
            if args.library not in all_libs:
                logger.error(f"Biblioteca '{args.library}' não encontrada")
                return False
            libraries = [args.library]
        else:
            # Usar todas as bibliotecas
            libraries = service.store.list_libraries()
        
        success = False
        for lib_name in libraries:
            try:
                lib = service.store.get_library(lib_name)
                symbols = lib.list_symbols()
                
                if args.symbol in symbols:
                    lib.delete(args.symbol)
                    logger.info(f"Símbolo '{args.symbol}' removido da biblioteca '{lib_name}'")
                    success = True
                else:
                    logger.info(f"Símbolo '{args.symbol}' não encontrado na biblioteca '{lib_name}'")
            except Exception as lib_err:
                logger.error(f"Erro ao acessar biblioteca {lib_name}: {str(lib_err)}")
        
        if success:
            logger.info(f"Símbolo '{args.symbol}' removido com sucesso")
        else:
            logger.warning(f"Símbolo '{args.symbol}' não encontrado em nenhuma biblioteca")
        
        return success
    except Exception as e:
        logger.error(f"Erro ao remover símbolo '{args.symbol}': {str(e)}")
        return False

def clean_library(service, args):
    """Limpa todos os símbolos de uma biblioteca"""
    if not args.library:
        logger.error("Nome da biblioteca não especificado")
        return False
    
    try:
        # Verificar se a biblioteca existe
        all_libs = service.store.list_libraries()
        if args.library not in all_libs:
            logger.error(f"Biblioteca '{args.library}' não encontrada")
            return False
        
        lib = service.store.get_library(args.library)
        symbols = lib.list_symbols()
        
        if not symbols:
            logger.info(f"Biblioteca '{args.library}' já está vazia")
            return True
        
        # Confirmar limpeza se não estiver em modo silencioso
        if not args.silent:
            confirm = input(f"Isso removerá {len(symbols)} símbolos da biblioteca '{args.library}'. Confirmar? (s/n): ")
            if confirm.lower() != 's':
                logger.info("Operação de limpeza cancelada pelo usuário")
                return False
        
        errors = 0
        for symbol in symbols:
            try:
                lib.delete(symbol)
                logger.info(f"Símbolo '{symbol}' removido da biblioteca '{args.library}'")
            except Exception as sym_err:
                logger.error(f"Erro ao remover símbolo '{symbol}': {str(sym_err)}")
                errors += 1
        
        if errors:
            logger.warning(f"Limpeza concluída com {errors} erros")
            return len(symbols) > errors
        else:
            logger.info(f"Biblioteca '{args.library}' limpa com sucesso - {len(symbols)} símbolos removidos")
            return True
    except Exception as e:
        logger.error(f"Erro ao limpar biblioteca '{args.library}': {str(e)}")
        return False

def delete_library(service, args):
    """Remove completamente uma biblioteca do ArcticDB"""
    if not args.library:
        logger.error("Nome da biblioteca não especificado")
        return False
    
    try:
        # Verificar se a biblioteca existe
        all_libs = service.store.list_libraries()
        if args.library not in all_libs:
            logger.error(f"Biblioteca '{args.library}' não encontrada")
            return False
        
        # Confirmar exclusão se não estiver em modo silencioso
        if not args.silent:
            confirm = input(f"Isso removerá COMPLETAMENTE a biblioteca '{args.library}'. Esta ação é IRREVERSÍVEL. Confirmar? (s/n): ")
            if confirm.lower() != 's':
                logger.info("Operação de exclusão cancelada pelo usuário")
                return False
        
        # No ArcticDB, primeiro precisamos limpar a biblioteca, depois removê-la
        try:
            lib = service.store.get_library(args.library)
            symbols = lib.list_symbols()
            
            # Remover todos os símbolos primeiro
            for symbol in symbols:
                try:
                    lib.delete(symbol)
                    logger.info(f"Símbolo '{symbol}' removido da biblioteca '{args.library}'")
                except Exception as sym_err:
                    logger.warning(f"Erro ao remover símbolo '{symbol}': {str(sym_err)}")
            
            # Agora excluir a biblioteca
            service.store.delete_library(args.library)
            logger.info(f"Biblioteca '{args.library}' removida com sucesso")
            return True
            
        except Exception as delete_err:
            logger.error(f"Erro ao excluir biblioteca '{args.library}': {str(delete_err)}")
            return False
    except Exception as e:
        logger.error(f"Erro ao excluir biblioteca '{args.library}': {str(e)}")
        return False

def main():
    """Função principal para executar o script"""
    parser = argparse.ArgumentParser(description='Ferramenta para limpeza e manutenção do ArcticDB')
    
    # Adicionando compatibilidade com flags antigas (--list-libraries, etc.)
    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument('--action', '-a', choices=['list_libraries', 'list_symbols', 'remove_symbol', 'clean_library', 'delete_library'],
                        help='Ação a ser executada')
    action_group.add_argument('--list-libraries', action='store_true', help='Listar todas as bibliotecas')
    action_group.add_argument('--list-symbols', action='store_true', help='Listar símbolos em uma biblioteca')
    action_group.add_argument('--remove-symbol', action='store_true', help='Remover um símbolo específico')
    action_group.add_argument('--clean-library', action='store_true', help='Limpar todos os símbolos de uma biblioteca')
    action_group.add_argument('--delete-library', action='store_true', help='Excluir completamente uma biblioteca')
    
    parser.add_argument('--library', '-l', help='Nome da biblioteca ArcticDB')
    parser.add_argument('--symbol', '-s', help='Nome do símbolo (ticker) a ser removido')
    parser.add_argument('--connection', '-c', default='lmdb://astrus_db', help='String de conexão ArcticDB (default: lmdb://astrus_db)')
    parser.add_argument('--silent', action='store_true', help='Modo silencioso (não solicita confirmação)')
    
    args = parser.parse_args()
    
    # Converter flags alternativas para o formato action
    if args.list_libraries:
        args.action = 'list_libraries'
    elif args.list_symbols:
        args.action = 'list_symbols'
    elif args.remove_symbol:
        args.action = 'remove_symbol'
    elif args.clean_library:
        args.action = 'clean_library'
    elif args.delete_library:
        args.action = 'delete_library'
    
    logger.info(f"Iniciando ferramenta de limpeza ArcticDB: {args.action}")
    
    try:
        # Inicializar serviço ArcticDB
        service = ArcticDBService(connection_string=args.connection)
        
        # Executar ação solicitada
        if args.action == 'list_libraries':
            list_libraries(service, args)
        elif args.action == 'list_symbols':
            list_symbols(service, args)
        elif args.action == 'remove_symbol':
            if not args.symbol:
                logger.error("Para remover um símbolo, é necessário especificar --symbol")
                return 1
            remove_symbol(service, args)
        elif args.action == 'clean_library':
            if not args.library:
                logger.error("Para limpar uma biblioteca, é necessário especificar --library")
                return 1
            clean_library(service, args)
        elif args.action == 'delete_library':
            if not args.library:
                logger.error("Para excluir uma biblioteca, é necessário especificar --library")
                return 1
            delete_library(service, args)
        
        logger.info(f"Operação {args.action} concluída")
        return 0
    except Exception as e:
        logger.error(f"Erro ao executar a ferramenta de limpeza: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 