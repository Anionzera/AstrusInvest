"""
Rotas para Análise de Performance usando pyfolio-reloaded e empyrical-reloaded
Endpoints especializados para análises avançadas de performance e risco
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import Dict, Any, List
import matplotlib
matplotlib.use('Agg')  # Para ambiente sem GUI
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
import yfinance as yf
import pyfolio as pf

from services.performance_analyzer import PerformanceAnalyzer
from portfolio_optimizer import PortfolioOptimizer

# Criar blueprint
performance_bp = Blueprint('performance', __name__, url_prefix='/api/performance')

logger = logging.getLogger(__name__)

# Configurar estilo matplotlib para gráficos modernos
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

def create_plot_base64(fig):
    """Converte uma figura matplotlib para base64"""
    buffer = BytesIO()
    fig.savefig(buffer, format='png', dpi=300, bbox_inches='tight', 
                facecolor='white', edgecolor='none')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close(fig)
    buffer.close()
    return f"data:image/png;base64,{image_base64}"

@performance_bp.route('/analyze', methods=['POST'])
def analyze_portfolio_performance():
    """
    Endpoint para análise completa de performance de portfólio
    
    Body JSON:
    {
        "tickers": ["PETR4.SA", "VALE3.SA", "ITUB4.SA"],
        "weights": [0.4, 0.3, 0.3],
        "period_months": 12,
        "benchmark": "^BVSP",
        "risk_free_rate": 0.0525,
        "include_tearsheet": true
    }
    """
    try:
        data = request.get_json()
        
        # Validar parâmetros
        required_params = ['tickers', 'weights']
        for param in required_params:
            if param not in data:
                return jsonify({"error": f"Parâmetro obrigatório ausente: {param}"}), 400
        
        tickers = data['tickers']
        weights = data['weights']
        period_months = data.get('period_months', 12)
        benchmark_ticker = data.get('benchmark', '^BVSP')
        risk_free_rate = data.get('risk_free_rate', 0.0525)
        include_tearsheet = data.get('include_tearsheet', True)
        
        # Validar consistência
        if len(tickers) != len(weights):
            return jsonify({"error": "Número de tickers deve ser igual ao número de pesos"}), 400
        
        if not np.isclose(sum(weights), 1.0, atol=0.01):
            return jsonify({"error": "Soma dos pesos deve ser aproximadamente 1.0"}), 400
        
        # Converter para dicionário de pesos
        weights_dict = dict(zip(tickers, weights))
        
        # Criar otimizador para obter dados históricos
        optimizer = PortfolioOptimizer()
        
        # Converter período para formato aceito pelo load_data
        # period_months para string de período do yfinance
        if period_months <= 1:
            period_str = "1mo"
        elif period_months <= 3:
            period_str = "3mo"
        elif period_months <= 6:
            period_str = "6mo"
        elif period_months <= 12:
            period_str = "1y"
        elif period_months <= 24:
            period_str = "2y"
        elif period_months <= 60:
            period_str = "5y"
        else:
            period_str = "10y"
        
        # Obter dados históricos
        optimizer.load_data(
            tickers=tickers,
            periodo=period_str,
            fonte="yahoo"
        )
        
        # Executar análise de performance
        performance_analysis = optimizer.calculate_portfolio_performance_analysis(
            weights=weights_dict,
            benchmark_ticker=benchmark_ticker,
            risk_free_rate=risk_free_rate,
            analysis_period_months=period_months
        )
        
        # Remover tearsheet se não solicitado
        if not include_tearsheet:
            performance_analysis.pop('tearsheet_image', None)
        
        logger.info(f"Análise de performance concluída para {len(tickers)} ativos")
        
        return jsonify({
            "success": True,
            "data": performance_analysis,
            "request_params": {
                "tickers": tickers,
                "weights": weights,
                "period_months": period_months,
                "benchmark": benchmark_ticker,
                "risk_free_rate": risk_free_rate
            }
        })
        
    except Exception as e:
        logger.error(f"Erro na análise de performance: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.route('/compare-strategies', methods=['POST'])
def compare_portfolio_strategies():
    """
    Endpoint para comparar múltiplas estratégias de portfólio
    
    Body JSON:
    {
        "strategies": {
            "Conservador": {"PETR4.SA": 0.2, "VALE3.SA": 0.3, "ITUB4.SA": 0.5},
            "Agressivo": {"PETR4.SA": 0.6, "VALE3.SA": 0.3, "ITUB4.SA": 0.1},
            "Balanceado": {"PETR4.SA": 0.33, "VALE3.SA": 0.33, "ITUB4.SA": 0.34}
        },
        "period_months": 12,
        "benchmark": "^BVSP",
        "risk_free_rate": 0.0525
    }
    """
    try:
        data = request.get_json()
        
        # Validar parâmetros
        if 'strategies' not in data:
            return jsonify({"error": "Parâmetro 'strategies' é obrigatório"}), 400
        
        strategies = data['strategies']
        period_months = data.get('period_months', 12)
        benchmark_ticker = data.get('benchmark', '^BVSP')
        risk_free_rate = data.get('risk_free_rate', 0.0525)
        
        # Validar estratégias
        if len(strategies) < 2:
            return jsonify({"error": "Necessário pelo menos 2 estratégias para comparação"}), 400
        
        # Validar pesos de cada estratégia
        all_tickers = set()
        for strategy_name, weights in strategies.items():
            if not np.isclose(sum(weights.values()), 1.0, atol=0.01):
                return jsonify({"error": f"Soma dos pesos da estratégia '{strategy_name}' deve ser aproximadamente 1.0"}), 400
            all_tickers.update(weights.keys())
        
        # Obter dados históricos para todos os tickers
        optimizer = PortfolioOptimizer()
        
        # Converter período para formato aceito pelo load_data
        if period_months <= 1:
            period_str = "1mo"
        elif period_months <= 3:
            period_str = "3mo"
        elif period_months <= 6:
            period_str = "6mo"
        elif period_months <= 12:
            period_str = "1y"
        elif period_months <= 24:
            period_str = "2y"
        elif period_months <= 60:
            period_str = "5y"
        else:
            period_str = "10y"
        
        optimizer.load_data(
            tickers=list(all_tickers),
            periodo=period_str,
            fonte="yahoo"
        )
        
        # Executar comparação
        comparison_result = optimizer.compare_portfolio_strategies(
            strategies=strategies,
            benchmark_ticker=benchmark_ticker,
            risk_free_rate=risk_free_rate
        )
        
        logger.info(f"Comparação concluída para {len(strategies)} estratégias")
        
        return jsonify({
            "success": True,
            "data": comparison_result,
            "request_params": {
                "strategies": list(strategies.keys()),
                "period_months": period_months,
                "benchmark": benchmark_ticker,
                "risk_free_rate": risk_free_rate
            }
        })
        
    except Exception as e:
        logger.error(f"Erro na comparação de estratégias: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.route('/metrics', methods=['POST'])
def calculate_advanced_metrics():
    """
    Endpoint para cálculo de métricas avançadas usando empyrical
    
    Body JSON:
    {
        "returns": [0.01, -0.02, 0.03, 0.01, -0.01],  # Lista de retornos
        "benchmark_returns": [0.008, -0.015, 0.025, 0.012, -0.008],  # Opcional
        "risk_free_rate": 0.0525,
        "period_start": "2023-01-01",  # Opcional
        "period_end": "2024-01-01"     # Opcional
    }
    """
    try:
        data = request.get_json()
        
        # Validar parâmetros
        if 'returns' not in data:
            return jsonify({"error": "Parâmetro 'returns' é obrigatório"}), 400
        
        returns_list = data['returns']
        benchmark_returns_list = data.get('benchmark_returns')
        risk_free_rate = data.get('risk_free_rate', 0.0525)
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        # Converter para pandas Series
        dates = pd.date_range(
            start=period_start if period_start else '2023-01-01',
            periods=len(returns_list),
            freq='D'
        )
        
        portfolio_returns = pd.Series(returns_list, index=dates)
        
        benchmark_returns = None
        if benchmark_returns_list:
            if len(benchmark_returns_list) != len(returns_list):
                return jsonify({"error": "Retornos do benchmark devem ter o mesmo tamanho dos retornos do portfólio"}), 400
            benchmark_returns = pd.Series(benchmark_returns_list, index=dates)
        
        # Criar analisador
        analyzer = PerformanceAnalyzer()
        analyzer.set_portfolio_data(
            returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )
        
        # Calcular métricas
        start_date = datetime.fromisoformat(period_start) if period_start else None
        end_date = datetime.fromisoformat(period_end) if period_end else None
        
        metrics = analyzer.calculate_performance_metrics(
            risk_free_rate=risk_free_rate,
            period_start=start_date,
            period_end=end_date
        )
        
        logger.info(f"Métricas avançadas calculadas para {len(returns_list)} períodos")
        
        return jsonify({
            "success": True,
            "data": {
                "metrics": metrics,
                "analysis_info": {
                    "periods": len(returns_list),
                    "has_benchmark": benchmark_returns is not None,
                    "risk_free_rate": risk_free_rate,
                    "start_date": dates[0].isoformat(),
                    "end_date": dates[-1].isoformat()
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Erro no cálculo de métricas: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.route('/tearsheet', methods=['POST'])
def generate_tearsheet():
    """
    Endpoint para gerar tearsheet visual usando pyfolio
    
    Body JSON:
    {
        "returns": [0.01, -0.02, 0.03, 0.01, -0.01],
        "benchmark_returns": [0.008, -0.015, 0.025, 0.012, -0.008],
        "period_start": "2023-01-01",
        "hide_positions": true
    }
    """
    try:
        data = request.get_json()
        
        # Validar parâmetros
        if 'returns' not in data:
            return jsonify({"error": "Parâmetro 'returns' é obrigatório"}), 400
        
        returns_list = data['returns']
        benchmark_returns_list = data.get('benchmark_returns')
        period_start = data.get('period_start', '2023-01-01')
        hide_positions = data.get('hide_positions', True)
        
        # Converter para pandas Series
        dates = pd.date_range(
            start=period_start,
            periods=len(returns_list),
            freq='D'
        )
        
        portfolio_returns = pd.Series(returns_list, index=dates)
        
        benchmark_returns = None
        if benchmark_returns_list:
            if len(benchmark_returns_list) != len(returns_list):
                return jsonify({"error": "Retornos do benchmark devem ter o mesmo tamanho dos retornos do portfólio"}), 400
            benchmark_returns = pd.Series(benchmark_returns_list, index=dates)
        
        # Criar analisador
        analyzer = PerformanceAnalyzer()
        analyzer.set_portfolio_data(
            returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )
        
        # Gerar tearsheet
        tearsheet_base64 = analyzer.generate_pyfolio_tearsheet(
            return_fig=True,
            hide_positions=hide_positions
        )
        
        if tearsheet_base64:
            logger.info("Tearsheet gerado com sucesso")
            return jsonify({
                "success": True,
                "data": {
                    "tearsheet_image": tearsheet_base64,
                    "format": "base64_png"
                }
            })
        else:
            return jsonify({"error": "Falha ao gerar tearsheet"}), 500
        
    except Exception as e:
        logger.error(f"Erro ao gerar tearsheet: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.route('/rolling-metrics', methods=['POST'])
def calculate_rolling_metrics():
    """
    Endpoint para cálculo de métricas rolling
    
    Body JSON:
    {
        "returns": [lista de retornos],
        "window": 252,
        "metrics": ["sharpe_ratio", "volatility", "max_drawdown"]
    }
    """
    try:
        data = request.get_json()
        
        # Validar parâmetros
        if 'returns' not in data:
            return jsonify({"error": "Parâmetro 'returns' é obrigatório"}), 400
        
        returns_list = data['returns']
        window = data.get('window', 63)  # ~3 meses por padrão
        metrics_list = data.get('metrics', ['sharpe_ratio', 'volatility', 'max_drawdown'])
        
        # Validar tamanho da janela
        if window >= len(returns_list):
            return jsonify({"error": "Janela deve ser menor que o número total de retornos"}), 400
        
        # Converter para pandas Series
        dates = pd.date_range(
            start='2023-01-01',
            periods=len(returns_list),
            freq='D'
        )
        
        portfolio_returns = pd.Series(returns_list, index=dates)
        
        # Criar analisador
        analyzer = PerformanceAnalyzer()
        analyzer.set_portfolio_data(returns=portfolio_returns)
        
        # Calcular métricas rolling
        rolling_df = analyzer.calculate_rolling_metrics(
            window=window,
            metrics=metrics_list
        )
        
        # Converter para formato JSON
        rolling_data = rolling_df.dropna().tail(100).reset_index()  # Últimas 100 observações
        rolling_data['date'] = rolling_data['date'].dt.strftime('%Y-%m-%d')
        
        logger.info(f"Métricas rolling calculadas com janela de {window} períodos")
        
        return jsonify({
            "success": True,
            "data": {
                "rolling_metrics": rolling_data.to_dict('records'),
                "window": window,
                "metrics": metrics_list,
                "total_periods": len(returns_list),
                "valid_periods": len(rolling_df.dropna())
            }
        })
        
    except Exception as e:
        logger.error(f"Erro no cálculo de métricas rolling: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de verificação de saúde do serviço"""
    try:
        # Testar importações essenciais
        import pyfolio
        import empyrical
        
        return jsonify({
            "status": "healthy",
            "service": "performance_analyzer",
            "libraries": {
                "pyfolio_version": pyfolio.__version__,
                "empyrical_available": True
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@performance_bp.route('/comprehensive-analysis', methods=['POST'])
def comprehensive_performance_analysis():
    """
    Endpoint moderno para análise completa de performance com gráficos matplotlib
    
    Body JSON:
    {
        "tickers": ["PETR4.SA", "VALE3.SA", "ITUB4.SA"],
        "weights": [0.4, 0.3, 0.3],
        "period": "2y",
        "benchmark": "^BVSP",
        "risk_free_rate": 0.1475
    }
    """
    try:
        logger.info("=== INÍCIO DA ANÁLISE COMPREHENSIVE ===")
        logger.info(f"Versão do pandas: {pd.__version__}")
        logger.info(f"Versão do yfinance: {yf.__version__}")
        
        data = request.get_json()
        logger.info(f"Dados recebidos: {data}")
        
        # Validar parâmetros
        required_params = ['tickers', 'weights']
        for param in required_params:
            if param not in data:
                return jsonify({"error": f"Parâmetro obrigatório ausente: {param}"}), 400
        
        tickers = data['tickers']
        weights = data['weights']
        period = data.get('period', '2y')
        benchmark_ticker = data.get('benchmark', '^BVSP')
        risk_free_rate = data.get('risk_free_rate', 0.1475)  # Selic atual 14,75%
        
        # Validar consistência
        if len(tickers) != len(weights):
            return jsonify({"error": "Número de tickers deve ser igual ao número de pesos"}), 400
        
        if not np.isclose(sum(weights), 1.0, atol=0.01):
            return jsonify({"error": "Soma dos pesos deve ser aproximadamente 1.0"}), 400
        
        # Obter dados históricos
        logger.info(f"Obtendo dados históricos para {tickers} no período {period}")
        
        # Download dos dados com tratamento de erros
        portfolio_data = {}
        benchmark_data = None
        
        try:
            # Baixar dados dos ativos
            for ticker in tickers:
                ticker_data = yf.download(ticker, period=period, progress=False, auto_adjust=False)
                if not ticker_data.empty:
                    logger.info(f"Colunas disponíveis para {ticker}: {list(ticker_data.columns)}")
                    logger.info(f"Shape dos dados para {ticker}: {ticker_data.shape}")
                    # Tratar MultiIndex nas colunas
                    if isinstance(ticker_data.columns, pd.MultiIndex):
                        # Se temos MultiIndex, procurar pela coluna Adj Close primeiro
                        adj_close_cols = [col for col in ticker_data.columns if 'Adj Close' in col[0]]
                        close_cols = [col for col in ticker_data.columns if col[0] == 'Close']
                        
                        if adj_close_cols:
                            price_series = ticker_data[adj_close_cols[0]]
                            logger.info(f"Usando coluna {adj_close_cols[0]} para {ticker}, tipo: {type(price_series)}, shape: {price_series.shape}")
                            portfolio_data[ticker] = price_series
                        elif close_cols:
                            price_series = ticker_data[close_cols[0]]
                            logger.info(f"Usando coluna {close_cols[0]} para {ticker}, tipo: {type(price_series)}, shape: {price_series.shape}")
                            portfolio_data[ticker] = price_series
                        else:
                            logger.warning(f"Colunas Adj Close ou Close não encontradas para {ticker}")
                            continue
                    else:
                        # Priorizar Adj Close sobre Close
                        if 'Adj Close' in ticker_data.columns:
                            price_series = ticker_data['Adj Close']
                            logger.info(f"Usando 'Adj Close' para {ticker}, tipo: {type(price_series)}, shape: {price_series.shape}")
                            portfolio_data[ticker] = price_series
                        elif 'Close' in ticker_data.columns:
                            price_series = ticker_data['Close']
                            logger.info(f"Usando 'Close' para {ticker}, tipo: {type(price_series)}, shape: {price_series.shape}")
                            portfolio_data[ticker] = price_series
                        else:
                            logger.warning(f"Nem 'Adj Close' nem 'Close' encontrados para {ticker}. Colunas: {list(ticker_data.columns)}")
                            continue
                else:
                    logger.warning(f"Dados não encontrados para {ticker}")
            
            # Baixar dados do benchmark
            benchmark_raw = yf.download(benchmark_ticker, period=period, progress=False, auto_adjust=False)
            if not benchmark_raw.empty:
                logger.info(f"Colunas disponíveis para benchmark {benchmark_ticker}: {list(benchmark_raw.columns)}")
                # Tratar MultiIndex nas colunas
                if isinstance(benchmark_raw.columns, pd.MultiIndex):
                    # Se temos MultiIndex, procurar pela coluna Adj Close primeiro
                    adj_close_cols = [col for col in benchmark_raw.columns if 'Adj Close' in col[0]]
                    close_cols = [col for col in benchmark_raw.columns if col[0] == 'Close']
                    
                    if adj_close_cols:
                        benchmark_data = benchmark_raw[adj_close_cols[0]]
                        logger.info(f"Usando coluna {adj_close_cols[0]} para benchmark")
                    elif close_cols:
                        benchmark_data = benchmark_raw[close_cols[0]]
                        logger.info(f"Usando coluna {close_cols[0]} para benchmark")
                    else:
                        logger.warning(f"Colunas Adj Close ou Close não encontradas para benchmark {benchmark_ticker}")
                else:
                    # Priorizar Adj Close sobre Close
                    if 'Adj Close' in benchmark_raw.columns:
                        benchmark_data = benchmark_raw['Adj Close']
                        logger.info(f"Usando 'Adj Close' para benchmark")
                    elif 'Close' in benchmark_raw.columns:
                        benchmark_data = benchmark_raw['Close']
                        logger.info(f"Usando 'Close' para benchmark")
                    else:
                        logger.warning(f"Nem 'Adj Close' nem 'Close' encontrados para benchmark {benchmark_ticker}")
            
            if not portfolio_data:
                return jsonify({"error": "Nenhum dado válido encontrado para os ativos"}), 400
                
        except Exception as e:
            logger.error(f"Erro ao obter dados: {str(e)}")
            return jsonify({"error": f"Erro ao obter dados de mercado: {str(e)}"}), 500
        
        # Criar DataFrame de preços
        if not portfolio_data:
            return jsonify({"error": "Nenhum dado válido encontrado para os ativos"}), 400
            
        # Verificar se temos dados suficientes
        first_ticker = list(portfolio_data.keys())[0]
        if len(portfolio_data[first_ticker]) == 0:
            return jsonify({"error": "Dados insuficientes para análise"}), 400
            
        # Debug: verificar estrutura dos dados
        logger.info(f"Portfolio data keys: {list(portfolio_data.keys())}")
        for ticker, data in portfolio_data.items():
            logger.info(f"{ticker}: tipo={type(data)}, shape={getattr(data, 'shape', 'N/A')}, index_type={type(data.index) if hasattr(data, 'index') else 'N/A'}")
        
        # Garantir que todas as séries tenham o mesmo índice
        common_index = None
        for ticker, data in portfolio_data.items():
            if common_index is None:
                common_index = data.index
            else:
                common_index = common_index.intersection(data.index)
        
        logger.info(f"Índice comum tem {len(common_index)} datas")
        
        # Reindexar todas as séries para o índice comum
        aligned_data = {}
        for ticker, data in portfolio_data.items():
            aligned_series = data.reindex(common_index)
            aligned_data[ticker] = aligned_series
            logger.info(f"Dados alinhados para {ticker}: {len(aligned_series)} pontos, tipo: {type(aligned_series)}")
        
        logger.info(f"Criando DataFrame com dados: {[(k, type(v), len(v)) for k, v in aligned_data.items()]}")
        
        # Verificar se temos dados válidos
        if not aligned_data:
            return jsonify({"error": "Nenhum dado válido após alinhamento"}), 400
        
        # Criar DataFrame de forma mais robusta
        try:
            # Verificar se todas as séries têm o mesmo comprimento
            lengths = [len(v) for v in aligned_data.values()]
            if len(set(lengths)) > 1:
                logger.warning(f"Séries com comprimentos diferentes: {dict(zip(aligned_data.keys(), lengths))}")
            
            # Criar DataFrame explicitamente com índice
            prices_df = pd.DataFrame(aligned_data, index=common_index)
            logger.info(f"DataFrame criado com sucesso: shape={prices_df.shape}")
            
        except Exception as e:
            logger.error(f"Erro ao criar DataFrame: {str(e)}")
            # Tentar criar DataFrame de forma alternativa
            try:
                prices_df = pd.concat(aligned_data.values(), axis=1, keys=aligned_data.keys())
                logger.info(f"DataFrame criado com concat: shape={prices_df.shape}")
            except Exception as e2:
                logger.error(f"Erro também com concat: {str(e2)}")
                return jsonify({"error": f"Erro ao criar DataFrame: {str(e)}"}), 500
        prices_df = prices_df.dropna()
        
        if len(prices_df) < 30:
            return jsonify({"error": "Dados insuficientes para análise (mínimo 30 dias)"}), 400
        
        # Calcular retornos
        returns_df = prices_df.pct_change().dropna()
        
        # Calcular retornos do portfólio
        weights_series = pd.Series(weights, index=prices_df.columns)
        portfolio_returns = (returns_df * weights_series).sum(axis=1)
        
        # Calcular retornos do benchmark
        benchmark_returns = None
        if benchmark_data is not None:
            benchmark_returns = benchmark_data.pct_change().dropna()
            # Alinhar datas
            common_dates = portfolio_returns.index.intersection(benchmark_returns.index)
            portfolio_returns = portfolio_returns.loc[common_dates]
            benchmark_returns = benchmark_returns.loc[common_dates]
        
        # Inicializar analisador de performance COMPLETO
        from services.performance_analyzer_complete import CompletePerformanceAnalyzer
        analyzer = CompletePerformanceAnalyzer()
        analyzer.set_portfolio_data(
            returns=portfolio_returns,
            benchmark_returns=benchmark_returns
        )
        
        # Calcular TODAS as métricas empyrical disponíveis
        metrics = analyzer.calculate_all_empyrical_metrics(
            risk_free_rate=risk_free_rate  # Taxa anual
        )
        
        # Gerar gráficos matplotlib COMPLETOS
        charts = generate_complete_performance_charts(
            portfolio_returns=portfolio_returns,
            benchmark_returns=benchmark_returns,
            prices_df=prices_df,
            weights=weights,
            tickers=tickers,
            benchmark_ticker=benchmark_ticker,
            analyzer=analyzer
        )
        
        # Preparar resposta
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "analysis_period": {
                "start_date": portfolio_returns.index[0].isoformat(),
                "end_date": portfolio_returns.index[-1].isoformat(),
                "total_days": len(portfolio_returns),
                "period": period
            },
            "portfolio_composition": [
                {"ticker": ticker, "weight": weight, "name": ticker.replace('.SA', '')}
                for ticker, weight in zip(tickers, weights)
            ],
            "performance_metrics": {
                # ===== MÉTRICAS BÁSICAS DE RETORNO =====
                "annual_return": float(metrics.get('annual_return', 0)),
                "cagr": float(metrics.get('cagr', 0)),
                "cumulative_return": float(metrics.get('cumulative_return', 0)),
                "simple_returns_mean": float(metrics.get('simple_returns_mean', 0)),
                
                # ===== MÉTRICAS DE VOLATILIDADE E RISCO =====
                "annual_volatility": float(metrics.get('annual_volatility', 0)),
                "downside_risk": float(metrics.get('downside_risk', 0)),
                "value_at_risk_95": float(metrics.get('value_at_risk_95', 0)),
                "value_at_risk_99": float(metrics.get('value_at_risk_99', 0)),
                "conditional_value_at_risk_95": float(metrics.get('conditional_value_at_risk_95', 0)),
                "conditional_value_at_risk_99": float(metrics.get('conditional_value_at_risk_99', 0)),
                "max_drawdown": float(metrics.get('max_drawdown', 0)),
                
                # ===== MÉTRICAS DE RISCO-RETORNO =====
                "sharpe_ratio": float(metrics.get('sharpe_ratio', 0)),
                "sortino_ratio": float(metrics.get('sortino_ratio', 0)),
                "calmar_ratio": float(metrics.get('calmar_ratio', 0)),
                "omega_ratio": float(metrics.get('omega_ratio', 0)),
                
                # ===== MÉTRICAS ESTATÍSTICAS =====
                "skewness": float(metrics.get('skewness', 0)),
                "kurtosis": float(metrics.get('kurtosis', 0)),
                "tail_ratio": float(metrics.get('tail_ratio', 0)),
                "stability_of_timeseries": float(metrics.get('stability_of_timeseries', 0)),
                
                # ===== MÉTRICAS AVANÇADAS DE RISCO =====
                "gpd_var_estimate": metrics.get('gpd_var_estimate'),
                "gpd_es_estimate": metrics.get('gpd_es_estimate'),
                
                # ===== MÉTRICAS VS BENCHMARK =====
                "alpha": metrics.get('alpha'),
                "beta": metrics.get('beta'),
                "up_capture": metrics.get('up_capture'),
                "down_capture": metrics.get('down_capture'),
                "capture_ratio": metrics.get('capture_ratio'),
                "excess_sharpe": metrics.get('excess_sharpe'),
                "batting_average": metrics.get('batting_average'),
                "beta_fragility_heuristic": metrics.get('beta_fragility_heuristic'),
                "tracking_error": metrics.get('tracking_error'),
                "information_ratio": metrics.get('information_ratio'),
                
                # ===== ALPHA/BETA UP/DOWN =====
                "up_alpha": metrics.get('up_alpha'),
                "up_beta": metrics.get('up_beta'),
                "down_alpha": metrics.get('down_alpha'),
                "down_beta": metrics.get('down_beta'),
                
                # ===== BENCHMARK STATS =====
                "benchmark_annual_return": metrics.get('benchmark_annual_return'),
                "benchmark_volatility": metrics.get('benchmark_volatility'),
                "benchmark_sharpe": metrics.get('benchmark_sharpe'),
                "benchmark_max_drawdown": metrics.get('benchmark_max_drawdown'),
                
                # ===== MÉTRICAS ROLLING (30 dias) =====
                "roll_annual_volatility_30d": metrics.get('roll_annual_volatility_30d'),
                "roll_max_drawdown_30d": metrics.get('roll_max_drawdown_30d'),
                "roll_sharpe_ratio_30d": metrics.get('roll_sharpe_ratio_30d'),
                "roll_sortino_ratio_30d": metrics.get('roll_sortino_ratio_30d'),
                "roll_alpha_30d": metrics.get('roll_alpha_30d'),
                "roll_beta_30d": metrics.get('roll_beta_30d'),
                "roll_up_capture_30d": metrics.get('roll_up_capture_30d'),
                "roll_down_capture_30d": metrics.get('roll_down_capture_30d'),
                
                # ===== MÉTRICAS DE AGREGAÇÃO =====
                "monthly_returns_count": metrics.get('monthly_returns_count'),
                "yearly_returns_count": metrics.get('yearly_returns_count'),
                "best_month": metrics.get('best_month'),
                "worst_month": metrics.get('worst_month'),
                "best_year": metrics.get('best_year'),
                "worst_year": metrics.get('worst_year'),
                "positive_months_pct": metrics.get('positive_months_pct'),
                "positive_years_pct": metrics.get('positive_years_pct'),
                
                # ===== ANÁLISES AVANÇADAS =====
                "performance_attribution": metrics.get('performance_attribution'),
                "factor_exposures": metrics.get('factor_exposures'),
            },
            "charts": charts,
            "request_params": {
                "tickers": tickers,
                "weights": weights,
                "period": period,
                "benchmark": benchmark_ticker,
                "risk_free_rate": risk_free_rate
            }
        }
        
        logger.info(f"Análise de performance concluída para portfólio de {len(tickers)} ativos")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na análise de performance: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def generate_complete_performance_charts(portfolio_returns, benchmark_returns, prices_df, weights, tickers, benchmark_ticker, analyzer):
    """Gerar TODOS os gráficos usando pyfolio e matplotlib"""
    charts = {}
    
    try:
        # Configurar estilo profissional
        plt.style.use('default')
        sns.set_palette("husl")
        sns.set_context("notebook", font_scale=1.0)
        
        # ===== 1. GRÁFICOS PYFOLIO NATIVOS =====
        logger.info("Gerando gráficos pyfolio nativos...")
        
        # 1.1 Rolling Returns (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(14, 8))
            
            pf.plot_rolling_returns(
                returns=portfolio_returns,
                factor_returns=benchmark_returns,
                ax=ax
            )
            
            # Melhorar a visualização das linhas
            for line in ax.lines:
                line.set_linewidth(2.5)  # Linhas mais grossas
            
            # Melhorar cores se necessário
            if len(ax.lines) >= 2:
                ax.lines[0].set_color('#2E86AB')  # Azul para portfólio
                ax.lines[1].set_color('#C73E1D')  # Vermelho para benchmark
            
            ax.set_facecolor('white')
            ax.grid(True, alpha=0.3, color='gray')
            
            plt.title('Rolling Returns (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['rolling_returns_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ rolling_returns_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro rolling returns pyfolio: {e}")
        
        # 1.2 Rolling Sharpe (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(14, 6))
            pf.plot_rolling_sharpe(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Rolling Sharpe Ratio (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['rolling_sharpe_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ rolling_sharpe_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro rolling sharpe pyfolio: {e}")
        
        # 1.3 Rolling Beta (pyfolio)
        if benchmark_returns is not None:
            try:
                fig, ax = plt.subplots(figsize=(14, 6))
                
                pf.plot_rolling_beta(
                    returns=portfolio_returns,
                    factor_returns=benchmark_returns,
                    ax=ax
                )
                
                # Melhorar a visualização
                for line in ax.lines:
                    line.set_linewidth(2.5)
                    line.set_color('#2E86AB')
                
                # Adicionar linha de referência beta = 1
                ax.axhline(y=1, color='red', linestyle='--', alpha=0.7, linewidth=1.5, label='Beta = 1.0')
                
                ax.set_facecolor('white')
                ax.grid(True, alpha=0.3, color='gray')
                ax.legend()
                
                plt.title('Rolling Beta (pyfolio)', fontsize=14, fontweight='bold')
                plt.tight_layout()
                charts['rolling_beta_pyfolio'] = create_plot_base64(fig)
                logger.info("✅ rolling_beta_pyfolio gerado com sucesso")
            except Exception as e:
                logger.warning(f"❌ Erro rolling beta pyfolio: {e}")
        
        # 1.4 Rolling Volatility (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(14, 6))
            pf.plot_rolling_volatility(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Rolling Volatility (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['rolling_volatility_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ rolling_volatility_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro rolling volatility pyfolio: {e}")
        
        # 1.5 Drawdown Periods (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(14, 8))
            
            # Configurar estilo para melhor visibilidade
            plt.style.use('default')
            
            pf.plot_drawdown_periods(
                returns=portfolio_returns,
                top=10,
                ax=ax
            )
            
            # Melhorar a visualização das barras de drawdown
            for patch in ax.patches:
                patch.set_alpha(0.8)  # Tornar as barras mais opacas
                patch.set_edgecolor('black')  # Adicionar borda preta
                patch.set_linewidth(0.5)
            
            # Melhorar cores e contraste
            ax.set_facecolor('white')
            ax.grid(True, alpha=0.3, color='gray')
            
            plt.title('Drawdown Periods (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['drawdown_periods_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ drawdown_periods_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro drawdown periods pyfolio: {e}")
        
        # 1.6 Drawdown Underwater (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(14, 6))
            
            pf.plot_drawdown_underwater(
                returns=portfolio_returns,
                ax=ax
            )
            
            # Melhorar a visualização do gráfico underwater
            for collection in ax.collections:
                collection.set_alpha(0.7)  # Tornar o preenchimento mais visível
            
            # Melhorar linha principal se existir
            for line in ax.lines:
                line.set_linewidth(2)
                line.set_color('#C73E1D')  # Cor vermelha mais forte
            
            ax.set_facecolor('white')
            ax.grid(True, alpha=0.3, color='gray')
            
            plt.title('Drawdown Underwater (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['drawdown_underwater_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ drawdown_underwater_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro drawdown underwater pyfolio: {e}")
        
        # 1.7 Monthly Returns Heatmap (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(12, 8))
            pf.plot_monthly_returns_heatmap(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Monthly Returns Heatmap (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['monthly_heatmap_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ monthly_heatmap_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro monthly heatmap pyfolio: {e}")
        
        # 1.8 Annual Returns (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(12, 6))
            pf.plot_annual_returns(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Annual Returns (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['annual_returns_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ annual_returns_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro annual returns pyfolio: {e}")
        
        # 1.9 Monthly Returns Distribution (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            pf.plot_monthly_returns_dist(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Monthly Returns Distribution (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['monthly_distribution_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ monthly_distribution_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro monthly dist pyfolio: {e}")
        
        # 1.10 Return Quantiles (pyfolio)
        try:
            fig, ax = plt.subplots(figsize=(12, 6))
            pf.plot_return_quantiles(
                returns=portfolio_returns,
                ax=ax
            )
            plt.title('Return Quantiles (pyfolio)', fontsize=14, fontweight='bold')
            plt.tight_layout()
            charts['return_quantiles_pyfolio'] = create_plot_base64(fig)
            logger.info("✅ return_quantiles_pyfolio gerado com sucesso")
        except Exception as e:
            logger.warning(f"❌ Erro return quantiles pyfolio: {e}")
        
        # ===== 2. GRÁFICOS CUSTOMIZADOS ADICIONAIS =====
        logger.info("Gerando gráficos customizados...")
        
        # 2.1 Performance Cumulativa Customizada
        fig, ax = plt.subplots(figsize=(14, 8))
        
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        ax.plot(portfolio_cumulative.index, portfolio_cumulative.values, 
                linewidth=3, label='Portfólio', color='#2E86AB')
        
        if benchmark_returns is not None:
            benchmark_cumulative = (1 + benchmark_returns).cumprod()
            ax.plot(benchmark_cumulative.index, benchmark_cumulative.values, 
                    linewidth=2, label=benchmark_ticker, color='#A23B72', alpha=0.8)
        
        ax.set_title('Performance Cumulativa Completa', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Retorno Cumulativo', fontsize=12)
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{(x-1)*100:.1f}%'))
        
        plt.tight_layout()
        charts['custom_cumulative_returns'] = create_plot_base64(fig)
        
        # 2.2 Distribuição de Retornos Avançada
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Histograma
        ax1.hist(portfolio_returns.values, bins=50, alpha=0.7, color='#2E86AB', 
                edgecolor='black', linewidth=0.5)
        ax1.axvline(portfolio_returns.mean(), color='#C73E1D', linestyle='--', 
                   linewidth=2, label=f'Média: {portfolio_returns.mean()*100:.2f}%')
        ax1.set_title('Distribuição dos Retornos Diários', fontsize=14, fontweight='bold')
        ax1.set_xlabel('Retorno Diário', fontsize=12)
        ax1.set_ylabel('Frequência', fontsize=12)
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Q-Q Plot
        from scipy import stats
        stats.probplot(portfolio_returns.values, dist="norm", plot=ax2)
        ax2.set_title('Q-Q Plot (Normal)', fontsize=14, fontweight='bold')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['returns_distribution'] = create_plot_base64(fig)
        
        # 4. Composição do Portfólio
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Pie chart
        colors = plt.cm.Set3(np.linspace(0, 1, len(tickers)))
        wedges, texts, autotexts = ax1.pie(weights, labels=[t.replace('.SA', '') for t in tickers], 
                                          autopct='%1.1f%%', colors=colors, startangle=90)
        ax1.set_title('Composição do Portfólio', fontsize=14, fontweight='bold')
        
        # Bar chart
        ax2.bar(range(len(tickers)), weights, color=colors)
        ax2.set_title('Pesos dos Ativos', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Ativos', fontsize=12)
        ax2.set_ylabel('Peso (%)', fontsize=12)
        ax2.set_xticks(range(len(tickers)))
        ax2.set_xticklabels([t.replace('.SA', '') for t in tickers], rotation=45)
        ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x*100:.1f}%'))
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['portfolio_composition'] = create_plot_base64(fig)
        
        # 5. Evolução dos Preços dos Ativos
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Normalizar preços (base 100)
        normalized_prices = prices_df / prices_df.iloc[0] * 100
        
        colors = plt.cm.tab10(np.linspace(0, 1, len(tickers)))
        for i, ticker in enumerate(tickers):
            ax.plot(normalized_prices.index, normalized_prices[ticker], 
                   label=ticker.replace('.SA', ''), linewidth=2, color=colors[i])
        
        ax.set_title('Evolução Normalizada dos Preços (Base 100)', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Preço Normalizado', fontsize=12)
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['price_evolution'] = create_plot_base64(fig)
        
        # 6. Métricas Rolling (Sharpe Ratio de 60 dias)
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Calcular Sharpe rolling
        rolling_returns = portfolio_returns.rolling(60).mean() * 252
        rolling_vol = portfolio_returns.rolling(60).std() * np.sqrt(252)
        rolling_sharpe = (rolling_returns - 0.1475) / rolling_vol  # Usando Selic
        
        ax.plot(rolling_sharpe.index, rolling_sharpe.values, 
               linewidth=2, color='#2E86AB', label='Sharpe Ratio (60d)')
        ax.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        ax.axhline(y=1, color='green', linestyle='--', alpha=0.5, label='Sharpe = 1.0')
        
        ax.set_title('Evolução do Sharpe Ratio (60 dias)', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Sharpe Ratio', fontsize=12)
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['rolling_sharpe'] = create_plot_base64(fig)
        
        # 7. Drawdown Customizado
        fig, ax = plt.subplots(figsize=(12, 6))
        
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        running_max = portfolio_cumulative.expanding().max()
        drawdown = (portfolio_cumulative - running_max) / running_max
        
        ax.fill_between(drawdown.index, drawdown.values, 0, 
                       color='#F18F01', alpha=0.7, label='Drawdown')
        ax.plot(drawdown.index, drawdown.values, color='#C73E1D', linewidth=1.5)
        
        ax.set_title('Drawdown do Portfólio', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Drawdown', fontsize=12)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x*100:.1f}%'))
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['drawdown'] = create_plot_base64(fig)
        
        # 8. Performance Cumulativa (gráfico original)
        fig, ax = plt.subplots(figsize=(12, 8))
        
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        ax.plot(portfolio_cumulative.index, portfolio_cumulative.values, 
                linewidth=2.5, label='Portfólio', color='#2E86AB')
        
        if benchmark_returns is not None:
            benchmark_cumulative = (1 + benchmark_returns).cumprod()
            ax.plot(benchmark_cumulative.index, benchmark_cumulative.values, 
                    linewidth=2, label=benchmark_ticker, color='#A23B72', alpha=0.8)
        
        ax.set_title('Performance Cumulativa', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Retorno Cumulativo', fontsize=12)
        ax.legend(fontsize=11)
        ax.grid(True, alpha=0.3)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{(x-1)*100:.1f}%'))
        
        plt.tight_layout()
        charts['cumulative_returns'] = create_plot_base64(fig)
        
        # ===== GRÁFICOS ADICIONAIS PARA FRONTEND =====
        
        # 9. Distribuição Avançada (duplicada para compatibilidade)
        charts['returns_distribution_advanced'] = charts['returns_distribution']
        
        # 10. Períodos de Drawdown Customizado
        fig, ax = plt.subplots(figsize=(14, 8))
        
        # Identificar períodos de drawdown
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        running_max = portfolio_cumulative.expanding().max()
        drawdown = (portfolio_cumulative - running_max) / running_max
        
        # Colorir áreas de drawdown
        ax.fill_between(drawdown.index, drawdown.values, 0, 
                       color='red', alpha=0.3, label='Drawdown Periods')
        ax.plot(drawdown.index, drawdown.values, color='darkred', linewidth=1)
        
        # Adicionar linha de recuperação
        ax.axhline(y=0, color='black', linestyle='-', alpha=0.8, label='Nível Zero')
        
        # Marcar os 5 piores drawdowns
        drawdown_periods = []
        is_drawdown = drawdown < -0.01  # Drawdown > 1%
        
        if is_drawdown.any():
            # Agrupar períodos consecutivos
            groups = (is_drawdown != is_drawdown.shift()).cumsum()
            for group in groups[is_drawdown].unique():
                period_mask = (groups == group) & is_drawdown
                start_date = drawdown[period_mask].index[0]
                end_date = drawdown[period_mask].index[-1]
                min_drawdown = drawdown[period_mask].min()
                drawdown_periods.append((start_date, end_date, min_drawdown))
            
            # Ordenar pelos piores drawdowns
            drawdown_periods.sort(key=lambda x: x[2])
            
            # Marcar os 3 piores
            for i, (start, end, min_dd) in enumerate(drawdown_periods[:3]):
                ax.axvspan(start, end, alpha=0.2, color=f'C{i}', 
                          label=f'Top {i+1} DD: {min_dd*100:.1f}%')
        
        ax.set_title('Períodos de Drawdown Detalhados', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel('Data', fontsize=12)
        ax.set_ylabel('Drawdown', fontsize=12)
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x*100:.1f}%'))
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        charts['drawdown_periods_custom'] = create_plot_base64(fig)
        
        # Log detalhado dos gráficos gerados
        logger.info(f"=== RESUMO DOS GRÁFICOS GERADOS ===")
        logger.info(f"Total de gráficos: {len(charts)}")
        
        pyfolio_charts = [k for k in charts.keys() if 'pyfolio' in k]
        custom_charts = [k for k in charts.keys() if 'pyfolio' not in k and k != 'error']
        
        logger.info(f"Gráficos pyfolio: {len(pyfolio_charts)}")
        for chart in pyfolio_charts:
            logger.info(f"  ✅ {chart}")
        
        logger.info(f"Gráficos customizados: {len(custom_charts)}")
        for chart in custom_charts:
            logger.info(f"  ✅ {chart}")
        
        if 'error' in charts:
            logger.error(f"Erro encontrado: {charts['error']}")
        
    except Exception as e:
        logger.error(f"Erro ao gerar gráficos: {str(e)}")
        import traceback
        logger.error(f"Traceback completo: {traceback.format_exc()}")
        charts['error'] = str(e)
    
    return charts 