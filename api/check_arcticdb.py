from services.arctic_service import ArcticDBService
import logging

# Configuração básica de logging
logging.basicConfig(level=logging.INFO)

def check_arcticdb():
    try:
        print("Inicializando ArcticDBService...")
        service = ArcticDBService()
        print("ArcticDBService inicializado com sucesso!")
        
        symbols = service.list_symbols()
        print(f"Símbolos disponíveis: {symbols}")
        
        print("Testando escrita de dados...")
        import pandas as pd
        import numpy as np
        from datetime import datetime, timedelta
        
        # Criar dados de teste
        dates = pd.date_range(start=datetime.now() - timedelta(days=30), periods=30, freq='D')
        data = pd.DataFrame({
            'Open': np.random.randn(30) * 10 + 100,
            'High': np.random.randn(30) * 10 + 105,
            'Low': np.random.randn(30) * 10 + 95,
            'Close': np.random.randn(30) * 10 + 101,
            'Volume': np.random.randint(1000, 10000, 30)
        }, index=dates)
        
        # Escrever dados de teste
        result = service.write_market_data('TEST_SYMBOL', data, {'source': 'test'})
        print(f"Resultado da escrita: {result}")
        
        # Ler dados de teste
        print("Testando leitura de dados...")
        read_data, metadata = service.read_market_data('TEST_SYMBOL')
        print(f"Dados lidos: {len(read_data)} registros")
        print(f"Metadados: {metadata}")
        
        return True
    
    except Exception as e:
        print(f"Erro ao verificar ArcticDB: {e}")
        return False

if __name__ == "__main__":
    print("Verificando conexão com ArcticDB...")
    result = check_arcticdb()
    print(f"Verificação completa: {'SUCESSO' if result else 'FALHA'}") 