import pandas as pd
import yfinance as yf
import logging
import time
from datetime import datetime, timedelta
import sys
import os
import threading
import schedule
import requests

# Adicionar o diretório pai ao sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.arctic_service import ArcticDBService

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('data-migration')

def migrate_symbol_data(symbol, period="max", interval="1d", arctic_service=None):
    """
    Migra dados históricos de um símbolo para o ArcticDB
    
    Args:
        symbol: Símbolo a ser migrado
        period: Período de dados a obter
        interval: Intervalo dos dados
        arctic_service: Instância do ArcticDBService
    
    Returns:
        bool: True se migrado com sucesso
    """
    if arctic_service is None:
        arctic_service = ArcticDBService()
    
    try:
        logger.info(f"Obtendo dados históricos para {symbol}, período: {period}, intervalo: {interval}")
        
        # Baixar dados do Yahoo Finance com auto_adjust=False para ter Adj Close
        data = yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=False)
        
        if data.empty:
            logger.warning(f"Nenhum dado obtido para {symbol}")
            return False
        
        # Adicionar metadados específicos da fonte
        metadata = {
            'source': 'yahoo_finance',
            'period': period,
            'interval': interval,
            'download_timestamp': datetime.now(),
            'columns_original': list(data.columns)
        }
        
        # Adicionar tags apropriadas
        tags = ['yahoo_finance']
        
        # Adicionar tags específicas para índices, ações, etc.
        if symbol.startswith('^'):
            tags.append('index')
        elif symbol.endswith('.SA'):
            tags.append('brazil')
        elif '=' in symbol:
            tags.append('forex')
        
        # Salvar no ArcticDB
        result = arctic_service.write_market_data(symbol, data, metadata, tags)
        return result
        
    except Exception as e:
        logger.error(f"Erro ao migrar dados para {symbol}: {str(e)}")
        return False

def migrate_index_data(arctic_service=None):
    """
    Migra dados de índices importantes
    
    Returns:
        dict: Status da migração de cada índice
    """
    if arctic_service is None:
        arctic_service = ArcticDBService()
    
    indices = [
        "^BVSP",  # Ibovespa
        "^IFIX",  # Índice de Fundos Imobiliários
        "^GSPC",  # S&P 500
        "^IXIC",  # NASDAQ
        "^DJI",   # Dow Jones
        "^FTSE",  # FTSE 100
        "^N225"   # Nikkei 225
    ]
    
    result = {}
    for idx in indices:
        result[idx] = migrate_symbol_data(idx, "10y", arctic_service=arctic_service)
        time.sleep(1)  # Pausa para evitar throttling
    
    success_count = sum(1 for status in result.values() if status)
    logger.info(f"Migração de índices concluída: {success_count}/{len(indices)} bem-sucedidos")
    return result

def migrate_brazilian_stocks(stocks=None, arctic_service=None):
    """
    Migra dados de ações brasileiras
    
    Args:
        stocks: Lista de símbolos de ações brasileiras (opcional)
        arctic_service: Instância do ArcticDBService
    
    Returns:
        dict: Status da migração de cada ação
    """
    if arctic_service is None:
        arctic_service = ArcticDBService()
    
    # Lista padrão de ações brasileiras se não for fornecida
    if stocks is None:
        stocks = [
            "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "ABEV3.SA", 
            "B3SA3.SA", "WEGE3.SA", "RENT3.SA", "BBAS3.SA", "JBSS3.SA",
            "ITSA4.SA", "SUZB3.SA", "MGLU3.SA", "BBSE3.SA", "EGIE3.SA"
        ]
    
    result = {}
    for stock in stocks:
        # Adicionar .SA ao final se não estiver presente
        if not stock.endswith('.SA'):
            stock = f"{stock}.SA"
        
        result[stock] = migrate_symbol_data(stock, "5y", arctic_service=arctic_service)
        time.sleep(1)  # Pausa para evitar throttling
    
    success_count = sum(1 for status in result.values() if status)
    logger.info(f"Migração de ações brasileiras concluída: {success_count}/{len(stocks)} bem-sucedidas")
    return result

