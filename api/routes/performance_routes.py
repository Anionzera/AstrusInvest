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

from services.performance_analyzer import PerformanceAnalyzer
from portfolio_optimizer import PortfolioOptimizer

# Criar blueprint
performance_bp = Blueprint('performance', __name__, url_prefix='/api/performance')

logger = logging.getLogger(__name__)

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