#!/usr/bin/env python
"""
Script para configurar e inicializar o ArcticDB no MongoDB.
Também popula o banco de dados com alguns dados iniciais básicos.
"""

import os
import sys
import logging
import pymongo
import time
from datetime import datetime

# Adicionar diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('setup-arctic')

# Importar após configurar o path
from api.services.arctic_service import ArcticDBService
from api.utils.data_migration import (
    migrate_index_data, 
    migrate_brazilian_stocks, 
    migrate_us_stocks, 
    migrate_forex_data
)

def check_mongodb():
    """Verifica se o MongoDB está rodando e acessível"""
    try:
        client = pymongo.MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
        client.server_info()  # Vai levantar exceção se não conseguir conectar
        logger.info("MongoDB está rodando e acessível")
        return True
    except Exception as e:
        logger.error(f"MongoDB não está acessível: {str(e)}")
        return False

def setup_arctic():
    """Inicializa a estrutura do ArcticDB no MongoDB"""
    try:
        arctic_service = ArcticDBService()
        logger.info("ArcticDB inicializado com sucesso")
        return arctic_service
    except Exception as e:
        logger.error(f"Erro ao inicializar ArcticDB: {str(e)}")
        return None

def populate_initial_data(arctic_service):
    """Popula o ArcticDB com dados iniciais básicos"""
    if not arctic_service:
        logger.error("ArcticDB não inicializado, não é possível popular dados")
        return False
    
    logger.info("Iniciando migração de dados iniciais para o ArcticDB")
    
    # Migrar índices principais
    logger.info("Migrando dados de índices principais...")
    migrate_index_data(arctic_service=arctic_service)
    
    # Migrar algumas ações brasileiras principais
    logger.info("Migrando dados de ações brasileiras principais...")
    br_stocks = ["PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "ABEV3.SA"]
    migrate_brazilian_stocks(stocks=br_stocks, arctic_service=arctic_service)
    
    # Migrar algumas ações americanas principais
    logger.info("Migrando dados de ações americanas principais...")
    us_stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
    migrate_us_stocks(stocks=us_stocks, arctic_service=arctic_service)
    
    # Migrar principais pares de moedas
    logger.info("Migrando dados de pares de moedas...")
    forex_pairs = ["BRL=X", "EURUSD=X", "USDJPY=X"]
    migrate_forex_data(pairs=forex_pairs, arctic_service=arctic_service)
    
    logger.info("Migração de dados iniciais concluída com sucesso")
    return True

def main():
    """Função principal para configurar e inicializar o ArcticDB"""
    logger.info("Iniciando configuração do ArcticDB")
    
    # Verificar MongoDB
    if not check_mongodb():
        logger.error("Não foi possível conectar ao MongoDB. Verifique se o serviço está rodando.")
        logger.info("No Windows, você pode iniciá-lo com: mongod --dbpath=C:\\data\\db")
        logger.info("No Linux/Mac, você pode iniciá-lo com: mongod --dbpath=/data/db")
        return False
    
    # Configurar ArcticDB
    arctic_service = setup_arctic()
    if not arctic_service:
        return False
    
    # Popular dados iniciais
    populate_initial_data(arctic_service)
    
    logger.info("Configuração do ArcticDB concluída com sucesso")
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        logger.error("Configuração do ArcticDB falhou")
        sys.exit(1)
    sys.exit(0) 