def migrate_us_stocks(stocks=None, arctic_service=None):
    """
    Migra dados de ações americanas
    
    Args:
        stocks: Lista de símbolos de ações americanas (opcional)
        arctic_service: Instância do ArcticDBService
    
    Returns:
        dict: Status da migração de cada ação
    """
    if arctic_service is None:
        arctic_service = ArcticDBService()
    
    # Lista padrão de ações americanas se não for fornecida
    if stocks is None:
        stocks = [
            "AAPL", "MSFT", "GOOGL", "AMZN", "META", 
            "TSLA", "NVDA", "JPM", "JNJ", "UNH",
            "V", "PG", "HD", "BAC", "XOM"
        ]
    
    result = {}
    for stock in stocks:
        result[stock] = migrate_symbol_data(stock, "5y", arctic_service=arctic_service)
        time.sleep(1)  # Pausa para evitar throttling
    
    success_count = sum(1 for status in result.values() if status)
    logger.info(f"Migração de ações americanas concluída: {success_count}/{len(stocks)} bem-sucedidas")
    return result

def migrate_forex_data(pairs=None, arctic_service=None):
    """
    Migra dados de pares de moedas
    
    Args:
        pairs: Lista de pares de moedas (opcional)
        arctic_service: Instância do ArcticDBService
    
    Returns:
        dict: Status da migração de cada par
    """
    if arctic_service is None:
        arctic_service = ArcticDBService()
    
    # Lista padrão de pares de moedas se não for fornecida
    if pairs is None:
        pairs = [
            "BRL=X",   # USD/BRL
            "EURBRL=X", # EUR/BRL
            "GBPBRL=X", # GBP/BRL
            "EURUSD=X", # EUR/USD
            "USDJPY=X", # USD/JPY
            "GBPUSD=X"  # GBP/USD
        ]
    
    result = {}
    for pair in pairs:
        result[pair] = migrate_symbol_data(pair, "5y", arctic_service=arctic_service)
        time.sleep(1)  # Pausa para evitar throttling
    
    success_count = sum(1 for status in result.values() if status)
    logger.info(f"Migração de pares de moedas concluída: {success_count}/{len(pairs)} bem-sucedidos")
    return result

def migrate_all_data():
    """
    Migra todos os tipos de dados financeiros
    
    Returns:
        dict: Status da migração por categoria
    """
    try:
        logger.info("Iniciando migração completa de dados financeiros para ArcticDB")
        arctic_service = ArcticDBService()
        
        result = {
            'indices': migrate_index_data(arctic_service),
            'brazilian_stocks': migrate_brazilian_stocks(arctic_service=arctic_service),
            'us_stocks': migrate_us_stocks(arctic_service=arctic_service),
            'forex': migrate_forex_data(arctic_service=arctic_service)
        }
        
        # Calcular estatísticas
        total_symbols = sum(len(category) for category in result.values())
        total_success = sum(sum(1 for status in category.values() if status) for category in result.values())
        
        logger.info(f"Migração completa concluída: {total_success}/{total_symbols} símbolos migrados com sucesso")
        return result
    except Exception as e:
        logger.error(f"Erro na migração completa: {str(e)}")
        return {'error': str(e)}

