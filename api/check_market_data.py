from services.arctic_service import ArcticDBService
import logging
import pandas as pd
import sys

# Configuração básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('check-market-data')

def check_market_data():
    """Verifica os dados de mercado no ArcticDB"""
    try:
        print("Conectando ao ArcticDB...")
        service = ArcticDBService()
        
        # Listar símbolos disponíveis
        symbols = service.list_symbols()
        print(f"Total de símbolos disponíveis: {len(symbols)}")
        
        if not symbols:
            print("Nenhum símbolo encontrado no ArcticDB. A migração de dados ainda não foi concluída.")
            return False
        
        print("\nAlguns símbolos disponíveis:")
        for i, symbol in enumerate(sorted(symbols)[:10]):
            print(f"  {i+1}. {symbol}")
        
        # Verificar alguns símbolos importantes
        important_symbols = [
            '^BVSP',    # Ibovespa
            'PETR4.SA', # Petrobras
            'VALE3.SA', # Vale
            'BRL=X',    # USD/BRL
        ]
        
        print("\nVerificando símbolos importantes:")
        for symbol in important_symbols:
            if symbol in symbols:
                data, metadata = service.read_market_data(symbol)
                if not data.empty:
                    print(f"✓ {symbol}: {len(data)} registros, período de {data.index.min().date()} a {data.index.max().date()}")
                else:
                    print(f"✗ {symbol}: Presente, mas sem dados")
            else:
                print(f"✗ {symbol}: Ausente")
        
        # Verificar quantidade de dados por categoria
        print("\nEstatísticas por categoria:")
        brazil_stocks = [s for s in symbols if s.endswith('.SA')]
        indices = [s for s in symbols if s.startswith('^')]
        forex = [s for s in symbols if '=X' in s]
        crypto = [s for s in symbols if any(c in s.upper() for c in ['BTC', 'ETH', 'BNB'])]
        others = [s for s in symbols if s not in brazil_stocks + indices + forex + crypto]
        
        print(f"- Ações brasileiras: {len(brazil_stocks)}")
        print(f"- Índices: {len(indices)}")
        print(f"- Forex: {len(forex)}")
        print(f"- Criptomoedas: {len(crypto)}")
        print(f"- Outros: {len(others)}")
        
        return True
    except Exception as e:
        print(f"Erro ao verificar dados: {e}")
        return False

if __name__ == "__main__":
    print("Verificando dados no ArcticDB...")
    result = check_market_data()
    print(f"\nVerificação completa: {'SUCESSO' if result else 'FALHA'}") 