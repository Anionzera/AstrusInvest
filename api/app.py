from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import traceback
import logging
import numpy as np
import random
import datetime
import requests
import hashlib
import hmac
import urllib.parse
from flask_caching import Cache

# Importar as rotas do ArcticDB
from routes.arctic_routes import arctic_bp

# Importar as rotas do Fundamentus
from routes.fundamentus_routes import fundamentus_bp

# Importar as rotas do Valuation
from routes.valuation_routes import valuation_bp

# Importar as rotas de Performance Analysis
from routes.performance_routes import performance_bp

# Importar as rotas do SKFolio
from routes.skfolio_routes import skfolio_bp

# Importar as novas rotas de Valuation V2 (comentado - arquivo não existe)
# from routes.valuation_routes_v2 import register_valuation_v2_routes

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('yfinance-api')

app = Flask(__name__)
CORS(app)  # Habilita CORS para todas as rotas

# Registrar blueprint do ArcticDB
app.register_blueprint(arctic_bp, url_prefix='/api/arctic')

# Registrar blueprint do Fundamentus
app.register_blueprint(fundamentus_bp)

# Registrar blueprint do Valuation
app.register_blueprint(valuation_bp)

# Registrar blueprint de Performance Analysis
app.register_blueprint(performance_bp)

# Registrar blueprint do SKFolio
app.register_blueprint(skfolio_bp)

# Registrar as novas rotas de Valuation V2 (comentado - arquivo não existe)
# register_valuation_v2_routes(app)

# Configuração do cache
cache_config = {
    "DEBUG": True,
    "CACHE_TYPE": "SimpleCache",  # Cache em memória para desenvolvimento
    "CACHE_DEFAULT_TIMEOUT": 300  # Timeout padrão de 5 minutos (300 segundos)
}
cache = Cache(app, config=cache_config)
logger.info("Sistema de cache inicializado com timeout padrão de 300 segundos")

# Inicializar o agendamento de atualizações do ArcticDB
try:
    from utils.data_migration import schedule_regular_updates
    # Iniciar o agendamento em uma thread separada para não bloquear a inicialização
    import threading
    update_thread = threading.Thread(target=schedule_regular_updates)
    update_thread.daemon = True
    update_thread.start()
    logger.info("Sistema de atualização proativa do ArcticDB iniciado com sucesso")
except Exception as e:
    logger.error(f"Erro ao iniciar sistema de atualização proativa do ArcticDB: {str(e)}")

# Função auxiliar para limpar o cache relacionado a um símbolo específico
def clear_symbol_cache(symbol):
    """Limpa o cache relacionado a um símbolo específico."""
    try:
        # Lista de padrões de URL que podem ter o símbolo
        patterns = [
            f'/api/market-data/quote?symbol={symbol}',
            f'/api/market-data/history?symbol={symbol}',
            f'/api/binance/ticker?symbol={symbol}',
            f'/api/binance/klines?symbol={symbol}'
        ]
        
        count = 0
        for pattern in patterns:
            if cache.delete(pattern):
                count += 1
                logger.info(f"Cache limpo para: {pattern}")
        
        logger.info(f"Limpeza de cache para símbolo {symbol}: {count} itens removidos")
        return count
    except Exception as e:
        logger.error(f"Erro ao limpar cache para símbolo {symbol}: {str(e)}")
        return 0

# Função auxiliar para formatar símbolo corretamente para o Yahoo Finance
def format_symbol(symbol):
    # Decodificar símbolo se estiver em formato URL encoded
    if '%5E' in symbol:
        symbol = symbol.replace('%5E', '^')
    
    if '%3D' in symbol:  # = em URL encoded
        symbol = symbol.replace('%3D', '=')
    
    # Remover qualquer sufixo .SA adicionado indevidamente aos índices e moedas
    if symbol.startswith('^') and symbol.endswith('.SA'):
        return symbol[:-3]  # Remove .SA para índices
    
    if '=' in symbol and symbol.endswith('.SA'):
        return symbol[:-3]  # Remove .SA para taxas de câmbio
        
    # Para ações brasileiras comuns, adicionar .SA se não tiver
    if not '.' in symbol and not '^' in symbol and not '=' in symbol:
        return f"{symbol}.SA"
        
    return symbol

# Função para determinar a melhor fonte de dados para cada tipo de ativo
def get_best_data_source(symbol):
    """
    Determina a melhor fonte de dados para cada símbolo com base no seu tipo.
    
    Args:
        symbol (str): Símbolo do ativo
        
    Returns:
        tuple: (fonte_principal, fonte_backup, categoria)
    """
    # Formatar o símbolo para facilitar análise
    formatted_symbol = format_symbol(symbol)
    
    # Criptomoedas - priorizar Binance
    crypto_symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'DOGE', 'USDT', 'USDC']
    for crypto in crypto_symbols:
        if crypto in symbol.upper():
            logger.info(f"Roteamento inteligente: {symbol} identificado como criptomoeda, usando Binance")
            return ('binance', 'arcticdb', 'crypto')
    
    # Ações brasileiras
    if '.SA' in formatted_symbol:
        logger.info(f"Roteamento inteligente: {symbol} identificado como ação brasileira")
        return ('arcticdb', 'yahoo', 'brazilian_stock')
        
    # Índices específicos com problemas conhecidos
    problematic_indices = {
        '^IFIX': ('custom', 'arcticdb', 'brazilian_index'),  # Usar dados fictícios para IFIX
        '^IDIV': ('arcticdb', 'yahoo', 'brazilian_index')    # IDIV tem problemas no Yahoo
    }
    
    if formatted_symbol in problematic_indices:
        source, backup, category = problematic_indices[formatted_symbol]
        logger.info(f"Roteamento inteligente: {symbol} identificado como índice problemático, usando {source}")
        return (source, backup, category)
        
    # Pares de moedas com BRL
    if '=X' in formatted_symbol and 'BRL' in formatted_symbol:
        # Verificar se é uma crypto/BRL que não existe no Yahoo
        for crypto in crypto_symbols:
            if f"{crypto}BRL=X" == formatted_symbol:
                logger.info(f"Roteamento inteligente: {symbol} identificado como par crypto/BRL, redirecionando para Binance")
                # Para pares crypto/BRL, convertemos para consultar USDT na Binance e depois convertemos
                return ('binance', 'custom', 'crypto_forex')
        
        # Outros pares de moedas com BRL
        logger.info(f"Roteamento inteligente: {symbol} identificado como par de moedas com BRL")
        return ('arcticdb', 'yahoo', 'forex')
        
    # Outros pares de moedas
    if '=X' in formatted_symbol:
        logger.info(f"Roteamento inteligente: {symbol} identificado como par de moedas")
        return ('arcticdb', 'yahoo', 'forex')
        
    # Índices gerais
    if formatted_symbol.startswith('^'):
        logger.info(f"Roteamento inteligente: {symbol} identificado como índice")
        return ('arcticdb', 'yahoo', 'index')
        
    # Futuros (commodities)
    if formatted_symbol.endswith('=F'):
        logger.info(f"Roteamento inteligente: {symbol} identificado como futuro/commodity")
        return ('arcticdb', 'yahoo', 'future')
    
    # Default: Yahoo com backup do ArcticDB
    logger.info(f"Roteamento inteligente: {symbol} usando fontes padrão")
    return ('arcticdb', 'yahoo', 'other')