def proactive_data_refresh(symbols=None, interval='1d', arctic_service=None):
    """
    Atualiza proativamente os dados no ArcticDB para os símbolos mais utilizados ou problemáticos.
    
    Args:
        symbols: Lista de símbolos para atualizar. Se None, usa lista predefinida
        interval: Intervalo dos dados ('1d' por padrão)
        arctic_service: Instância do ArcticDBService
        
    Returns:
        dict: Status da atualização por símbolo
    """
    if arctic_service is None:
        from services.arctic_service import ArcticDBService
        arctic_service = ArcticDBService()
    
    # Se nenhuma lista for fornecida, usar lista de símbolos prioritários
    if symbols is None:
        # Lista de símbolos prioritários por categoria
        symbols = {
            'brazilian_indices': ['^BVSP', '^IFIX', '^SMLL', '^IDIV'],
            'world_indices': ['^GSPC', '^IXIC', '^DJI', '^FTSE', '^N225'],
            'brazilian_stocks': [
                'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA', 
                'B3SA3.SA', 'WEGE3.SA', 'RENT3.SA', 'BBAS3.SA', 'JBSS3.SA',
                'ITSA4.SA', 'SUZB3.SA', 'MGLU3.SA', 'BBSE3.SA', 'EGIE3.SA'
            ],
            'major_stocks': [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'
            ],
            'forex': ['BRL=X', 'EURBRL=X', 'GBPBRL=X', 'JPYBRL=X', 'EURUSD=X', 'USDJPY=X'],
            'commodities': ['CL=F', 'GC=F', 'SI=F', 'HG=F', 'NG=F']
        }
        # Achatar a lista
        symbols = [symbol for category, symbols_list in symbols.items() for symbol in symbols_list]
    
    results = {}
    total_symbols = len(symbols)
    success_count = 0
    
    logger.info(f"Iniciando atualização proativa de {total_symbols} símbolos")
    
    # Processar cada símbolo com tempo de pausa para evitar bloqueio
    for i, symbol in enumerate(symbols):
        try:
            # Verificar se o símbolo precisa ser atualizado
            needs_update = arctic_service.check_needs_update(symbol, max_age_days=1)
            
            if needs_update:
                # Período adaptativo: mais história para índices, menos para outros
                period = "5y" if "^" in symbol else "1y"
                
                # Lógica especial para criptomoedas - usar Binance ao invés do Yahoo Finance
                crypto_symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'DOGE']
                is_crypto = any(crypto in symbol.upper() for crypto in crypto_symbols)
                
                if is_crypto:
                    # Para criptomoedas, usar função especial que obtém dados da Binance
                    success = migrate_crypto_data(symbol, arctic_service=arctic_service)
                else:
                    # Para outros ativos, usar o Yahoo Finance
                    success = migrate_symbol_data(symbol, period, interval, arctic_service)
                
                if success:
                    success_count += 1
                    logger.info(f"Atualização proativa: {symbol} ({i+1}/{total_symbols}) atualizado com sucesso")
                else:
                    logger.warning(f"Atualização proativa: {symbol} ({i+1}/{total_symbols}) falhou")
            else:
                logger.info(f"Atualização proativa: {symbol} ({i+1}/{total_symbols}) já está atualizado")
                success_count += 1  # Consideramos como sucesso se já estiver atualizado
                
            results[symbol] = not needs_update or success
            
            # Pausa entre requisições para evitar throttling
            if i < total_symbols - 1:  # Não espera após o último
                time.sleep(1)  # 1 segundo entre requisições
                
        except Exception as e:
            logger.error(f"Erro na atualização proativa de {symbol}: {str(e)}")
            results[symbol] = False
    
    logger.info(f"Atualização proativa concluída: {success_count}/{total_symbols} símbolos atualizados")
    return results

