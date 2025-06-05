from utils.data_migration import migrate_all_data, migrate_symbol_data, migrate_index_data, migrate_brazilian_stocks, migrate_forex_data
import logging
import sys

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('data-migration-script')

def run_migration():
    """Executa migração de dados para o ArcticDB"""
    logger.info("Iniciando migração de dados para o ArcticDB...")
    
    # Migrar índices importantes
    logger.info("Migrando índices importantes...")
    indices_result = migrate_index_data()
    
    # Migrar ações brasileiras principais
    logger.info("Migrando ações brasileiras...")
    br_stocks_result = migrate_brazilian_stocks()
    
    # Migrar principais pares de câmbio
    logger.info("Migrando dados de câmbio...")
    forex_result = migrate_forex_data()
    
    # Verificar resultados
    success_count = sum(1 for r in indices_result.values() if r)
    logger.info(f"Índices migrados com sucesso: {success_count}/{len(indices_result)}")
    
    success_count = sum(1 for r in br_stocks_result.values() if r)
    logger.info(f"Ações brasileiras migradas com sucesso: {success_count}/{len(br_stocks_result)}")
    
    success_count = sum(1 for r in forex_result.values() if r)
    logger.info(f"Pares de câmbio migrados com sucesso: {success_count}/{len(forex_result)}")
    
    logger.info("Migração de dados concluída!")
    return True

if __name__ == "__main__":
    logger.info("Iniciando script de migração de dados...")
    success = run_migration()
    if success:
        logger.info("Script de migração executado com sucesso!")
        sys.exit(0)
    else:
        logger.error("Erro na execução do script de migração!")
        sys.exit(1) 