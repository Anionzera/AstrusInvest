#!/usr/bin/env python
"""
Script para atualizar automaticamente os dados de mercado no ArcticDB.
Pode ser executado manualmente ou agendado via cron/scheduler para manter os dados atualizados.
"""

import os
import sys
import logging
import time
import argparse
from datetime import datetime, timedelta
import pandas as pd

# Adicionar diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'market_data_update.log'))
    ]
)
logger = logging.getLogger('market-data-update')

# Importar após configurar o path
from api.services.arctic_service import ArcticDBService
from api.utils.data_migration import migrate_symbol_data

def get_symbols_to_update(arctic_service, max_age_days=1, category=None):
    """
    Obtém a lista de símbolos que precisam ser atualizados
    
    Args:
        arctic_service: Instância do ArcticDBService
        max_age_days: Idade máxima dos dados em dias
        category: Categoria de símbolos para filtrar (opcional)
    
    Returns:
        list: Lista de símbolos que precisam ser atualizados
    """
    try:
        # Obter todos os símbolos
        if category:
            symbols = arctic_service.list_symbols(filter_tags=[category])
        else:
            symbols = arctic_service.list_symbols()
        
        # Verificar quais precisam ser atualizados
        symbols_to_update = []
        for symbol in symbols:
            if arctic_service.check_needs_update(symbol, max_age_days=max_age_days):
                symbols_to_update.append(symbol)
        
        logger.info(f"Encontrados {len(symbols_to_update)} símbolos para atualizar de um total de {len(symbols)}")
        return symbols_to_update
    except Exception as e:
        logger.error(f"Erro ao obter símbolos para atualização: {str(e)}")
        return []

def update_market_data(symbols=None, max_age_days=1, category=None, force_update=False):
    """
    Atualiza os dados de mercado no ArcticDB
    
    Args:
        symbols: Lista específica de símbolos para atualizar (opcional)
        max_age_days: Idade máxima dos dados em dias
        category: Categoria de símbolos para filtrar (opcional)
        force_update: Se True, atualiza mesmo que os dados sejam recentes
    
    Returns:
        dict: Estatísticas de atualização
    """
    try:
        arctic_service = ArcticDBService()
        
        # Se não foram fornecidos símbolos específicos, obter a lista de símbolos que precisam ser atualizados
        if not symbols:
            if force_update:
                # Se force_update, atualizar todos os símbolos da categoria
                if category:
                    symbols = arctic_service.list_symbols(filter_tags=[category])
                else:
                    symbols = arctic_service.list_symbols()
            else:
                # Caso contrário, apenas os que precisam de atualização
                symbols = get_symbols_to_update(arctic_service, max_age_days, category)
        
        if not symbols:
            logger.info("Nenhum símbolo para atualizar")
            return {"updated": 0, "failed": 0, "total": 0}
        
        # Atualizar cada símbolo
        updated = 0
        failed = 0
        
        for i, symbol in enumerate(symbols):
            logger.info(f"Atualizando {symbol} ({i+1}/{len(symbols)})...")
            
            try:
                # Definir período apropriado para a atualização
                # Para uma atualização incremental, precisamos apenas dos dados recentes
                if not force_update and arctic_service.get_metadata(symbol):
                    # Obter apenas os últimos dias
                    period = f"{max_age_days+5}d"  # Adicionar alguns dias extras para garantir
                else:
                    # Para símbolos novos ou força total, obter dados completos
                    period = "max"
                
                # Atualizar o símbolo
                result = migrate_symbol_data(
                    symbol, 
                    period=period, 
                    interval="1d", 
                    arctic_service=arctic_service
                )
                
                if result:
                    updated += 1
                    logger.info(f"Símbolo {symbol} atualizado com sucesso")
                else:
                    failed += 1
                    logger.warning(f"Falha ao atualizar símbolo {symbol}")
                
                # Pausa para evitar throttling nas APIs
                time.sleep(1)
                
            except Exception as e:
                failed += 1
                logger.error(f"Erro ao atualizar {symbol}: {str(e)}")
        
        logger.info(f"Atualização concluída: {updated} símbolos atualizados, {failed} falhas")
        return {
            "updated": updated,
            "failed": failed,
            "total": len(symbols)
        }
    except Exception as e:
        logger.error(f"Erro na atualização de dados: {str(e)}")
        return {
            "updated": 0,
            "failed": 0,
            "total": 0,
            "error": str(e)
        }

def main():
    """Função principal para atualização de dados de mercado"""
    parser = argparse.ArgumentParser(description='Atualiza dados de mercado no ArcticDB')
    parser.add_argument('--symbols', type=str, help='Lista de símbolos separados por vírgula para atualizar')
    parser.add_argument('--category', type=str, choices=['index', 'brazil', 'forex', 'yahoo_finance'], help='Categoria de símbolos para atualizar')
    parser.add_argument('--max-age', type=int, default=1, help='Idade máxima dos dados em dias')
    parser.add_argument('--force', action='store_true', help='Força atualização de todos os símbolos')
    
    args = parser.parse_args()
    
    # Converter string de símbolos para lista, se fornecido
    symbols = None
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(',')]
    
    # Atualizar dados
    stats = update_market_data(
        symbols=symbols,
        max_age_days=args.max_age,
        category=args.category,
        force_update=args.force
    )
    
    # Exibir estatísticas
    logger.info(f"Estatísticas de atualização:")
    logger.info(f"  - Total de símbolos: {stats['total']}")
    logger.info(f"  - Símbolos atualizados: {stats['updated']}")
    logger.info(f"  - Falhas: {stats['failed']}")
    
    if stats['failed'] > 0:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main()) 