def migrate_crypto_data(symbol, arctic_service=None):
    """
    Migra dados de criptomoedas da Binance para o ArcticDB
    
    Args:
        symbol: Símbolo a ser migrado (pode conter formatos como BTC-USD, BTCUSD, etc)
        arctic_service: Instância do ArcticDBService
    
    Returns:
        bool: True se migrado com sucesso
    """
    if arctic_service is None:
        from services.arctic_service import ArcticDBService
        arctic_service = ArcticDBService()
    
    try:
        # Extrair o símbolo base da criptomoeda
        crypto_symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'DOGE', 'USDT', 'USDC']
        base_symbol = None
        
        for crypto in crypto_symbols:
            if crypto in symbol.upper():
                base_symbol = crypto
                break
        
        if not base_symbol:
            logger.error(f"Símbolo de criptomoeda não reconhecido: {symbol}")
            return False
        
        # Formatar para Binance (BTCUSDT)
        binance_symbol = f"{base_symbol}USDT"
        
        # Obter dados da Binance
        try:
            # Tentar obter dados históricos da Binance
            interval_map = {'1d': '1d', '1h': '1h', '15m': '15m'}
            binance_interval = interval_map.get('1d', '1d')  # Default para diário
            
            # URL da API da Binance
            url = f"https://api.binance.com/api/v3/klines"
            params = {
                'symbol': binance_symbol,
                'interval': binance_interval,
                'limit': 1000  # Máximo permitido
            }
            
            response = requests.get(url, params=params)
            if response.status_code != 200:
                logger.error(f"Erro ao obter dados da Binance: {response.status_code}")
                return False
            
            # Processar dados da resposta
            klines = response.json()
            
            # Converter para DataFrame
            df = pd.DataFrame(klines, columns=[
                'open_time', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Converter para formato compatível com ArcticDB
            df['date'] = pd.to_datetime(df['open_time'], unit='ms')
            df = df.set_index('date')
            df = df.astype({
                'open': float, 'high': float, 'low': float, 
                'close': float, 'volume': float
            })
            
            # Renomear colunas para formato padrão
            df = df.rename(columns={
                'open': 'Open', 
                'high': 'High', 
                'low': 'Low', 
                'close': 'Close', 
                'volume': 'Volume'
            })
            
            # Selecionar apenas as colunas OHLCV
            df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
            
            if df.empty:
                logger.warning(f"Nenhum dado obtido da Binance para {binance_symbol}")
                return False
            
            # Adicionar metadados
            metadata = {
                'source': 'binance',
                'interval': binance_interval,
                'download_timestamp': datetime.now(),
                'original_symbol': symbol,
                'binance_symbol': binance_symbol
            }
            
            # Adicionar tags
            tags = ['binance', 'crypto']
            
            # Salvar no ArcticDB (usando o símbolo original como chave)
            result = arctic_service.write_market_data(symbol, df, metadata, tags)
            
            logger.info(f"Migração de dados Binance para {symbol} concluída: {len(df)} registros")
            return result
            
        except Exception as e:
            logger.error(f"Erro ao obter dados da Binance para {symbol}: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao migrar dados da criptomoeda {symbol}: {str(e)}")
        return False

def schedule_regular_updates():
    """
    Configura tarefas agendadas para atualizar periodicamente os dados no ArcticDB
    """
    try:
        # Criar instância do serviço ArcticDB
        from services.arctic_service import ArcticDBService
        arctic_service = ArcticDBService()
        
        # Função que será executada pelo agendador
        def run_updates():
            logger.info("Iniciando atualização agendada do ArcticDB")
            try:
                # Atualizar dados em uma thread separada para não bloquear o servidor
                update_thread = threading.Thread(
                    target=proactive_data_refresh,
                    kwargs={'arctic_service': arctic_service}
                )
                update_thread.daemon = True
                update_thread.start()
            except Exception as e:
                logger.error(f"Erro ao iniciar thread de atualização: {str(e)}")
        
        # Agendar atualizações diárias às 1:30 da manhã
        schedule.every().day.at("01:30").do(run_updates)
        
        # Agendar atualização de dados de criptomoedas a cada 4 horas
        def update_crypto():
            logger.info("Iniciando atualização agendada de criptomoedas")
            try:
                crypto_symbols = [
                    'BTC-USD', 'ETH-USD', 'BNB-USD', 'ADA-USD',
                    'SOL-USD', 'DOT-USD', 'XRP-USD', 'DOGE-USD'
                ]
                # Thread separada para atualização de criptos
                update_thread = threading.Thread(
                    target=proactive_data_refresh,
                    kwargs={
                        'symbols': crypto_symbols,
                        'arctic_service': arctic_service
                    }
                )
                update_thread.daemon = True
                update_thread.start()
            except Exception as e:
                logger.error(f"Erro ao iniciar thread de atualização de criptomoedas: {str(e)}")
        
        schedule.every(4).hours.do(update_crypto)
        
        # Thread para executar o agendador
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Verifica a cada minuto se há tarefas pendentes
        
        scheduler_thread = threading.Thread(target=run_scheduler)
        scheduler_thread.daemon = True
        scheduler_thread.start()
        
        logger.info("Agendador de atualizações do ArcticDB iniciado com sucesso")
        
    except Exception as e:
        logger.error(f"Erro ao configurar agendador de atualizações: {str(e)}")

# Se o módulo for executado diretamente, realizar migração completa e configurar atualizações periódicas
if __name__ == "__main__":
    # Realizar migração completa inicial
    migrate_all_data()
    
    # Configurar atualizações periódicas
    schedule_regular_updates() 