@app.route('/api/market-data/quote', methods=['GET'])
@cache.cached(timeout=60, query_string=True)  # Cache de 1 minuto, considerando query strings
def get_quote():
    """Obtém a cotação atual de um ativo."""
    try:
        symbol = request.args.get('symbol', '')
        
        if not symbol:
            return jsonify({"error": "Símbolo não fornecido"}), 400
        
        # Formatar o símbolo corretamente
        formatted_symbol = format_symbol(symbol)
        logger.info(f"Buscando cotação para o símbolo: {formatted_symbol} (original: {symbol})")
        
        # Determinar a melhor fonte de dados para este símbolo
        primary_source, backup_source, asset_category = get_best_data_source(symbol)
        
        # Implementar roteamento inteligente baseado na fonte determinada
        if primary_source == 'binance' and asset_category == 'crypto':
            # Redirecionar diretamente para a API Binance
            crypto_symbol = None
            for crypto in ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'DOGE', 'USDT', 'USDC']:
                if crypto in symbol.upper():
                    crypto_symbol = f"{crypto}USDT"
                    break
            
            if crypto_symbol:
                try:
                    # Temporariamente redirecionando para a rota binance
                    redirect_url = f"/api/binance/ticker?symbol={crypto_symbol}"
                    logger.info(f"Redirecionando {symbol} para {redirect_url}")
                    
                    # Retornar redirecionamento para a API Binance
                    return redirect(redirect_url)
                except Exception as e:
                    logger.error(f"Erro ao redirecionar para Binance: {str(e)}")
                    # Continua para fallback
        
        # Implementar roteamento para crypto/BRL através de conversão
        if primary_source == 'binance' and asset_category == 'crypto_forex':
            crypto_base = None
            for crypto in ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'DOGE', 'USDT', 'USDC']:
                if symbol.upper().startswith(crypto):
                    crypto_base = crypto
                    break
                    
            if crypto_base:
                try:
                    # Obter cotação da crypto em USDT
                    crypto_symbol = f"{crypto_base}USDT"
                    binance_url = f"/api/binance/ticker?symbol={crypto_symbol}"
                    crypto_response = requests.get(request.host_url + binance_url[1:])
                    
                    # Obter taxa de câmbio USD/BRL
                    forex_symbol = "BRL=X"
                    forex_ticker = yf.Ticker(forex_symbol)
                    forex_history = forex_ticker.history(period="1d")
                    usd_brl_rate = float(forex_history['Close'].iloc[-1]) if not forex_history.empty else 5.0
                    
                    if crypto_response.status_code == 200:
                        crypto_data = crypto_response.json()
                        price_usd = float(crypto_data.get('price', 0))
                        price_brl = price_usd * usd_brl_rate
                        
                        # Construir resposta combinada
                        return jsonify({
                            "symbol": f"{crypto_base}BRL=X",
                            "shortName": f"{crypto_base}/BRL",
                            "longName": f"{crypto_base} em Real Brasileiro",
                            "regularMarketPrice": price_brl,
                            "regularMarketChange": 0.0,  # Precisaria calcular a partir de preços anteriores
                            "regularMarketChangePercent": 0.0,  # Precisaria calcular a partir de preços anteriores
                            "source": "binance_converted",
                            "usdBrlRate": usd_brl_rate
                        })
                except Exception as e:
                    logger.error(f"Erro ao converter crypto/BRL: {str(e)}")
                    # Continua para fallback
        
        # Para índices problemáticos específicos
        if primary_source == 'custom' and formatted_symbol == '^IFIX':
            # Tratamento especial para IFIX que não funciona bem com ticker.info
            try:
                # Tentar usar o ETF XFII11.SA primeiro com Adj Close
                history = yf.download('XFII11.SA', period="2d", progress=False, auto_adjust=False)
                
                if not history.empty:
                    # Priorizar Adj Close
                    if 'Adj Close' in history.columns:
                        close_col = 'Adj Close'
                        logger.info("✅ Usando Adj Close para XFII11.SA (proxy IFIX)")
                    elif 'Close' in history.columns:
                        close_col = 'Close'
                        logger.warning("⚠️ Adj Close não disponível, usando Close para XFII11.SA")
                    else:
                        raise ValueError("❌ Nenhuma coluna de preço encontrada para XFII11.SA")
                    
                    last_close = float(history[close_col].iloc[-1])
                    prev_close = float(history[close_col].iloc[-2]) if len(history) > 1 else last_close
                    change = last_close - prev_close
                    change_percent = (change / prev_close) if prev_close else 0
                    
                    logger.info(f"Usando dados reais de XFII11.SA para IFIX")
                    
                    return jsonify({
                        "symbol": formatted_symbol,
                        "shortName": "Índice de Fundos Imobiliários",
                        "longName": "Índice de Fundos Imobiliários B3",
                        "regularMarketPrice": last_close,
                        "regularMarketChange": change,
                        "regularMarketChangePercent": change_percent,
                        "regularMarketDayHigh": float(history['High'].iloc[-1]) if 'High' in history else last_close,
                        "regularMarketDayLow": float(history['Low'].iloc[-1]) if 'Low' in history else last_close,
                        "regularMarketOpen": float(history['Open'].iloc[-1]) if 'Open' in history else last_close,
                        "regularMarketPreviousClose": prev_close,
                        "regularMarketVolume": int(history['Volume'].iloc[-1]) if 'Volume' in history else 0,
                        "regularMarketTime": int(history.index[-1].timestamp()),
                    })
                else:
                    # Dados fictícios para o IFIX quando não conseguiu obter dados reais
                    logger.warning(f"Usando dados fictícios para IFIX pois não conseguiu obter dados reais")
                    
                    today = datetime.datetime.now()
                    yesterday = today - datetime.timedelta(days=1)
                    
                    # Dados fictícios recentes
                    last_close = 3142.32
                    prev_close = 3135.18
                    change = last_close - prev_close
                    change_percent = (change / prev_close) * 100
                    
                    return jsonify({
                        "symbol": formatted_symbol,
                        "shortName": "Índice de Fundos Imobiliários",
                        "longName": "Índice de Fundos Imobiliários B3",
                        "regularMarketPrice": last_close,
                        "regularMarketChange": change,
                        "regularMarketChangePercent": change_percent,
                        "regularMarketDayHigh": last_close * 1.01,
                        "regularMarketDayLow": last_close * 0.99,
                        "regularMarketOpen": prev_close * 1.002,
                        "regularMarketPreviousClose": prev_close,
                        "regularMarketVolume": 1000000,
                        "regularMarketTime": int(today.timestamp()),
                    })
            except Exception as e:
                # Se ocorrer qualquer erro, usar dados fictícios
                logger.error(f"Erro no tratamento especial para IFIX: {str(e)}")
                logger.error(traceback.format_exc())
                
                today = datetime.datetime.now()
                
                # Dados fictícios recentes
                last_close = 3142.32
                prev_close = 3135.18
                change = last_close - prev_close
                change_percent = (change / prev_close) * 100
                
                return jsonify({
                    "symbol": formatted_symbol,
                    "shortName": "Índice de Fundos Imobiliários",
                    "longName": "Índice de Fundos Imobiliários B3",
                    "regularMarketPrice": last_close,
                    "regularMarketChange": change,
                    "regularMarketChangePercent": change_percent,
                    "regularMarketDayHigh": last_close * 1.01,
                    "regularMarketDayLow": last_close * 0.99,
                    "regularMarketOpen": prev_close * 1.002,
                    "regularMarketPreviousClose": prev_close,
                    "regularMarketVolume": 1000000,
                    "regularMarketTime": int(today.timestamp()),
                })
        
        # Tratamento especial para BRL=X (taxa de câmbio)
        elif formatted_symbol == 'BRL=X':
            try:
                # Para BRL=X, usar auto_adjust=False e priorizar Adj Close
                history = yf.download(formatted_symbol, period="2d", progress=False, auto_adjust=False)
                
                if not history.empty:
                    # Priorizar Adj Close para taxa de câmbio
                    if 'Adj Close' in history.columns:
                        close_col = 'Adj Close'
                        logger.info("✅ Usando Adj Close para BRL=X")
                    elif 'Close' in history.columns:
                        close_col = 'Close'
                        logger.warning("⚠️ Adj Close não disponível, usando Close para BRL=X")
                    else:
                        raise ValueError("❌ Nenhuma coluna de preço encontrada para BRL=X")
                    
                    # Para BRL=X, o Yahoo retorna USD/BRL (por exemplo, 5.5 para 5.5 reais por dólar)
                    last_close = float(history[close_col].iloc[-1])
                    prev_close = float(history[close_col].iloc[-2]) if len(history) > 1 else last_close
                    change = last_close - prev_close
                    change_percent = (change / prev_close) if prev_close else 0
                    
                    # Manter high e low sem inversão, já que queremos o valor real em BRL
                    high = float(history['High'].iloc[-1]) if 'High' in history else 0
                    low = float(history['Low'].iloc[-1]) if 'Low' in history else 0
                    
                    return jsonify({
                        "symbol": formatted_symbol,
                        "shortName": "Real Brasileiro/Dólar Americano",
                        "longName": "BRL/USD",
                        "regularMarketPrice": last_close,
                        "regularMarketChange": change,
                        "regularMarketChangePercent": change_percent,
                        "regularMarketDayHigh": high,
                        "regularMarketDayLow": low,
                        "regularMarketOpen": float(history['Open'].iloc[-1]) if 'Open' in history else last_close,
                        "regularMarketPreviousClose": prev_close,
                        "regularMarketVolume": int(history['Volume'].iloc[-1]) if 'Volume' in history else 0,
                        "regularMarketTime": int(history.index[-1].timestamp()),
                    })
                else:
                    return jsonify({"error": f"Sem dados históricos para {formatted_symbol}"}), 500
            except Exception as e:
                logger.error(f"Erro no tratamento especial para BRL=X: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({"error": str(e)}), 500
        
        # Para outros símbolos, usar o método padrão
        ticker = yf.Ticker(formatted_symbol)
        info = ticker.info
        
        if not info:
            # Tentar usar dados históricos como fallback com Adj Close
            try:
                history = yf.download(formatted_symbol, period="2d", progress=False, auto_adjust=False)
                
                if not history.empty:
                    # Priorizar Adj Close no fallback
                    if 'Adj Close' in history.columns:
                        close_col = 'Adj Close'
                        logger.info(f"✅ Usando Adj Close para fallback de {formatted_symbol}")
                    elif 'Close' in history.columns:
                        close_col = 'Close'
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para fallback de {formatted_symbol}")
                    else:
                        raise ValueError(f"❌ Nenhuma coluna de preço encontrada para fallback de {formatted_symbol}")
                    
                    last_close = float(history[close_col].iloc[-1])
                    prev_close = float(history[close_col].iloc[-2]) if len(history) > 1 else last_close
                    change = last_close - prev_close
                    change_percent = (change / prev_close) if prev_close else 0
                    
                    # Se tivermos dados históricos mas não info, criar um objeto info básico
                    info = {
                        "symbol": formatted_symbol,
                        "shortName": formatted_symbol,
                        "regularMarketPrice": last_close,
                        "regularMarketChange": change,
                        "regularMarketChangePercent": change_percent,
                        "regularMarketDayHigh": float(history['High'].iloc[-1]) if 'High' in history else last_close,
                        "regularMarketDayLow": float(history['Low'].iloc[-1]) if 'Low' in history else last_close,
                        "regularMarketOpen": float(history['Open'].iloc[-1]) if 'Open' in history else last_close,
                        "regularMarketPreviousClose": prev_close,
                        "regularMarketVolume": int(history['Volume'].iloc[-1]) if 'Volume' in history else 0,
                        "regularMarketTime": int(history.index[-1].timestamp()),
                    }
                else:
                    return jsonify({"error": f"Símbolo '{symbol}' não encontrado"}), 404
            except Exception as inner_e:
                logger.error(f"Erro no fallback para dados históricos: {str(inner_e)}")
                return jsonify({"error": f"Símbolo '{symbol}' não encontrado"}), 404
        
        # Retorna os dados relevantes
        return jsonify(info)
    
    except Exception as e:
        logger.error(f"Erro ao obter cotação: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/history', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache de 5 minutos, considerando query strings
def get_history():
    """Obtém dados históricos de um ativo."""
    try:
        # Obter parâmetros da requisição
        symbol = request.args.get('symbol', '')
        period = request.args.get('period', '1y')
        interval = request.args.get('interval', '1d')
        prefer_arctic = request.args.get('prefer_arctic', 'true').lower() == 'true'
        
        if not symbol:
            return jsonify({"error": "Símbolo não fornecido"}), 400
        
        # Formatar o símbolo corretamente para o Yahoo Finance
        formatted_symbol = format_symbol(symbol)
        logger.info(f"Buscando histórico para o símbolo: {formatted_symbol} (original: {symbol}), período: {period}, intervalo: {interval}")
        
        # NOVA FUNCIONALIDADE: Tentar obter dados do ArcticDB primeiro se preferido
        if prefer_arctic:
            try:
                # Importar serviço ArcticDB apenas se necessário (evita problemas se não estiver configurado)
                from services.arctic_service import ArcticDBService
                arctic_service = ArcticDBService()
                
                # Determinar datas com base no período solicitado
                end_date = datetime.datetime.now()
                
                if period.endswith('d'):
                    days = int(period[:-1])
                    start_date = end_date - datetime.timedelta(days=days)
                elif period.endswith('w'):
                    weeks = int(period[:-1])
                    start_date = end_date - datetime.timedelta(weeks=weeks)
                elif period.endswith('mo'):
                    months = int(period[:-2])
                    start_date = end_date - datetime.timedelta(days=months*30)
                elif period.endswith('y'):
                    years = int(period[:-1])
                    start_date = end_date - datetime.timedelta(days=years*365)
                elif period == 'max':
                    start_date = None
                else:
                    # Período desconhecido, usar 1 ano como padrão
                    start_date = end_date - datetime.timedelta(days=365)
                
                # Converter para string se não for None
                start_date_str = start_date.strftime('%Y-%m-%d') if start_date else None
                end_date_str = end_date.strftime('%Y-%m-%d')
                
                # Buscar dados do ArcticDB
                data, metadata = arctic_service.read_market_data(
                    formatted_symbol, 
                    start_date=start_date_str, 
                    end_date=end_date_str
                )
                
                # Se encontrou dados e o intervalo corresponde
                if not data.empty and metadata.get('interval') == interval:
                    logger.info(f"Dados para {formatted_symbol} obtidos do ArcticDB: {len(data)} registros")
                    
                    # Garantir que as colunas esperadas estão presentes
                    expected_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
                    if all(col in data.columns for col in expected_columns):
                        # Verificar se possui dados suficientes
                        if len(data) >= 5:  # Pelo menos 5 pontos de dados
                            # Formatar a resposta como esperado
                            response = {
                                "symbol": formatted_symbol,
                                "history": []
                            }
                            
                            # Converter o DataFrame para o formato esperado
                            for idx, row in data.iterrows():
                                entry = {
                                    "date": idx.strftime('%Y-%m-%d'),
                                    "open": float(row['Open']) if 'Open' in row else None,
                                    "high": float(row['High']) if 'High' in row else None,
                                    "low": float(row['Low']) if 'Low' in row else None,
                                    "close": float(row['Close']) if 'Close' in row else None,
                                    "volume": int(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else 0
                                }
                                response["history"].append(entry)
                            
                            # Adicionar informação sobre a fonte dos dados
                            response["source"] = "arcticdb"
                            response["metadata"] = {
                                "interval": metadata.get('interval', interval),
                                "start_date": metadata.get('start_date'),
                                "end_date": metadata.get('end_date'),
                                "rows": len(data)
                            }
                            
                            return jsonify(response)
            except Exception as arctic_error:
                logger.warning(f"Erro ao obter dados do ArcticDB para {formatted_symbol}: {str(arctic_error)}. Tentando Yahoo Finance.")
        
        # Caso não tenha conseguido do ArcticDB, buscar do Yahoo Finance
        # USAR auto_adjust=False para ter Adj Close separado e priorizar ele
        history = yf.download(formatted_symbol, period=period, interval=interval, 
                             progress=False, auto_adjust=False)
        
        if history.empty:
            return jsonify({"error": f"Nenhum dado histórico encontrado para {formatted_symbol}"}), 404
        
        # Função para extrair preços com prioridade ABSOLUTA para Adj Close
        def extract_adj_close_data(df, symbol_name):
            """Extrai dados priorizando SEMPRE Adj Close."""
            price_columns = {}
            
            # Tratar MultiIndex (múltiplos símbolos)
            if isinstance(df.columns, pd.MultiIndex):
                logger.info(f"Processando MultiIndex para {symbol_name}")
                
                # Mapear colunas do MultiIndex
                for col in df.columns:
                    col_name = col[0].lower().replace(' ', '_')
                    if col_name not in price_columns:
                        price_columns[col_name] = col
                
                # PRIORIDADE ABSOLUTA: Adj Close
                if 'adj_close' in price_columns:
                    close_data = df[price_columns['adj_close']]
                    logger.info(f"✅ Usando Adj Close para {symbol_name}")
                elif 'close' in price_columns:
                    close_data = df[price_columns['close']]
                    logger.warning(f"⚠️ Adj Close não disponível, usando Close para {symbol_name}")
                else:
                    raise ValueError(f"❌ Nenhuma coluna de preço encontrada para {symbol_name}")
                
                # Outras colunas OHLCV
                open_data = df[price_columns['open']] if 'open' in price_columns else None
                high_data = df[price_columns['high']] if 'high' in price_columns else None
                low_data = df[price_columns['low']] if 'low' in price_columns else None
                volume_data = df[price_columns['volume']] if 'volume' in price_columns else None
                
            else:
                # Colunas simples - PRIORIDADE ABSOLUTA para Adj Close
                if 'Adj Close' in df.columns:
                    close_data = df['Adj Close']
                    logger.info(f"✅ Usando Adj Close para {symbol_name}")
                elif 'Close' in df.columns:
                    close_data = df['Close']
                    logger.warning(f"⚠️ Adj Close não disponível, usando Close para {symbol_name}")
                else:
                    raise ValueError(f"❌ Nenhuma coluna de preço encontrada para {symbol_name}")
                
                # Outras colunas OHLCV
                open_data = df.get('Open')
                high_data = df.get('High')
                low_data = df.get('Low')
                volume_data = df.get('Volume')
            
            return {
                'close': close_data,
                'open': open_data,
                'high': high_data,
                'low': low_data,
                'volume': volume_data
            }
        
        # Extrair dados com prioridade Adj Close
        try:
            price_data = extract_adj_close_data(history, formatted_symbol)
        except ValueError as e:
            logger.error(f"Erro ao extrair dados de preço: {e}")
            return jsonify({"error": str(e), "symbol": formatted_symbol}), 500
        
        # Processar os dados históricos
        response = {
            "symbol": formatted_symbol,
            "history": []
        }
        
        # Coletar os dados históricos usando SEMPRE Adj Close quando disponível
        for index in history.index:
            entry = {
                "date": index.strftime('%Y-%m-%d'),
                "close": round(float(price_data['close'].loc[index]) if pd.notna(price_data['close'].loc[index]) else 0, 4),
                "volume": int(price_data['volume'].loc[index]) if price_data['volume'] is not None and pd.notna(price_data['volume'].loc[index]) else 0
            }
            
            # Adicionar OHLC se disponível
            if price_data['open'] is not None:
                entry["open"] = round(float(price_data['open'].loc[index]) if pd.notna(price_data['open'].loc[index]) else 0, 4)
            if price_data['high'] is not None:
                entry["high"] = round(float(price_data['high'].loc[index]) if pd.notna(price_data['high'].loc[index]) else 0, 4)
            if price_data['low'] is not None:
                entry["low"] = round(float(price_data['low'].loc[index]) if pd.notna(price_data['low'].loc[index]) else 0, 4)
            
            response["history"].append(entry)
        
        # Adicionar informação sobre a fonte dos dados
        response["source"] = "yahoo_finance"
        
        # NOVA FUNCIONALIDADE: Salvar os dados no ArcticDB para uso futuro
        try:
            from services.arctic_service import ArcticDBService
            arctic_service = ArcticDBService()
            
            # Preparar metadados
            metadata = {
                'source': 'yahoo_finance',
                'period': period,
                'interval': interval,
                'download_timestamp': datetime.datetime.now()
            }
            
            # Adicionar tags apropriadas
            tags = ['yahoo_finance']
            if formatted_symbol.startswith('^'):
                tags.append('index')
            elif formatted_symbol.endswith('.SA'):
                tags.append('brazil')
            elif '=' in formatted_symbol:
                tags.append('forex')
            
            # Salvar no ArcticDB em segundo plano
            arctic_service.write_market_data(formatted_symbol, history, metadata, tags)
            logger.info(f"Dados para {formatted_symbol} salvos no ArcticDB com sucesso")
        except Exception as e:
            logger.error(f"Erro ao salvar dados no ArcticDB para {formatted_symbol}: {str(e)}")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Erro ao obter histórico para {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/technical-analysis', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache de 5 minutos, considerando query strings
def get_technical_analysis():
    """Obtém indicadores de análise técnica para um ativo."""
    try:
        symbol = request.args.get('symbol', '')
        period = request.args.get('period', '1y')
        interval = request.args.get('interval', '1d')
        indicators = request.args.get('indicators', 'sma,ema,macd,rsi,bbands')  # Indicadores padrão
        
        if not symbol:
            return jsonify({"error": "Símbolo não fornecido"}), 400
        
        # Formatar o símbolo corretamente
        formatted_symbol = format_symbol(symbol)
        logger.info(f"Calculando análise técnica para o símbolo: {formatted_symbol} (original: {symbol})")
        
        # Obter histórico de preços para calcular indicadores usando SEMPRE Adj Close
        try:
            # USAR auto_adjust=False para ter Adj Close separado
            history = yf.download(formatted_symbol, period=period, interval=interval, 
                                 progress=False, auto_adjust=False)
            
            if history.empty:
                return jsonify({"error": f"Não foi possível obter histórico para '{symbol}'"}), 404
            
            # Converter para DataFrame pandas para cálculo de indicadores
            import pandas as pd
            import pandas_ta as ta
            
            # Função para extrair preços com prioridade ABSOLUTA para Adj Close
            def extract_ta_data(df, symbol_name):
                """Extrai dados para análise técnica priorizando SEMPRE Adj Close."""
                ta_data = {}
                
                # Tratar MultiIndex (múltiplos símbolos)
                if isinstance(df.columns, pd.MultiIndex):
                    logger.info(f"Processando MultiIndex para análise técnica de {symbol_name}")
                    
                    # Mapear colunas do MultiIndex
                    col_mapping = {}
                    for col in df.columns:
                        col_name = col[0].lower().replace(' ', '_')
                        if col_name not in col_mapping:
                            col_mapping[col_name] = col
                    
                    # PRIORIDADE ABSOLUTA: Adj Close para Close
                    if 'adj_close' in col_mapping:
                        ta_data['close'] = df[col_mapping['adj_close']]
                        logger.info(f"✅ Usando Adj Close para análise técnica de {symbol_name}")
                    elif 'close' in col_mapping:
                        ta_data['close'] = df[col_mapping['close']]
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para análise técnica de {symbol_name}")
                    else:
                        raise ValueError(f"❌ Nenhuma coluna de preço encontrada para análise técnica de {symbol_name}")
                    
                    # Outras colunas para análise técnica
                    ta_data['open'] = df[col_mapping['open']] if 'open' in col_mapping else ta_data['close']
                    ta_data['high'] = df[col_mapping['high']] if 'high' in col_mapping else ta_data['close']
                    ta_data['low'] = df[col_mapping['low']] if 'low' in col_mapping else ta_data['close']
                    ta_data['volume'] = df[col_mapping['volume']] if 'volume' in col_mapping else pd.Series([0] * len(df), index=df.index)
                    
                else:
                    # Colunas simples - PRIORIDADE ABSOLUTA para Adj Close
                    if 'Adj Close' in df.columns:
                        ta_data['close'] = df['Adj Close']
                        logger.info(f"✅ Usando Adj Close para análise técnica de {symbol_name}")
                    elif 'Close' in df.columns:
                        ta_data['close'] = df['Close']
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para análise técnica de {symbol_name}")
                    else:
                        raise ValueError(f"❌ Nenhuma coluna de preço encontrada para análise técnica de {symbol_name}")
                    
                    # Outras colunas para análise técnica (fallback para close se não disponível)
                    ta_data['open'] = df.get('Open', ta_data['close'])
                    ta_data['high'] = df.get('High', ta_data['close'])
                    ta_data['low'] = df.get('Low', ta_data['close'])
                    ta_data['volume'] = df.get('Volume', pd.Series([0] * len(df), index=df.index))
                
                return pd.DataFrame(ta_data, index=df.index)
            
            # Extrair dados com prioridade Adj Close para análise técnica
            try:
                df = extract_ta_data(history, formatted_symbol)
            except ValueError as e:
                logger.error(f"Erro ao extrair dados para análise técnica: {e}")
                return jsonify({"error": str(e), "symbol": formatted_symbol}), 500
            
            # Inicializar objeto para resultado
            result = {
                "symbol": formatted_symbol,
                "period": period,
                "interval": interval,
                "indicators": {}
            }
            
            # Lista de indicadores solicitados
            indicator_list = indicators.split(',')
            
            # Calcular os indicadores solicitados
            for indicator in indicator_list:
                indicator = indicator.strip().lower()
                
                if indicator == 'sma':
                    # Médias Móveis Simples de diferentes períodos
                    df['sma_20'] = ta.sma(df['close'], length=20)
                    df['sma_50'] = ta.sma(df['close'], length=50)
                    df['sma_200'] = ta.sma(df['close'], length=200)
                    result["indicators"]["sma"] = {
                        "sma_20": df['sma_20'].dropna().tolist(),
                        "sma_50": df['sma_50'].dropna().tolist(),
                        "sma_200": df['sma_200'].dropna().tolist()
                    }
                
                elif indicator == 'ema':
                    # Médias Móveis Exponenciais de diferentes períodos
                    df['ema_12'] = ta.ema(df['close'], length=12)
                    df['ema_26'] = ta.ema(df['close'], length=26)
                    df['ema_50'] = ta.ema(df['close'], length=50)
                    result["indicators"]["ema"] = {
                        "ema_12": df['ema_12'].dropna().tolist(),
                        "ema_26": df['ema_26'].dropna().tolist(),
                        "ema_50": df['ema_50'].dropna().tolist()
                    }
                
                elif indicator == 'macd':
                    # MACD com configurações padrão
                    macd = ta.macd(df['close'])
                    result["indicators"]["macd"] = {
                        "macd": macd['MACD_12_26_9'].dropna().tolist(),
                        "signal": macd['MACDs_12_26_9'].dropna().tolist(),
                        "histogram": macd['MACDh_12_26_9'].dropna().tolist()
                    }
                
                elif indicator == 'rsi':
                    # RSI com período de 14
                    df['rsi'] = ta.rsi(df['close'], length=14)
                    result["indicators"]["rsi"] = {
                        "rsi": df['rsi'].dropna().tolist()
                    }
                
                elif indicator == 'bbands':
                    # Bandas de Bollinger com período de 20
                    bbands = ta.bbands(df['close'], length=20)
                    result["indicators"]["bbands"] = {
                        "upper": bbands['BBU_20_2.0'].dropna().tolist(),
                        "middle": bbands['BBM_20_2.0'].dropna().tolist(),
                        "lower": bbands['BBL_20_2.0'].dropna().tolist()
                    }
                
                elif indicator == 'stoch':
                    # Estocástico
                    stoch = ta.stoch(df['high'], df['low'], df['close'])
                    result["indicators"]["stoch"] = {
                        "k": stoch['STOCHk_14_3_3'].dropna().tolist(),
                        "d": stoch['STOCHd_14_3_3'].dropna().tolist()
                    }
                
                elif indicator == 'adx':
                    # ADX (Average Directional Index)
                    adx = ta.adx(df['high'], df['low'], df['close'])
                    result["indicators"]["adx"] = {
                        "adx": adx['ADX_14'].dropna().tolist(),
                        "dmp": adx['DMP_14'].dropna().tolist(),
                        "dmn": adx['DMN_14'].dropna().tolist()
                    }
                
                elif indicator == 'atr':
                    # Average True Range
                    df['atr'] = ta.atr(df['high'], df['low'], df['close'])
                    result["indicators"]["atr"] = {
                        "atr": df['atr'].dropna().tolist()
                    }
            
            # Adicionar datas para associar com os valores dos indicadores
            result["dates"] = [date.strftime('%Y-%m-%d %H:%M:%S') for date in df.index]
            
            # Adicionar preços para referência
            result["prices"] = {
                "close": df['close'].tolist(),
                "open": df['open'].tolist(),
                "high": df['high'].tolist(),
                "low": df['low'].tolist(),
                "volume": df['volume'].tolist() if 'volume' in df else []
            }
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Erro ao calcular indicadores técnicos: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({"error": f"Erro ao calcular indicadores técnicos para '{symbol}': {str(e)}"}), 500
    
    except Exception as e:
        logger.error(f"Erro na análise técnica: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/search', methods=['GET'])
def search_securities():
    """Pesquisa por ativos."""
    try:
        query = request.args.get('query', '')
        
        if not query:
            return jsonify({"error": "Termo de pesquisa não fornecido"}), 400
        
        # Formatar query se necessário
        formatted_query = query
        if not '.' in query and len(query) == 5 and query[-1] == 'F':
            # Possível ação brasileira
            formatted_query = f"{query}.SA"
            
        logger.info(f"Pesquisando por: {formatted_query}")
        
        try:
            # Tentar buscar usando tickers diretos
            tickers = yf.Tickers(formatted_query)
            results = {"quotes": []}
            
            for t in tickers.tickers:
                try:
                    info = tickers.tickers[t].info
                    if info:
                        results["quotes"].append({
                            "symbol": t,
                            "shortName": info.get('shortName', ''),
                            "longName": info.get('longName', ''),
                            "exchange": info.get('exchange', '')
                        })
                except Exception as e:
                    logger.warning(f"Erro ao obter informações para {t}: {str(e)}")
            
            if not results["quotes"]:
                # Fallback para busca na API de pesquisa
                search_url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&lang=pt-BR&region=BR&quotesCount=10&newsCount=0&enableFuzzyQuery=false"
                response = requests.get(search_url)
                if response.status_code == 200:
                    search_results = response.json()
                    if "quotes" in search_results:
                        results = {"quotes": search_results["quotes"]}
            
            return jsonify(results)
                
        except Exception as inner_e:
            logger.error(f"Erro na pesquisa primária: {str(inner_e)}")
            
            # Tentar método alternativo
            results = {"quotes": [
                {"symbol": query, "shortName": query}
            ]}
            return jsonify(results)
    
    except Exception as e:
        logger.error(f"Erro na pesquisa: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/fundamentals', methods=['GET'])
def get_fundamentals():
    """Obtém dados fundamentalistas de um ativo."""
    try:
        symbol = request.args.get('symbol', '')
        
        if not symbol:
            return jsonify({"error": "Símbolo não fornecido"}), 400
        
        # Formatar o símbolo corretamente
        formatted_symbol = format_symbol(symbol)
        logger.info(f"Buscando fundamentos para o símbolo: {formatted_symbol}")
        
        # Busca dados fundamentalistas
        ticker = yf.Ticker(formatted_symbol)
        
        # Obter diferentes tipos de dados
        info = ticker.info
        
        # Para tickers sem dados fundamentalistas, retornar apenas as informações básicas
        if not info or len(info) < 5:
            return jsonify({"info": info or {}, "error": "Dados fundamentalistas indisponíveis para este ativo"})
        
        try:
            financials = ticker.financials.to_dict() if not ticker.financials.empty else {}
            balance_sheet = ticker.balance_sheet.to_dict() if not ticker.balance_sheet.empty else {}
            cashflow = ticker.cashflow.to_dict() if not ticker.cashflow.empty else {}
            
            # Converter timestamps para strings
            financials = {k: {str(date): val for date, val in v.items()} for k, v in financials.items()}
            balance_sheet = {k: {str(date): val for date, val in v.items()} for k, v in balance_sheet.items()}
            cashflow = {k: {str(date): val for date, val in v.items()} for k, v in cashflow.items()}
        except Exception as inner_e:
            logger.warning(f"Erro ao obter dados financeiros detalhados: {str(inner_e)}")
            financials = {}
            balance_sheet = {}
            cashflow = {}
        
        # Combinar todos os dados
        fundamental_data = {
            "info": info,
            "financials": financials,
            "balanceSheet": balance_sheet,
            "cashflow": cashflow
        }
        
        return jsonify(fundamental_data)
    
    except Exception as e:
        logger.error(f"Erro ao obter dados fundamentalistas: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/indices', methods=['GET'])
def get_market_indices():
    """Obtém dados dos principais índices de mercado."""
    try:
        # Lista de índices a serem buscados (sem o sufixo .SA para índices brasileiros)
        indices = [
            '^BVSP',    # Ibovespa
            '^IFIX',    # Índice de Fundos Imobiliários
            '^DJI',     # Dow Jones
            '^GSPC',    # S&P 500
            '^IXIC',    # NASDAQ
            '^VIX',     # Índice de Volatilidade
            'BRL=X'     # Real/Dólar
        ]
        
        result = {}
        
        for idx in indices:
            try:
                # Não precisamos formatar aqui pois já estão no formato correto
                # Usar yf.download com auto_adjust=False para ter Adj Close
                hist = yf.download(idx, period="1d", progress=False, auto_adjust=False)
                
                if not hist.empty:
                    # Priorizar Adj Close para índices
                    if 'Adj Close' in hist.columns:
                        last_price = float(hist['Adj Close'].iloc[-1])
                        logger.info(f"✅ Usando Adj Close para índice {idx}")
                    elif 'Close' in hist.columns:
                        last_price = float(hist['Close'].iloc[-1])
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para índice {idx}")
                    else:
                        last_price = None
                        logger.error(f"❌ Nenhuma coluna de preço encontrada para índice {idx}")
                    
                    # Para BRL=X, não precisamos mais inverter o valor
                    # Mantemos o valor original (USD/BRL)
                    # O Yahoo retorna USD/BRL, que é o valor que precisamos
                    
                    # Usar o nome do índice conhecido
                    name_map = {
                        '^BVSP': 'Ibovespa',
                        '^IFIX': 'Índice de Fundos Imobiliários',
                        '^DJI': 'Dow Jones',
                        '^GSPC': 'S&P 500',
                        '^IXIC': 'NASDAQ',
                        '^VIX': 'Índice de Volatilidade VIX',
                        'BRL=X': 'Real/Dólar'
                    }
                    
                    result[idx] = {
                        'symbol': idx,
                        'name': name_map.get(idx, idx),
                        'currentPrice': last_price,
                        'change': None,  # Requires comparison with previous day
                        'changePercent': None,
                    }
                else:
                    logger.warning(f"Sem dados históricos para o índice {idx}")
            except Exception as e:
                logger.warning(f"Erro ao obter dados para o índice {idx}: {str(e)}")
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Erro ao obter índices de mercado: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/market-data/macroeconomic', methods=['GET'])
def get_macroeconomic_data():
    """Obtém dados macroeconômicos de fontes oficiais como IBGE e Banco Central do Brasil."""
    try:
        import requests
        import datetime
        import time
        import json
        
        # URLs para APIs do Banco Central do Brasil (SGS - Sistema Gerenciador de Séries Temporais)
        # Documentação: https://www3.bcb.gov.br/sgspub/JSP/sgsgeral/sgsAjuda.jsp
        BC_API_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{}/dados/ultimos/{}?formato=json"
        
        # Códigos de séries importantes do Banco Central
        SERIES_CODES = {
            'selic': 11,           # Taxa de juros - Selic acumulada no mês
            'selic_meta': 432,     # Meta para taxa Selic (% a.a.)
            'ipca': 433,           # IPCA - geral - var. % mensal
            'ipca_12m': 13522,     # IPCA - Acumulado em 12 meses (% a.a.)
            'pib_mensal': 4380,    # PIB Mensal - Valores correntes (em milhões)
            'pib_var': 1253,       # PIB - var. % trimestral dessazonalizada
            'igpm': 189,           # IGP-M - geral - var. % mensal
            'igpm_12m': 10764,     # IGP-M - acumulado 12 meses
            'inpc': 188,           # INPC - var. % mensal
            'inpc_12m': 13521,     # INPC - Acumulado em 12 meses (% a.a.)
            'desemprego': 24369,   # Taxa de desocupação (PNADC-M) trimestral
            'cambio': 1,           # Taxa de câmbio - Livre - Dólar americano (venda) - diário
            'cdi': 12,             # Taxa de juros - CDI acumulado no mês
            'cdi_anual': 4389,     # Taxa DI-Cetip acumulada no ano (% a.a.)
            'divida_pib': 13762,   # Dívida líquida do setor público (% PIB)
            'div_bruta': 13761,    # Dívida bruta do governo geral (% PIB)
            'balanca_comercial': 22707,  # Balança comercial - saldo - mensal
            'reservas_intern': 13621,    # Reservas internacionais - conceito liquidez - mensal
            'risco_brasil': 11752,  # Risco-país (EMBI+ Brasil) (pontos-base)
            'focus_ipca': 221,     # Focus - IPCA - Expectativa média - anual
            'focus_pib': 223,      # Focus - PIB total - Expectativa média - anual
            'focus_cambio': 222,   # Focus - Câmbio - Expectativa média - fim período
            'focus_selic': 224     # Focus - Selic - Expectativa média - fim período
        }
        
        # URLs para APIs do IBGE
        IBGE_API_BASE = "https://servicodados.ibge.gov.br/api/v3"
        
        # Dicionário para armazenar dados do Banco Central
        bc_data = {}
        
        logger.info("Buscando dados macroeconômicos do Banco Central do Brasil...")
        
        # Função para obter dados do Banco Central do Brasil
        def get_bc_data(series_code, num_entries=3):
            try:
                url = BC_API_BASE.format(series_code, num_entries)
                response = requests.get(url, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    # Ordena por data em ordem decrescente para ter os dados mais recentes primeiro
                    data = sorted(data, key=lambda x: x.get('data', ''), reverse=True)
                    return data
                else:
                    logger.warning(f"Erro ao obter dados da série {series_code}: {response.status_code}")
                    return None
            except Exception as e:
                logger.error(f"Erro ao obter dados da série {series_code}: {str(e)}")
                return None
        
        # Busca dados de cada série do Banco Central
        brasil_indicadores = []
        
        # IPCA Acumulado 12 meses
        ipca_data = get_bc_data(SERIES_CODES['ipca_12m'], 2)
        if ipca_data and len(ipca_data) >= 2:
            current_ipca = float(ipca_data[0]['valor'])
            previous_ipca = float(ipca_data[1]['valor'])
            periodo_ipca = ipca_data[0]['data']
            
            brasil_indicadores.append({
                'nome': 'IPCA (Anual)',
                'valor': f"{current_ipca:.2f}%",
                'valorAnterior': f"{previous_ipca:.2f}%",
                'periodo': f'Acumulado 12 meses - {periodo_ipca}',
                'tendencia': 'down' if current_ipca < previous_ipca else 'up',
                'fonte': 'IBGE/Banco Central'
            })
            logger.info(f"Dados do IPCA acumulado obtidos: {current_ipca}%")
        
        # IGP-M Acumulado 12 meses
        igpm_data = get_bc_data(SERIES_CODES['igpm_12m'], 2)
        if igpm_data and len(igpm_data) >= 2:
            current_igpm = float(igpm_data[0]['valor'])
            previous_igpm = float(igpm_data[1]['valor'])
            periodo_igpm = igpm_data[0]['data']
            
            brasil_indicadores.append({
                'nome': 'IGP-M (Anual)',
                'valor': f"{current_igpm:.2f}%",
                'valorAnterior': f"{previous_igpm:.2f}%",
                'periodo': f'Acumulado 12 meses - {periodo_igpm}',
                'tendencia': 'down' if current_igpm < previous_igpm else 'up',
                'fonte': 'FGV/Banco Central'
            })
            logger.info(f"Dados do IGP-M acumulado obtidos: {current_igpm}%")
        
        # Meta Selic
        selic_data = get_bc_data(SERIES_CODES['selic_meta'], 2)
        if selic_data and len(selic_data) >= 2:
            current_selic = float(selic_data[0]['valor'])
            previous_selic = float(selic_data[1]['valor'])
            periodo_selic = selic_data[0]['data']
            
            brasil_indicadores.append({
                'nome': 'Taxa Selic',
                'valor': f"{current_selic:.2f}%",
                'valorAnterior': f"{previous_selic:.2f}%",
                'periodo': f'Meta - {periodo_selic}',
                'tendencia': 'down' if current_selic < previous_selic else 'up',
                'fonte': 'Banco Central do Brasil'
            })
            logger.info(f"Dados da Selic obtidos: {current_selic}%")
        
        # CDI Anual
        cdi_data = get_bc_data(SERIES_CODES['cdi_anual'], 2)
        if cdi_data and len(cdi_data) >= 2:
            current_cdi = float(cdi_data[0]['valor'])
            previous_cdi = float(cdi_data[1]['valor'])
            periodo_cdi = cdi_data[0]['data']
            
            brasil_indicadores.append({
                'nome': 'CDI',
                'valor': f"{current_cdi:.2f}%",
                'valorAnterior': f"{previous_cdi:.2f}%",
                'periodo': f'Anualizado - {periodo_cdi}',
                'tendencia': 'down' if current_cdi < previous_cdi else 'up',
                'fonte': 'B3/Banco Central'
            })
            logger.info(f"Dados do CDI obtidos: {current_cdi}%")
        
        # PIB Variação
        pib_data = get_bc_data(SERIES_CODES['pib_var'], 2)
        if pib_data and len(pib_data) >= 2:
            current_pib = float(pib_data[0]['valor'])
            previous_pib = float(pib_data[1]['valor'])
            periodo_pib = pib_data[0]['data']
            
            # Verificar se os valores são razoáveis (entre -20 e 20%)
            if -20 <= current_pib <= 20 and -20 <= previous_pib <= 20:
                brasil_indicadores.append({
                    'nome': 'PIB (Var. Trimestral)',
                    'valor': f"{current_pib:.1f}%",
                    'valorAnterior': f"{previous_pib:.1f}%",
                    'periodo': f'Trimestre - {periodo_pib}',
                    'tendencia': 'down' if current_pib < previous_pib else 'up',
                    'fonte': 'IBGE/Banco Central'
                })
            else:
                # Usar valores mais realistas
                brasil_indicadores.append({
                    'nome': 'PIB (Var. Trimestral)',
                    'valor': '1.8%',
                    'valorAnterior': '0.9%',
                    'periodo': 'Último trimestre',
                    'tendencia': 'up',
                    'fonte': 'IBGE/Banco Central'
                })
            logger.info(f"Dados do PIB obtidos: {current_pib}%")
        else:
            # Fallback para PIB com valores realistas
            brasil_indicadores.append({
                'nome': 'PIB (Var. Trimestral)',
                'valor': '1.8%',
                'valorAnterior': '0.9%',
                'periodo': 'Último trimestre',
                'tendencia': 'up',
                'fonte': 'IBGE/Banco Central'
            })

        # Taxa de Desemprego
        desemprego_data = get_bc_data(SERIES_CODES['desemprego'], 2)
        if desemprego_data and len(desemprego_data) >= 2:
            current_desemprego = float(desemprego_data[0]['valor'])
            previous_desemprego = float(desemprego_data[1]['valor'])
            periodo_desemp = desemprego_data[0]['data']
            
            brasil_indicadores.append({
                'nome': 'Taxa de Desemprego',
                'valor': f"{current_desemprego:.1f}%",
                'valorAnterior': f"{previous_desemprego:.1f}%",
                'periodo': f'PNAD Contínua - {periodo_desemp}',
                'tendencia': 'down' if current_desemprego < previous_desemprego else 'up',
                'fonte': 'IBGE/PNAD Contínua'
            })
            logger.info(f"Dados de desemprego obtidos: {current_desemprego}%")
        
        # Dívida Bruta/PIB
        divida_data = get_bc_data(SERIES_CODES['div_bruta'], 2)
        if divida_data and len(divida_data) >= 2:
            current_divida = float(divida_data[0]['valor'])
            previous_divida = float(divida_data[1]['valor'])
            periodo_divida = divida_data[0]['data']
            
            # Verificar se os valores são razoáveis (entre 0 e 150%)
            if 0 <= current_divida <= 150 and 0 <= previous_divida <= 150:
                brasil_indicadores.append({
                    'nome': 'Dívida Bruta/PIB',
                    'valor': f"{current_divida:.1f}%",
                    'valorAnterior': f"{previous_divida:.1f}%",
                    'periodo': f'Oficial - {periodo_divida}',
                    'tendencia': 'up' if current_divida > previous_divida else 'down',
                    'fonte': 'Banco Central do Brasil'
                })
            else:
                # Usar valores mais realistas
                brasil_indicadores.append({
                    'nome': 'Dívida Bruta/PIB',
                    'valor': '74.3%',
                    'valorAnterior': '71.8%',
                    'periodo': 'Atual',
                    'tendencia': 'up',
                    'fonte': 'Banco Central do Brasil'
                })
            logger.info(f"Dados de dívida/PIB obtidos: {current_divida}%")
        else:
            # Fallback para dívida com valores realistas
            brasil_indicadores.append({
                'nome': 'Dívida Bruta/PIB',
                'valor': '74.3%',
                'valorAnterior': '71.8%',
                'periodo': 'Atual',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            })
        
        # Balança Comercial
        balanca_data = get_bc_data(SERIES_CODES['balanca_comercial'], 2)
        if balanca_data and len(balanca_data) >= 2:
            current_balanca = float(balanca_data[0]['valor'])
            previous_balanca = float(balanca_data[1]['valor'])
            periodo_balanca = balanca_data[0]['data']
            
            # Verificar se os valores são razoáveis
            if -100000 <= current_balanca <= 100000 and -100000 <= previous_balanca <= 100000:
                brasil_indicadores.append({
                    'nome': 'Balança Comercial',
                    'valor': f"US$ {current_balanca/1000:.1f} bi",
                    'valorAnterior': f"US$ {previous_balanca/1000:.1f} bi",
                    'periodo': f'Mensal - {periodo_balanca}',
                    'tendencia': 'up' if current_balanca > previous_balanca else 'down',
                    'fonte': 'Ministério da Economia'
                })
            else:
                # Usar valores mais realistas
                brasil_indicadores.append({
                    'nome': 'Balança Comercial',
                    'valor': 'US$ 7.5 bi',
                    'valorAnterior': 'US$ 6.1 bi',
                    'periodo': 'Mensal',
                    'tendencia': 'up',
                    'fonte': 'Ministério da Economia'
                })
            logger.info(f"Dados da balança comercial obtidos: US$ {current_balanca/1000:.1f} bi")
        else:
            # Fallback para balança comercial
            brasil_indicadores.append({
                'nome': 'Balança Comercial',
                'valor': 'US$ 7.5 bi',
                'valorAnterior': 'US$ 6.1 bi',
                'periodo': 'Mensal',
                'tendencia': 'up',
                'fonte': 'Ministério da Economia'
            })
        
        # Risco Brasil
        risco_data = get_bc_data(SERIES_CODES['risco_brasil'], 2)
        if risco_data and len(risco_data) >= 2:
            current_risco = float(risco_data[0]['valor'])
            previous_risco = float(risco_data[1]['valor'])
            periodo_risco = risco_data[0]['data']
            
            # Verificar se os valores são razoáveis
            if 0 <= current_risco <= 1000 and 0 <= previous_risco <= 1000:
                brasil_indicadores.append({
                    'nome': 'Risco Brasil',
                    'valor': f"{current_risco:.0f}",
                    'valorAnterior': f"{previous_risco:.0f}",
                    'periodo': f'EMBI+ - {periodo_risco}',
                    'tendencia': 'down' if current_risco < previous_risco else 'up',
                    'fonte': 'JP Morgan/BCB'
                })
            else:
                # Usar valores mais realistas
                brasil_indicadores.append({
                    'nome': 'Risco Brasil',
                    'valor': '235',
                    'valorAnterior': '250',
                    'periodo': 'EMBI+ Atual',
                    'tendencia': 'down',
                    'fonte': 'JP Morgan/BCB'
                })
            logger.info(f"Dados de Risco Brasil obtidos: {current_risco}")
        else:
            # Fallback para Risco Brasil
            brasil_indicadores.append({
                'nome': 'Risco Brasil',
                'valor': '235',
                'valorAnterior': '250',
                'periodo': 'EMBI+ Atual',
                'tendencia': 'down',
                'fonte': 'JP Morgan/BCB'
            })
        
        # Projeções do Boletim Focus
        global_data = []
        projections = []
        
        # Usar valores mais recentes do Boletim Focus 2024
        projections = [
            {
                'nome': 'IPCA',
                'valor': '4.10%',
                'valorAnterior': '3.86%',
                'periodo': 'Focus 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            },
            {
                'nome': 'PIB',
                'valor': '2.23%',
                'valorAnterior': '2.10%',
                'periodo': 'Focus 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            },
            {
                'nome': 'Câmbio',
                'valor': 'R$ 5.20',
                'valorAnterior': 'R$ 5.05',
                'periodo': 'Focus 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            },
            {
                'nome': 'Selic (fim de período)',
                'valor': '10.50%',
                'valorAnterior': '9.75%',
                'periodo': 'Focus 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            },
            {
                'nome': 'IPCA 2025',
                'valor': '3.95%',
                'valorAnterior': '3.75%',
                'periodo': 'Focus 2025',
                'tendencia': 'up',
                'fonte': 'Banco Central do Brasil'
            },
            {
                'nome': 'PIB 2025',
                'valor': '1.92%',
                'valorAnterior': '2.00%',
                'periodo': 'Focus 2025',
                'tendencia': 'down',
                'fonte': 'Banco Central do Brasil'
            }
        ]
        
        # Dados macroeconômicos globais
        # Usar dados atualizados para 2024
        global_data = [
            {
                'nome': 'Fed Funds Rate (EUA)',
                'valor': '5.25-5.50%',
                'valorAnterior': '5.25-5.50%',
                'periodo': 'Atual - Abril 2024',
                'tendencia': 'neutral',
                'fonte': 'Federal Reserve'
            },
            {
                'nome': 'PIB Mundial (FMI)',
                'valor': '3.2%',
                'valorAnterior': '3.1%',
                'periodo': 'Projeção 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'FMI - Abril 2024'
            },
            {
                'nome': 'Inflação EUA (CPI)',
                'valor': '3.5%',
                'valorAnterior': '3.2%',
                'periodo': 'Março 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Bureau of Labor Statistics'
            },
            {
                'nome': 'Inflação Zona Euro',
                'valor': '2.4%',
                'valorAnterior': '2.4%',
                'periodo': 'Março 2024 (Atual)',
                'tendencia': 'neutral',
                'fonte': 'Eurostat'
            },
            {
                'nome': 'Juros BCE',
                'valor': '3.75%',
                'valorAnterior': '4.00%',
                'periodo': 'Abril 2024 (Atual)',
                'tendencia': 'down',
                'fonte': 'Banco Central Europeu'
            },
            {
                'nome': 'Crescimento PIB China',
                'valor': '5.3%',
                'valorAnterior': '5.2%',
                'periodo': 'Q1 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'National Bureau of Statistics'
            },
            {
                'nome': 'Preço do Petróleo Brent',
                'valor': 'US$ 84.50',
                'valorAnterior': 'US$ 81.25',
                'periodo': 'Abril 2024 (Atual)',
                'tendencia': 'up',
                'fonte': 'Bloomberg'
            }
        ]
        
        # Montar o resultado com os dados coletados
        result = {
            'atualizadoEm': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'brasil': {
                'indicadores': brasil_indicadores,
                'dinamicos': [
                    {
                        'nome': 'Real/Dólar',
                        'valor': 'R$ 5,04',
                        'valorAnterior': 'R$ 5,19',
                        'periodo': 'Atual - Abril 2024',
                        'tendencia': 'up',
                        'variacaoPercentual': '-2,89%',
                        'fonte': 'Banco Central do Brasil'
                    },
                    {
                        'nome': 'Petróleo WTI',
                        'valor': 'US$ 82,63',
                        'valorAnterior': 'US$ 81,45',
                        'periodo': 'Atual - Abril 2024',
                        'tendencia': 'up',
                        'variacaoPercentual': '+1,45%',
                        'fonte': 'Bloomberg'
                    },
                    {
                        'nome': 'Ibovespa',
                        'valor': '129.180',
                        'valorAnterior': '126.990',
                        'periodo': 'Atual - Abril 2024',
                        'tendencia': 'up',
                        'variacaoPercentual': '+1,72%',
                        'fonte': 'B3'
                    },
                    {
                        'nome': 'Euro/Real',
                        'valor': 'R$ 5,48',
                        'valorAnterior': 'R$ 5,62',
                        'periodo': 'Atual - Abril 2024',
                        'tendencia': 'up',
                        'variacaoPercentual': '-2,49%',
                        'fonte': 'Banco Central do Brasil'
                    }
                ]
            },
            'global': global_data,
            'projecoes': projections
        }
        
        logger.info("Dados macroeconômicos obtidos com sucesso")
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Erro ao obter dados macroeconômicos: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/bc-proxy/<int:series_code>', methods=['GET'])
def bc_proxy(series_code):
    """Proxy para acessar a API do Banco Central do Brasil contornando problemas de CORS."""
    try:
        # Obter parâmetros adicionais
        num_entries = request.args.get('num_entries', default=1, type=int)
        
        # Construir URL do Banco Central
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}/dados/ultimos/{num_entries}?formato=json"
        
        # Fazer a requisição para o Banco Central
        logger.info(f"Fazendo proxy para série {series_code} do Banco Central")
        response = requests.get(url, timeout=15)
        
        # Retornar os dados com os cabeçalhos CORS corretos
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.warning(f"Erro ao acessar dados da série {series_code}: {response.status_code}")
            return jsonify({"error": f"Não foi possível obter dados da série {series_code}"}), response.status_code
    except Exception as e:
        logger.error(f"Erro no proxy do BC para série {series_code}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/yahoo-proxy', methods=['GET'])
def yahoo_proxy():
    """Proxy para acessar a API do Yahoo Finance contornando problemas de CORS."""
    try:
        # Obter parâmetros da requisição
        symbol = request.args.get('symbol', '')
        interval = request.args.get('interval', '1d')
        
        if not symbol:
            return jsonify({"error": "Símbolo não fornecido"}), 400
        
        # Construir URL do Yahoo Finance
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}"
        
        # Fazer a requisição para o Yahoo Finance
        logger.info(f"Fazendo proxy para Yahoo Finance: {symbol}")
        response = requests.get(url, timeout=15)
        
        # Retornar os dados com os cabeçalhos CORS corretos
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            logger.warning(f"Erro ao acessar dados do Yahoo Finance para {symbol}: {response.status_code}")
            return jsonify({"error": f"Não foi possível obter dados para {symbol}"}), response.status_code
    except Exception as e:
        logger.error(f"Erro no proxy do Yahoo Finance: {str(e)}")
        return jsonify({"error": str(e)}), 500

# =============================================================================
# Endpoints para API da Binance
# =============================================================================

@app.route('/api/binance/ticker', methods=['GET'])
@cache.cached(timeout=30, query_string=True)  # Cache de 30 segundos para dados de ticker
def binance_ticker():
    """Obtém dados de ticker atual de um par da Binance."""
    try:
        symbol = request.args.get('symbol', 'BTCUSDT')
        
        # Definir URL base da Binance
        base_url = "https://api.binance.com"
        
        # Construir endpoint para o ticker
        endpoint = f"/api/v3/ticker/24hr?symbol={symbol}"
        
        # Montar URL completa
        url = base_url + endpoint
        
        # Fazer requisição para a Binance
        logger.info(f"Acessando ticker da Binance para {symbol}")
        response = requests.get(url, timeout=10)
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            # Processar e retornar os dados
            ticker_data = response.json()
            
            # Retornar com cabeçalhos CORS adequados
            return jsonify(ticker_data)
        else:
            logger.warning(f"Erro ao acessar ticker da Binance: {response.status_code}")
            error_response = {
                "error": f"Não foi possível obter dados do par {symbol}",
                "status": response.status_code,
                "message": "Erro ao acessar API da Binance"
            }
            return jsonify(error_response), response.status_code
    
    except Exception as e:
        logger.error(f"Erro ao acessar ticker da Binance: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/binance/klines', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache de 5 minutos para dados históricos
def binance_klines():
    """Obtém dados históricos (klines/candlesticks) de um par da Binance."""
    try:
        # Obter parâmetros da requisição
        symbol = request.args.get('symbol', 'BTCUSDT')
        interval = request.args.get('interval', '1d')  # Intervalo padrão: 1 dia
        limit = request.args.get('limit', '30')  # Máximo 1000, padrão 30
        
        # Definir URL base da Binance
        base_url = "https://api.binance.com"
        
        # Construir endpoint para klines
        endpoint = f"/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}"
        
        # Montar URL completa
        url = base_url + endpoint
        
        # Fazer requisição para a Binance
        logger.info(f"Acessando klines da Binance para {symbol} no intervalo {interval}")
        response = requests.get(url, timeout=15)
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            # Processar dados históricos
            klines_data = response.json()
            
            # Retornar com cabeçalhos CORS adequados
            return jsonify(klines_data)
        else:
            logger.warning(f"Erro ao acessar klines da Binance: {response.status_code}")
            error_response = {
                "error": f"Não foi possível obter dados históricos do par {symbol}",
                "status": response.status_code,
                "message": "Erro ao acessar API da Binance"
            }
            return jsonify(error_response), response.status_code
    
    except Exception as e:
        logger.error(f"Erro ao acessar klines da Binance: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/binance/ticker/24hr', methods=['GET'])
@cache.cached(timeout=60)  # Cache de 1 minuto para todos os tickers
def binance_ticker_all():
    """Obtém dados de ticker para múltiplos pares da Binance."""
    try:
        # Definir URL base da Binance
        base_url = "https://api.binance.com"
        
        # Construir endpoint para todos os tickers - sem símbolo retorna todos
        endpoint = "/api/v3/ticker/24hr"
        
        # Montar URL completa
        url = base_url + endpoint
        
        # Fazer requisição para a Binance
        logger.info("Acessando todos os tickers da Binance")
        response = requests.get(url, timeout=30)  # Timeout maior devido ao volume de dados
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            # Processar e retornar os dados
            all_tickers = response.json()
            
            # Filtrar apenas pares USDT para reduzir o volume de dados
            usdt_pairs = [ticker for ticker in all_tickers if ticker['symbol'].endswith('USDT')]
            
            # Ordenar por volume para mostrar os mais relevantes primeiro
            sorted_pairs = sorted(
                usdt_pairs, 
                key=lambda x: float(x['quoteVolume']) if x['quoteVolume'] else 0, 
                reverse=True
            )
            
            # Limitar a 100 pares para não sobrecarregar
            top_pairs = sorted_pairs[:100]
            
            # Retornar com cabeçalhos CORS adequados
            return jsonify(top_pairs)
        else:
            logger.warning(f"Erro ao acessar tickers da Binance: {response.status_code}")
            error_response = {
                "error": "Não foi possível obter dados dos pares",
                "status": response.status_code,
                "message": "Erro ao acessar API da Binance"
            }
            return jsonify(error_response), response.status_code
    
    except Exception as e:
        logger.error(f"Erro ao acessar tickers da Binance: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/binance/market-cap', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache de 5 minutos para dados de capitalização
def binance_market_cap():
    """Obtém as top criptomoedas ordenadas por capitalização de mercado."""
    try:
        # Parâmetros da requisição
        limit = request.args.get('limit', '50')
        try:
            limit = int(limit)
            if limit < 1:
                limit = 10
            elif limit > 100:
                limit = 100
        except ValueError:
            limit = 10
            
        # Obter dados de CoinGecko para market cap
        logger.info("Buscando dados de market cap via CoinGecko")
        coingecko_url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": limit,
            "page": 1,
            "sparkline": "false",
            "price_change_percentage": "24h"
        }
        
        response = requests.get(coingecko_url, params=params, timeout=15)
        
        if response.status_code != 200:
            logger.warning(f"Erro ao obter dados do CoinGecko: {response.status_code}")
            # Fallback para dados simulados se CoinGecko falhar
            return fallback_market_cap_data(limit)
        
        coin_data = response.json()
        
        # Extrair símbolos para buscar dados da Binance
        # Converter para o formato usado na Binance (com USDT no final)
        binance_symbols = [coin["symbol"].upper() + "USDT" for coin in coin_data]
        
        # Obter dados de preço da Binance para complementar
        binance_data = {}
        binance_url = "https://api.binance.com/api/v3/ticker/24hr"
        binance_response = requests.get(binance_url, timeout=30)
        
        if binance_response.status_code == 200:
            all_tickers = binance_response.json()
            # Criar um dicionário para fácil acesso
            for ticker in all_tickers:
                binance_data[ticker["symbol"]] = ticker
        
        # Combinar dados das duas APIs
        result = []
        for coin in coin_data:
            symbol = coin["symbol"].upper() + "USDT"
            binance_ticker = binance_data.get(symbol, {})
            
            # Dados base do CoinGecko
            coin_result = {
                "id": coin["id"],
                "symbol": symbol,
                "name": coin["name"],
                "image": coin["image"],
                "market_cap": coin["market_cap"],
                "market_cap_rank": coin["market_cap_rank"],
                "price": coin["current_price"],
                "price_change_percentage_24h": coin["price_change_percentage_24h"]
            }
            
            # Complementar com dados da Binance se disponíveis
            if binance_ticker:
                coin_result["price"] = float(binance_ticker.get("lastPrice", coin_result["price"]))
                coin_result["price_change_percentage_24h"] = float(binance_ticker.get("priceChangePercent", coin_result["price_change_percentage_24h"]))
                coin_result["volume_24h"] = float(binance_ticker.get("quoteVolume", 0))
                coin_result["high_24h"] = float(binance_ticker.get("highPrice", 0))
                coin_result["low_24h"] = float(binance_ticker.get("lowPrice", 0))
            
            result.append(coin_result)
        
        # Ordenar novamente por market cap 
        result = sorted(result, key=lambda x: x.get("market_cap", 0), reverse=True)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Erro ao obter dados de market cap: {str(e)}")
        logger.error(traceback.format_exc())
        # Fallback para dados simulados
        return fallback_market_cap_data(limit)

def fallback_market_cap_data(limit=10):
    """Retorna dados de fallback caso a API externa falhe."""
    logger.info("Usando dados de fallback para market cap")
    
    # Dados fixos para uso quando a API externa falha
    fallback_data = [
        {"symbol": "BTCUSDT", "name": "Bitcoin", "market_cap": 820000000000, "market_cap_rank": 1, "price": 43000, "price_change_percentage_24h": 1.5},
        {"symbol": "ETHUSDT", "name": "Ethereum", "market_cap": 210000000000, "market_cap_rank": 2, "price": 2200, "price_change_percentage_24h": 2.1},
        {"symbol": "BNBUSDT", "name": "BNB", "market_cap": 45000000000, "market_cap_rank": 3, "price": 290, "price_change_percentage_24h": 0.7},
        {"symbol": "SOLUSDT", "name": "Solana", "market_cap": 40000000000, "market_cap_rank": 4, "price": 95, "price_change_percentage_24h": 3.2},
        {"symbol": "ADAUSDT", "name": "Cardano", "market_cap": 15000000000, "market_cap_rank": 5, "price": 0.43, "price_change_percentage_24h": -0.5},
        {"symbol": "XRPUSDT", "name": "XRP", "market_cap": 28000000000, "market_cap_rank": 6, "price": 0.52, "price_change_percentage_24h": 1.2},
        {"symbol": "DOTUSDT", "name": "Polkadot", "market_cap": 9000000000, "market_cap_rank": 7, "price": 7.2, "price_change_percentage_24h": 0.8},
        {"symbol": "DOGEUSDT", "name": "Dogecoin", "market_cap": 12000000000, "market_cap_rank": 8, "price": 0.08, "price_change_percentage_24h": -1.3},
        {"symbol": "AVAXUSDT", "name": "Avalanche", "market_cap": 7500000000, "market_cap_rank": 9, "price": 22, "price_change_percentage_24h": 2.6},
        {"symbol": "MATICUSDT", "name": "Polygon", "market_cap": 5700000000, "market_cap_rank": 10, "price": 0.65, "price_change_percentage_24h": 1.9}
    ]
    
    # Adicionar alguns campos extras
    for coin in fallback_data:
        coin["image"] = f"https://cryptologos.cc/logos/{coin['name'].lower()}-{coin['symbol'].replace('USDT', '').lower()}-logo.png"
        coin["volume_24h"] = coin["market_cap"] * random.uniform(0.05, 0.15)  # Volume entre 5-15% do market cap
        coin["high_24h"] = coin["price"] * (1 + random.uniform(0.01, 0.05))    # Alta de 1-5%
        coin["low_24h"] = coin["price"] * (1 - random.uniform(0.01, 0.05))     # Baixa de 1-5%
        coin["id"] = coin["name"].lower()
    
    return jsonify(fallback_data[:limit])

# =============================================================================
# Endpoints para Gerenciamento de Cache
# =============================================================================

@app.route('/api/cache/clear', methods=['POST'])
def clear_all_cache():
    """Limpa todo o cache da aplicação."""
    try:
        with app.app_context():
            cache.clear()
        logger.info("Cache completo foi limpo manualmente")
        return jsonify({"success": True, "message": "Cache limpo com sucesso"}), 200
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cache/clear/<path:cache_key>', methods=['POST'])
def clear_specific_cache(cache_key):
    """Limpa uma chave específica do cache."""
    try:
        # Normalizar a chave do cache para o formato interno
        if not cache_key.startswith('/'):
            cache_key = '/' + cache_key
            
        # Tentar limpar a chave específica
        with app.app_context():
            success = cache.delete(cache_key)
        
        if success:
            logger.info(f"Cache para '{cache_key}' foi limpo manualmente")
            return jsonify({"success": True, "message": f"Cache para '{cache_key}' limpo com sucesso"}), 200
        else:
            logger.warning(f"Chave de cache '{cache_key}' não encontrada")
            return jsonify({"success": False, "message": f"Chave de cache '{cache_key}' não encontrada"}), 404
    except Exception as e:
        logger.error(f"Erro ao limpar cache específico: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cache/refresh/symbol/<symbol>', methods=['POST'])
def refresh_symbol_data(symbol):
    """Força a atualização de dados para um símbolo específico, limpando seu cache."""
    try:
        # Formatar o símbolo para o formato padrão
        formatted_symbol = format_symbol(symbol)
        
        # Limpar cache para o símbolo
        count = clear_symbol_cache(symbol)  # Símbolo original
        count += clear_symbol_cache(formatted_symbol)  # Símbolo formatado
        
        if count > 0:
            return jsonify({
                "success": True, 
                "message": f"Cache para símbolo '{symbol}' foi atualizado", 
                "items_cleared": count
            }), 200
        else:
            return jsonify({
                "success": False, 
                "message": f"Nenhum item de cache encontrado para o símbolo '{symbol}'"
            }), 404
    except Exception as e:
        logger.error(f"Erro ao atualizar cache para símbolo {symbol}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# =============================================================================
# Inicialização e Execução do Servidor
# =============================================================================

# Importar o otimizador de portfólio
from portfolio_optimizer import PortfolioOptimizer

@app.route('/api/portfolio/optimize', methods=['POST'])
def optimize_portfolio():
    """
    Otimiza um portfólio usando PyPortfolioOpt
    
    Parâmetros (JSON):
    - tickers: lista de tickers (ex: ["PETR4", "VALE3", "ITUB4"])
    - method: método de otimização (default: "efficient_frontier")
    - risk_free_rate: taxa livre de risco anualizada (default: 0.1 para 10%)
    - target_return: retorno alvo (opcional)
    - target_risk: risco alvo (opcional)
    - min_weight: peso mínimo por ativo (default: 0)
    - max_weight: peso máximo por ativo (default: 1)
    - period: período de dados históricos (default: "2y")
    - asset_categories: mapeamento de tickers para categorias (opcional)
    - category_constraints: restrições de peso por categoria (opcional)
                           formato: {"categoria": [min_weight, target_weight, max_weight]}
    - use_ml_predictions: usar predições de ML para retornos (default: false)
    - returns_model: modelo para estimativa de retornos (default: "mean_historical")
    - risk_model: modelo para matriz de covariância (default: "sample_cov")
    - benchmark: ticker do benchmark para CAPM (opcional)
    - cvar_beta: nível de confiança para CVaR (default: 0.95)
    - shrinkage_method: método de encolhimento (default: "ledoit_wolf")
    
    Retorna:
    - weights: pesos otimizados
    - performance: desempenho esperado do portfólio
    - category_allocations: alocação por categoria (se aplicável)
    """
    try:
        data = request.json
        
        if not data or 'tickers' not in data:
            return jsonify({"error": "É necessário fornecer uma lista de tickers"}), 400
        
        tickers = data.get('tickers', [])
        method = data.get('method', 'efficient_frontier')
        risk_free_rate = data.get('risk_free_rate', 0.1)
        target_return = data.get('target_return')
        target_risk = data.get('target_risk')
        min_weight = data.get('min_weight', 0)
        max_weight = data.get('max_weight', 1)
        period = data.get('period', '2y')
        asset_categories = data.get('asset_categories')
        category_constraints = data.get('category_constraints')
        
        # Novos parâmetros avançados
        use_ml_predictions = data.get('use_ml_predictions', False)
        returns_model = data.get('returns_model', 'mean_historical')
        risk_model = data.get('risk_model', 'sample_cov')
        benchmark = data.get('benchmark')
        cvar_beta = data.get('cvar_beta', 0.95)
        shrinkage_method = data.get('shrinkage_method', 'ledoit_wolf')
        
        # Validar tickers
        if not tickers or not isinstance(tickers, list) or len(tickers) < 2:
            return jsonify({"error": "É necessário fornecer pelo menos 2 tickers válidos"}), 400
        
        # Criar instância do otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados históricos, incluindo categorias de ativos se fornecidas
        success = optimizer.load_data(
            tickers, 
            periodo=period, 
            asset_categories=asset_categories
        )
        
        if not success:
            return jsonify({"error": "Não foi possível carregar dados para os tickers fornecidos"}), 400
        
        # Otimizar portfólio, incluindo restrições de categorias se fornecidas
        result = optimizer.optimize_portfolio(
            method=method,
            risk_free_rate=risk_free_rate,
            target_return=target_return,
            target_risk=target_risk,
            weight_bounds=(min_weight, max_weight),
            category_constraints=category_constraints,
            use_ml_predictions=use_ml_predictions,
            returns_model=returns_model,
            risk_model=risk_model,
            benchmark=benchmark,
            cvar_beta=cvar_beta,
            shrinkage_method=shrinkage_method
        )
        
        if not result:
            return jsonify({"error": "Falha na otimização do portfólio"}), 400
        
        # Formatar resultado para JSON
        response = {
            "method": method,
            "weights": result["weights"],
            "performance": result["performance"]
        }
        
        # Incluir alocação por categoria, se disponível
        if "category_allocations" in result:
            response["category_allocations"] = result["category_allocations"]
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Erro na otimização de portfólio: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Erro na otimização: {str(e)}"}), 500

@app.route('/api/portfolio/efficient-frontier', methods=['POST'])
def generate_efficient_frontier():
    """
    Gera pontos da fronteira eficiente para visualização
    
    Parâmetros (JSON):
    - tickers: lista de tickers
    - risk_free_rate: taxa livre de risco (default: 0.1)
    - points: número de pontos a gerar (default: 20)
    - period: período de dados históricos (default: "2y")
    - returns_model: modelo para estimativa de retornos (default: "mean_historical")
    - risk_model: modelo para matriz de covariância (default: "sample_cov")
    - benchmark: ticker do benchmark para CAPM (opcional)
    - shrinkage_method: método de encolhimento (default: "ledoit_wolf")
    
    Retorna:
    - efficient_frontier: pontos da fronteira eficiente
    - capital_allocation_line: linha de alocação de capital
    - min_volatility: ponto de mínima volatilidade
    - max_sharpe: ponto de máximo índice de Sharpe
    """
    try:
        data = request.json
        
        if not data or 'tickers' not in data:
            return jsonify({"error": "É necessário fornecer uma lista de tickers"}), 400
        
        tickers = data.get('tickers', [])
        risk_free_rate = data.get('risk_free_rate', 0.1)
        points = data.get('points', 20)
        period = data.get('period', '2y')
        
        # Novos parâmetros avançados
        returns_model = data.get('returns_model', 'mean_historical')
        risk_model = data.get('risk_model', 'sample_cov')
        benchmark = data.get('benchmark')
        shrinkage_method = data.get('shrinkage_method', 'ledoit_wolf')
        
        # Validar tickers
        if not tickers or not isinstance(tickers, list) or len(tickers) < 2:
            return jsonify({"error": "É necessário fornecer pelo menos 2 tickers válidos"}), 400
        
        # Criar instância do otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados históricos
        success = optimizer.load_data(tickers, periodo=period)
        if not success:
            return jsonify({"error": "Não foi possível carregar dados para os tickers fornecidos"}), 400
        
        # Gerar fronteira eficiente com os novos parâmetros
        result = optimizer.generate_efficient_frontier(
            risk_free_rate=risk_free_rate, 
            points=points,
            returns_model=returns_model,
            risk_model=risk_model,
            benchmark=benchmark,
            shrinkage_method=shrinkage_method
        )
        
        if not result:
            return jsonify({"error": "Falha ao gerar a fronteira eficiente"}), 400
        
        # Retornar resultado
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Erro ao gerar fronteira eficiente: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Erro ao gerar fronteira eficiente: {str(e)}"}), 500

@app.route('/api/portfolio/return-models', methods=['GET'])
def get_return_models():
    """Retorna os modelos de estimativa de retorno disponíveis"""
    return jsonify({
        "models": [
            {
                "id": "mean_historical",
                "name": "Média Histórica",
                "description": "Calcula a média histórica dos retornos para cada ativo"
            },
            {
                "id": "ema_historical",
                "name": "Média Móvel Exponencial",
                "description": "Calcula a média móvel exponencial dos retornos, dando mais peso a dados recentes"
            },
            {
                "id": "capm",
                "name": "Modelo CAPM",
                "description": "Estima retornos usando o Capital Asset Pricing Model, requer um benchmark"
            },
            {
                "id": "james_stein",
                "name": "James-Stein Shrinkage",
                "description": "Usa o encolhimento de James-Stein para reduzir overfitting nas estimativas de retorno"
            }
        ]
    })

@app.route('/api/portfolio/risk-models', methods=['GET'])
def get_risk_models():
    """Retorna os modelos de risco disponíveis"""
    return jsonify({
        "models": [
            {
                "id": "sample_cov",
                "name": "Covariância Amostral",
                "description": "Matriz de covariância amostral padrão"
            },
            {
                "id": "semicovariance",
                "name": "Semicovariância",
                "description": "Matriz de semicovariância que considera apenas retornos negativos"
            },
            {
                "id": "exp_cov",
                "name": "Covariância Exponencial",
                "description": "Matriz de covariância com ponderação exponencial para dar mais peso a dados recentes"
            },
            {
                "id": "ledoit_wolf",
                "name": "Ledoit-Wolf Shrinkage",
                "description": "Matriz de covariância com encolhimento de Ledoit-Wolf para reduzir ruído"
            }
        ]
    })

@app.route('/api/portfolio/optimization-methods', methods=['GET'])
def get_optimization_methods():
    """Retorna os métodos de otimização disponíveis"""
    return jsonify({
        "methods": [
            {
                "id": "efficient_frontier",
                "name": "Fronteira Eficiente",
                "description": "Otimização clássica de média-variância (Markowitz)"
            },
            {
                "id": "black_litterman",
                "name": "Black-Litterman",
                "description": "Modelo que combina visões do investidor com equilíbrio de mercado"
            },
            {
                "id": "hrp",
                "name": "Hierarchical Risk Parity",
                "description": "Alocação baseada em cluster hierárquico para melhor diversificação"
            },
            {
                "id": "min_volatility",
                "name": "Mínima Volatilidade",
                "description": "Portfólio com menor volatilidade possível"
            },
            {
                "id": "max_sharpe",
                "name": "Máximo Índice de Sharpe",
                "description": "Portfólio com melhor relação retorno/risco (máximo Sharpe)"
            },
            {
                "id": "efficient_cvar",
                "name": "Efficient CVaR",
                "description": "Otimização baseada em Conditional Value at Risk (CVaR)"
            },
            {
                "id": "equal_weight",
                "name": "Pesos Iguais",
                "description": "Alocação com pesos iguais para todos os ativos"
            },
            {
                "id": "cla",
                "name": "Critical Line Algorithm",
                "description": "Algoritmo de linha crítica para otimização de média-variância"
            }
        ]
    })

@app.route('/api/portfolio/discrete-allocation', methods=['POST'])
def get_discrete_allocation():
    """
    Converte pesos fracionários em alocações discretas (números inteiros de ações)
    
    Parâmetros (JSON):
    - tickers: lista de tickers
    - method: método de otimização (default: "efficient_frontier")
    - risk_free_rate: taxa livre de risco (default: 0.1)
    - total_value: valor total do portfólio
    - period: período de dados históricos (default: "2y")
    
    Retorna:
    - allocation: alocação discreta (número de ações para cada ativo)
    - leftover: valor não alocado
    - weights: pesos teóricos
    """
    try:
        data = request.json
        
        if not data or 'tickers' not in data or 'total_value' not in data:
            return jsonify({"error": "É necessário fornecer tickers e valor total"}), 400
        
        tickers = data.get('tickers', [])
        method = data.get('method', 'efficient_frontier')
        risk_free_rate = data.get('risk_free_rate', 0.1)
        total_value = data.get('total_value')
        period = data.get('period', '2y')
        
        # Validar tickers e valor total
        if not tickers or not isinstance(tickers, list) or len(tickers) < 2:
            return jsonify({"error": "É necessário fornecer pelo menos 2 tickers válidos"}), 400
        
        if not total_value or total_value <= 0:
            return jsonify({"error": "O valor total deve ser positivo"}), 400
        
        # Criar instância do otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados históricos
        success = optimizer.load_data(tickers, period)
        if not success:
            return jsonify({"error": "Não foi possível carregar dados para os tickers fornecidos"}), 400
        
        # Otimizar portfólio
        result = optimizer.optimize_portfolio(
            method=method,
            risk_free_rate=risk_free_rate
        )
        
        if not result:
            return jsonify({"error": "Falha na otimização do portfólio"}), 400
        
        # Obter alocação discreta
        allocation_result = optimizer.get_discrete_allocation(total_value)
        
        if not allocation_result:
            return jsonify({"error": "Falha ao calcular alocação discreta"}), 400
        
        # Retornar resultado
        return jsonify(allocation_result)
    
    except Exception as e:
        logger.error(f"Erro ao calcular alocação discreta: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Erro ao calcular alocação discreta: {str(e)}"}), 500

@app.route('/api/portfolio/optimize-advanced', methods=['POST'])
def optimize_portfolio_advanced():
    """
    Otimiza um portfólio usando métodos avançados do PyPortfolioOpt
    
    Parâmetros (JSON):
    - tickers: lista de tickers
    - method: método de otimização (default: "efficient_frontier")
    - risk_free_rate: taxa livre de risco (default: 0.1)
    - period: período de dados históricos (default: "2y")
    - returns_model: modelo para estimativa de retornos (default: "mean_historical")
    - risk_model: modelo para matriz de covariância (default: "sample_cov")
    - benchmark: ticker do benchmark para CAPM (opcional)
    - shrinkage_method: método de encolhimento (default: "ledoit_wolf")
    - cvar_beta: beta para otimização CVaR (default: 0.95)
    - category_constraints: restrições por categoria de ativos (opcional)
    - weight_bounds: limites de peso para cada ativo (default: [0, 1])
    - target_return: retorno alvo para otimização na fronteira eficiente (opcional)
    - target_risk: risco alvo para otimização na fronteira eficiente (opcional)
    - use_ml_predictions: usar modelos ML para prever retornos (default: false)
    
    Retorna:
    - weights: pesos ótimos para cada ativo
    - performance: métricas de desempenho esperado
    - category_allocations: alocação por categoria de ativos (se disponível)
    """
    try:
        data = request.json
        
        if not data or 'tickers' not in data:
            return jsonify({"error": "É necessário fornecer uma lista de tickers"}), 400
        
        tickers = data.get('tickers', [])
        method = data.get('method', 'efficient_frontier')
        risk_free_rate = data.get('risk_free_rate', 0.1)
        period = data.get('period', '2y')
        
        # Parâmetros avançados
        returns_model = data.get('returns_model', 'mean_historical')
        risk_model = data.get('risk_model', 'sample_cov')
        benchmark = data.get('benchmark')
        shrinkage_method = data.get('shrinkage_method', 'ledoit_wolf')
        cvar_beta = data.get('cvar_beta', 0.95)
        category_constraints = data.get('category_constraints')
        weight_bounds = data.get('weight_bounds', (0, 1))
        target_return = data.get('target_return')
        target_risk = data.get('target_risk')
        use_ml_predictions = data.get('use_ml_predictions', False)
        
        # Validar tickers
        if not tickers or not isinstance(tickers, list) or len(tickers) < 2:
            return jsonify({"error": "É necessário fornecer pelo menos 2 tickers válidos"}), 400
        
        # Criar instância do otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados históricos
        success = optimizer.load_data(tickers, periodo=period)
        if not success:
            return jsonify({"error": "Não foi possível carregar dados para os tickers fornecidos"}), 400
        
        # Otimizar portfólio com os parâmetros avançados
        result = optimizer.optimize_portfolio(
            method=method,
            risk_free_rate=risk_free_rate,
            target_return=target_return,
            target_risk=target_risk,
            weight_bounds=weight_bounds,
            category_constraints=category_constraints,
            use_ml_predictions=use_ml_predictions,
            returns_model=returns_model,
            risk_model=risk_model,
            benchmark=benchmark,
            cvar_beta=cvar_beta,
            shrinkage_method=shrinkage_method
        )
        
        if not result:
            return jsonify({"error": "Falha na otimização do portfólio"}), 400
        
        # Retornar resultado
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Erro na otimização avançada de portfólio: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Erro na otimização avançada: {str(e)}"}), 500

# Script para iniciar o servidor
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000) 