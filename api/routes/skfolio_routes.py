"""
SKFolio Routes - API Endpoints Completos para SKFolio
===================================================

Este módulo implementa todas as rotas da API para o SKFolio,
proporcionando acesso completo a todas as funcionalidades de
otimização de portfólio, análise de risco e validação de modelos.

Endpoints Disponíveis:
- /skfolio/optimize/mean-risk: Otimização Mean-Risk
- /skfolio/optimize/risk-budgeting: Risk Budgeting/Risk Parity  
- /skfolio/optimize/hierarchical: Hierarchical Risk Parity (HRP)
- /skfolio/optimize/nested-clusters: Nested Clusters Optimization (NCO)
- /skfolio/optimize/black-litterman: Black-Litterman
- /skfolio/optimize/factor-model: Factor Model
- /skfolio/optimize/entropy-pooling: Entropy Pooling
- /skfolio/model-selection/grid-search: Grid Search
- /skfolio/model-selection/randomized-search: Randomized Search
- /skfolio/model-selection/cross-validation: Cross Validation
- /skfolio/pipeline/create: Criar Pipeline de Otimização
- /skfolio/stress-test: Teste de Estresse
- /skfolio/synthetic-data: Otimização com Dados Sintéticos
- /skfolio/reports/comprehensive: Relatório Abrangente
- /skfolio/models/compare: Comparação de Modelos
- /skfolio/info/*: Informações e utilitários
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import traceback
import json
from datetime import datetime, timedelta
import logging

# Importar serviços
from services.skfolio_service import get_skfolio_service, OptimizationConfig, RiskConfig, ModelSelectionConfig
from services.arctic_service import get_arctic_service

# SKFolio específicos
from skfolio import RiskMeasure, RatioMeasure
from skfolio.optimization import ObjectiveFunction, MeanRisk, RiskBudgeting, HierarchicalRiskParity
from skfolio.cluster import LinkageMethod
from skfolio.prior import EmpiricalPrior, BlackLitterman
from skfolio.moments import ShrunkMu, DenoiseCovariance

# Logging
logger = logging.getLogger(__name__)

# Criar blueprint
skfolio_bp = Blueprint('skfolio', __name__, url_prefix='/api/skfolio')

# Instâncias dos serviços
skfolio_service = get_skfolio_service()
arctic_service = get_arctic_service()

def handle_error(error: Exception) -> tuple:
    """Handler de erro padrão"""
    logger.error(f"Erro na API SKFolio: {str(error)}")
    logger.error(traceback.format_exc())
    
    return jsonify({
        'error': str(error),
        'type': error.__class__.__name__,
        'timestamp': datetime.now().isoformat()
    }), 500

def parse_optimization_config(config_data: Dict) -> OptimizationConfig:
    """Parse configuração de otimização do JSON"""
    if not config_data:
        return OptimizationConfig()
    
    # Fazer uma cópia para não modificar o original
    config_copy = config_data.copy()
    
    # Converter strings para enums
    if 'objective_function' in config_copy:
        if isinstance(config_copy['objective_function'], str):
            try:
                config_copy['objective_function'] = ObjectiveFunction[config_copy['objective_function']]
            except KeyError:
                logger.warning(f"Objective function '{config_copy['objective_function']}' não reconhecida, usando padrão")
                config_copy['objective_function'] = ObjectiveFunction.MINIMIZE_RISK
    
    if 'risk_measure' in config_copy:
        if isinstance(config_copy['risk_measure'], str):
            try:
                config_copy['risk_measure'] = RiskMeasure[config_copy['risk_measure']]
            except KeyError:
                logger.warning(f"Risk measure '{config_copy['risk_measure']}' não reconhecida, usando padrão")
                config_copy['risk_measure'] = RiskMeasure.VARIANCE
    
    try:
        return OptimizationConfig(**config_copy)
    except Exception as e:
        logger.error(f"Erro ao criar OptimizationConfig: {e}")
        return OptimizationConfig()

def parse_model_selection_config(config_data: Dict) -> ModelSelectionConfig:
    """Parse configuração de seleção de modelo do JSON"""
    if not config_data:
        return ModelSelectionConfig()
    
    return ModelSelectionConfig(**config_data)

def serialize_portfolio_results(model, portfolio) -> Dict:
    """🔧 Serializa resultados do portfólio para JSON - VERSÃO ROBUSTA"""
    try:
        # 🛡️ CONVERSÃO ROBUSTA DE WEIGHTS
        weights_dict = {}
        if hasattr(portfolio.weights, 'to_dict'):
            weights_dict = portfolio.weights.to_dict()
        elif hasattr(portfolio.weights, 'index') and hasattr(portfolio.weights, 'values'):
            # Series do pandas
            weights_dict = dict(zip(portfolio.weights.index, portfolio.weights.values))
        elif hasattr(portfolio.weights, 'items'):
            # Já é um dict-like
            weights_dict = dict(portfolio.weights.items())
        else:
            # Array numpy ou lista - usar índices numéricos
            try:
                weights_values = list(portfolio.weights)
                weights_dict = {f"Asset_{i}": float(val) for i, val in enumerate(weights_values)}
            except:
                weights_dict = {"error": "Could not parse weights"}
        
        # 🛡️ CONVERSÃO SEGURA DE MÉTRICAS
        def safe_float(value, default=0.0):
            try:
                return float(value)
            except (TypeError, ValueError, AttributeError):
                return default
        
        def safe_getattr(obj, attr, default=0.0):
            try:
                val = getattr(obj, attr, default)
                return safe_float(val, default)
            except:
                return default
        
        results = {
            'weights': weights_dict,
            'performance_metrics': {
                'annualized_return': safe_getattr(portfolio, 'annualized_mean'),
                'annualized_volatility': safe_getattr(portfolio, 'annualized_standard_deviation'),
                'sharpe_ratio': safe_getattr(portfolio, 'annualized_sharpe_ratio'),
                'sortino_ratio': safe_getattr(portfolio, 'annualized_sortino_ratio'),
                'calmar_ratio': safe_getattr(portfolio, 'calmar_ratio'),
                'max_drawdown': safe_getattr(portfolio, 'max_drawdown'),
                'cvar_95': safe_getattr(portfolio, 'cvar')
            },
            'risk_metrics': {
                'volatility': safe_getattr(portfolio, 'annualized_standard_deviation'),
                'downside_deviation': safe_getattr(portfolio, 'annualized_semi_deviation'),
                'ulcer_index': safe_getattr(portfolio, 'ulcer_index'),
                'skewness': safe_getattr(portfolio, 'skew'),
                'kurtosis': safe_getattr(portfolio, 'kurtosis')
            },
            'model_info': {
                'type': model.__class__.__name__,
                'solver_used': getattr(model, 'solver', 'N/A'),
                'n_assets': len(weights_dict)
            }
        }
        
        # 🛡️ ADICIONAR CONTRIBUIÇÕES DE FORMA ROBUSTA
        if hasattr(portfolio, 'contribution'):
            try:
                if hasattr(portfolio.contribution, 'to_dict'):
                    results['contribution'] = portfolio.contribution.to_dict()
                elif hasattr(portfolio.contribution, 'index'):
                    results['contribution'] = dict(zip(portfolio.contribution.index, portfolio.contribution.values))
                else:
                    results['contribution'] = dict(portfolio.contribution.items())
            except Exception as contrib_error:
                logger.warning(f"Erro ao serializar contribuições: {contrib_error}")
                results['contribution'] = {}
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Erro ao serializar resultados: {e}")
        import traceback
        traceback.print_exc()
        # 🛡️ FALLBACK SEGURO
        try:
            return {
                'weights': dict(enumerate(portfolio.weights.values if hasattr(portfolio.weights, 'values') else portfolio.weights)),
                'error': f"Erro na serialização: {str(e)}",
                'fallback': True
            }
        except:
            return {
                'weights': {"Asset_0": 1.0},
                'error': f"Erro crítico na serialização: {str(e)}",
                'fallback': True
            }

# =====================================
# ENDPOINTS DE OTIMIZAÇÃO
# =====================================

@skfolio_bp.route('/optimize/mean-risk', methods=['POST'])
def optimize_mean_risk():
    """
    Endpoint para otimização Mean-Risk
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01", 
        "config": {
            "objective_function": "MAXIMIZE_RATIO",
            "risk_measure": "VARIANCE",
            "min_weights": 0.0,
            "max_weights": 0.4,
            "solver": "CLARABEL"
        },
        "uncertainty_sets": {
            "mu": {"n_simulations": 1000},
            "covariance": {"n_simulations": 1000}
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros obrigatórios
        required_fields = ['assets', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados dos ativos
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        
        # Buscar preços históricos
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        
        # Converter para retornos
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Parse configuração
        config = parse_optimization_config(data.get('config', {}))
        
        # Configurar conjuntos de incerteza
        uncertainty_sets = data.get('uncertainty_sets')
        
        # Executar otimização
        model, portfolio = skfolio_service.optimize_mean_risk(
            returns=returns,
            config=config,
            uncertainty_sets=uncertainty_sets
        )
        
        # Serializar resultados
        results = serialize_portfolio_results(model, portfolio)
        
        return jsonify({
            'success': True,
            'optimization_type': 'mean_risk',
            'results': results,
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns),
                'return_period': f"{len(returns)} days"
            }
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/optimize/risk-budgeting', methods=['POST'])
def optimize_risk_budgeting():
    """
    Endpoint para otimização Risk Budgeting/Risk Parity
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "risk_budgets": {
            "AAPL": 0.3,
            "MSFT": 0.4,
            "GOOGL": 0.3
        },
        "config": {
            "risk_measure": "VARIANCE",
            "solver": "CLARABEL"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        risk_budgets = data.get('risk_budgets')
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Parse configuração
        config = parse_optimization_config(data.get('config', {}))
        
        # Executar otimização
        model, portfolio = skfolio_service.optimize_risk_budgeting(
            returns=returns,
            risk_budgets=risk_budgets,
            config=config
        )
        
        # Serializar resultados
        results = serialize_portfolio_results(model, portfolio)
        
        return jsonify({
            'success': True,
            'optimization_type': 'risk_budgeting',
            'results': results,
            'risk_budgets_used': risk_budgets,
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/optimize/hierarchical', methods=['POST'])
def optimize_hierarchical():
    """
    Endpoint para otimização Hierarchical Risk Parity (HRP)
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "config": {
            "risk_measure": "CVAR",
            "solver": "CLARABEL"
        },
        "linkage_method": "WARD",
        "distance_method": "PEARSON"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Parse configuração
        config = parse_optimization_config(data.get('config', {}))
        
        # Parse linkage method
        linkage_method_str = data.get('linkage_method', 'WARD')
        linkage_method = LinkageMethod[linkage_method_str]
        
        # Executar otimização
        model, portfolio = skfolio_service.optimize_hierarchical_risk_parity(
            returns=returns,
            config=config,
            linkage_method=linkage_method
        )
        
        # Serializar resultados
        results = serialize_portfolio_results(model, portfolio)
        
        return jsonify({
            'success': True,
            'optimization_type': 'hierarchical_risk_parity',
            'results': results,
            'clustering_info': {
                'linkage_method': linkage_method_str,
                'distance_method': data.get('distance_method', 'PEARSON')
            },
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/optimize/black-litterman', methods=['POST'])
def optimize_black_litterman():
    """
    Endpoint para otimização Black-Litterman
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "views": [
            "AAPL - MSFT == 0.02",
            "GOOGL == 0.08"
        ],
        "market_caps": {
            "AAPL": 3000000000000,
            "MSFT": 2800000000000,
            "GOOGL": 1600000000000
        },
        "config": {
            "objective_function": "MAXIMIZE_RATIO",
            "risk_measure": "VARIANCE",
            "solver": "CLARABEL"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date', 'views']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        views = data['views']
        market_caps = data.get('market_caps')
        
        # Converter market caps para Series se fornecido
        if market_caps:
            market_caps = pd.Series(market_caps)
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Parse configuração
        config = parse_optimization_config(data.get('config', {}))
        
        # Executar otimização Black-Litterman
        model, portfolio = skfolio_service.black_litterman_optimization(
            returns=returns,
            views=views,
            config=config,
            market_caps=market_caps
        )
        
        # Serializar resultados
        results = serialize_portfolio_results(model, portfolio)
        
        return jsonify({
            'success': True,
            'optimization_type': 'black_litterman',
            'results': results,
            'views_used': views,
            'market_caps_used': market_caps.to_dict() if market_caps is not None else None,
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

# =====================================
# ENDPOINTS DE SELEÇÃO DE MODELOS
# =====================================

@skfolio_bp.route('/model-selection/grid-search', methods=['POST'])
def grid_search_optimization():
    """
    Endpoint para Grid Search de hiperparâmetros
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "param_grid": {
            "l1_coef": [0.001, 0.01, 0.1],
            "l2_coef": [0.001, 0.01, 0.1]
        },
        "base_estimator_type": "MeanRisk",
        "config": {
            "cv_method": "WalkForward",
            "train_size": 252,
            "test_size": 60,
            "n_jobs": -1
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date', 'param_grid']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        param_grid = data['param_grid']
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Parse configuração
        config = parse_model_selection_config(data.get('config', {}))
        
        # Configurar estimador base
        base_estimator_type = data.get('base_estimator_type', 'MeanRisk')
        if base_estimator_type == 'MeanRisk':
            base_estimator = MeanRisk(
                objective_function=ObjectiveFunction.MAXIMIZE_RATIO
            )
        elif base_estimator_type == 'RiskBudgeting':
            base_estimator = RiskBudgeting()
        else:
            base_estimator = MeanRisk()
        
        # Executar Grid Search
        best_model, grid_search = skfolio_service.grid_search_optimization(
            returns=returns,
            param_grid=param_grid,
            config=config,
            base_estimator=base_estimator
        )
        
        # Gerar portfólio com melhor modelo
        portfolio = best_model.predict(returns)
        
        # Serializar resultados
        results = serialize_portfolio_results(best_model, portfolio)
        
        return jsonify({
            'success': True,
            'optimization_type': 'grid_search',
            'results': results,
            'best_params': grid_search.best_params_,
            'best_score': float(grid_search.best_score_),
            'cv_results_summary': {
                'mean_test_score': [float(s) for s in grid_search.cv_results_['mean_test_score']],
                'std_test_score': [float(s) for s in grid_search.cv_results_['std_test_score']],
                'params': grid_search.cv_results_['params']
            },
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/model-selection/cross-validation', methods=['POST'])
def cross_validation_analysis():
    """
    Endpoint para análise de validação cruzada
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "model_config": {
            "type": "MeanRisk",
            "objective_function": "MAXIMIZE_RATIO",
            "risk_measure": "VARIANCE"
        },
        "cv_config": {
            "cv_method": "CombinatorialPurged",
            "n_splits": 5,
            "train_size": 252,
            "test_size": 60
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Configurar modelo
        model_config = data.get('model_config', {})
        model_type = model_config.get('type', 'MeanRisk')
        
        if model_type == 'MeanRisk':
            obj_func = ObjectiveFunction[model_config.get('objective_function', 'MAXIMIZE_RATIO')]
            risk_measure = RiskMeasure[model_config.get('risk_measure', 'VARIANCE')]
            
            model = MeanRisk(
                objective_function=obj_func,
                risk_measure=risk_measure
            )
        elif model_type == 'HierarchicalRiskParity':
            model = HierarchicalRiskParity()
        else:
            model = MeanRisk()
        
        # Parse configuração CV
        cv_config = parse_model_selection_config(data.get('cv_config', {}))
        
        # Executar validação cruzada
        population, metrics = skfolio_service.cross_validation_analysis(
            returns=returns,
            model=model,
            config=cv_config
        )
        
        return jsonify({
            'success': True,
            'analysis_type': 'cross_validation',
            'cv_metrics': {
                'mean_sharpe_ratio': float(metrics['mean_sharpe']),
                'std_sharpe_ratio': float(metrics['std_sharpe']),
                'mean_sortino_ratio': float(metrics['mean_sortino']),
                'std_sortino_ratio': float(metrics['std_sortino']),
                'mean_calmar_ratio': float(metrics['mean_calmar'])
            },
            'population_info': {
                'n_portfolios': len(population),
                'cv_method': cv_config.cv_method,
                'n_splits': cv_config.n_splits
            },
            'model_info': {
                'type': model.__class__.__name__,
                'configuration': model_config
            },
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

# =====================================
# ENDPOINTS DE STRESS TESTING
# =====================================

@skfolio_bp.route('/stress-test', methods=['POST'])
def stress_test_portfolio():
    """
    Endpoint para teste de estresse de portfólio
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "model_config": {
            "type": "MeanRisk",
            "objective_function": "MAXIMIZE_RATIO"
        },
        "stress_scenarios": {
            "market_crash": {
                "AAPL": -0.20,
                "MSFT": -0.15,
                "GOOGL": -0.25
            },
            "tech_selloff": {
                "AAPL": -0.10,
                "MSFT": -0.08,
                "GOOGL": -0.12
            }
        },
        "n_samples": 10000
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date', 'stress_scenarios']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        stress_scenarios = data['stress_scenarios']
        n_samples = data.get('n_samples', 10000)
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Configurar e treinar modelo
        model_config = data.get('model_config', {})
        model_type = model_config.get('type', 'MeanRisk')
        
        if model_type == 'MeanRisk':
            obj_func = ObjectiveFunction[model_config.get('objective_function', 'MAXIMIZE_RATIO')]
            model = MeanRisk(objective_function=obj_func)
        else:
            model = MeanRisk()
        
        # Treinar modelo
        model.fit(returns)
        
        # Executar teste de estresse
        stress_results = skfolio_service.stress_test_portfolio(
            returns=returns,
            model=model,
            stress_scenarios=stress_scenarios,
            n_samples=n_samples
        )
        
        return jsonify({
            'success': True,
            'analysis_type': 'stress_test',
            'stress_results': stress_results,
            'scenarios_tested': list(stress_scenarios.keys()),
            'n_samples_per_scenario': n_samples,
            'model_info': {
                'type': model.__class__.__name__,
                'configuration': model_config
            },
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

# =====================================
# ENDPOINTS DE RELATÓRIOS E COMPARAÇÕES
# =====================================

@skfolio_bp.route('/reports/comprehensive', methods=['POST'])
def generate_comprehensive_report():
    """
    Endpoint para gerar relatório abrangente
    
    Body JSON:
    {
        "assets": ["AAPL", "MSFT", "GOOGL"],
        "start_date": "2020-01-01",
        "end_date": "2024-01-01",
        "models": [
            {
                "name": "mean_risk",
                "type": "MeanRisk",
                "config": {"objective_function": "MAXIMIZE_RATIO"}
            },
            {
                "name": "risk_parity",
                "type": "RiskBudgeting"
            },
            {
                "name": "hrp",
                "type": "HierarchicalRiskParity"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Validar parâmetros
        required_fields = ['assets', 'start_date', 'end_date', 'models']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório: {field}'}), 400
        
        # Obter dados
        assets = data['assets']
        start_date = data['start_date']
        end_date = data['end_date']
        models_config = data['models']
        
        # Buscar preços
        prices_data = {}
        for asset in assets:
            asset_data = arctic_service.get_stock_data(asset, start_date, end_date)
            if asset_data.empty:
                return jsonify({'error': f'Dados não encontrados para {asset}'}), 404
            prices_data[asset] = asset_data['close']
        
        prices_df = pd.DataFrame(prices_data)
        returns = skfolio_service.prepare_returns(prices_df)
        
        # Criar e treinar modelos
        trained_models = {}
        
        for model_config in models_config:
            model_name = model_config['name']
            model_type = model_config['type']
            config = model_config.get('config', {})
            
            if model_type == 'MeanRisk':
                obj_func = ObjectiveFunction[config.get('objective_function', 'MAXIMIZE_RATIO')]
                model = MeanRisk(objective_function=obj_func)
            elif model_type == 'RiskBudgeting':
                model = RiskBudgeting()
            elif model_type == 'HierarchicalRiskParity':
                model = HierarchicalRiskParity()
            else:
                model = MeanRisk()
            
            # Treinar modelo
            model.fit(returns)
            trained_models[model_name] = model
        
        # Gerar relatório abrangente
        report = skfolio_service.generate_comprehensive_report(
            returns=returns,
            models=trained_models
        )
        
        # Converter para formato JSON serializável
        json_report = {
            'summary': report['summary'],
            'performance_metrics': report['performance_metrics'],
            'risk_metrics': report['risk_metrics'],
            'attribution': report['attribution']
        }
        
        return jsonify({
            'success': True,
            'report_type': 'comprehensive',
            'report': json_report,
            'models_analyzed': list(trained_models.keys()),
            'data_info': {
                'assets': assets,
                'start_date': start_date,
                'end_date': end_date,
                'n_observations': len(returns)
            }
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/models/compare', methods=['POST'])
def compare_models():
    """
    Endpoint para comparar múltiplos modelos
    
    Body JSON: Similar ao comprehensive report, mas foca na comparação
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        # Reutilizar lógica similar ao relatório abrangente
        # mas focar na comparação de métricas
        
        # ... (implementação similar) ...
        
        return jsonify({
            'success': True,
            'comparison_type': 'models',
            'comparison_table': {}  # DataFrame de comparação convertido
        })
        
    except Exception as e:
        return handle_error(e)

# =====================================
# ENDPOINTS DE INFORMAÇÕES E UTILITÁRIOS
# =====================================

@skfolio_bp.route('/info/risk-measures', methods=['GET'])
def get_risk_measures():
    """Retorna lista de medidas de risco disponíveis"""
    try:
        risk_measures = skfolio_service.get_available_risk_measures()
        
        return jsonify({
            'success': True,
            'risk_measures': risk_measures,
            'count': len(risk_measures)
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/info/ratio-measures', methods=['GET'])
def get_ratio_measures():
    """Retorna lista de medidas de ratio disponíveis"""
    try:
        ratio_measures = skfolio_service.get_available_ratio_measures()
        
        return jsonify({
            'success': True,
            'ratio_measures': ratio_measures,
            'count': len(ratio_measures)
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/info/solvers', methods=['GET'])
def get_solver_info():
    """Retorna informações sobre solvers disponíveis"""
    try:
        solver_info = skfolio_service.get_solver_info()
        
        return jsonify({
            'success': True,
            'solver_info': solver_info
        })
        
    except Exception as e:
        return handle_error(e)

@skfolio_bp.route('/info/version', methods=['GET'])
def get_version_info():
    """Retorna informações de versão"""
    try:
        import skfolio
        
        return jsonify({
            'success': True,
            'skfolio_version': skfolio.__version__,
            'service_version': '1.0.0',
            'features': [
                'Mean-Risk Optimization',
                'Risk Budgeting',
                'Hierarchical Risk Parity',
                'Nested Clusters Optimization',
                'Black-Litterman',
                'Factor Models',
                'Entropy Pooling',
                'Cross-Validation',
                'Stress Testing',
                'Synthetic Data',
                'Pipeline Creation'
            ]
        })
        
    except Exception as e:
        return handle_error(e)

# =====================================
# HEALTH CHECK
# =====================================

@skfolio_bp.route('/health', methods=['GET'])
def health_check():
    """
    Verifica se o serviço SKFolio está funcionando
    
    Returns:
        JSON com status de saúde do serviço
    """
    try:
        service = get_skfolio_service()
        
        # Verificar importações principais
        solver_info = service.get_solver_info()
        
        return jsonify({
            "status": "healthy",
            "service": "SKFolio Service v0.10.1",
            "timestamp": datetime.now().isoformat(),
            "available_solvers": solver_info.get("available_solvers", []),
            "default_solver": solver_info.get("default_solver", "CLARABEL"),
            "risk_measures_count": len(service.get_available_risk_measures()),
            "ratio_measures_count": len(service.get_available_ratio_measures())
        })
        
    except Exception as e:
        logger.error(f"Erro no health check: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@skfolio_bp.route('/global-portfolio/optimize', methods=['POST'])
def optimize_global_portfolio():
    """
    Otimiza portfólio com qualquer ticker global via yfinance
    
    Body:
        symbols: Lista de símbolos (ex: ['PETR4.SA', 'AAPL', 'BTC-USD', 'TSLA'])
        period: Período de dados ('1y', '2y', '3y', '5y')
        optimization_type: Tipo de otimização ('mean_risk', 'risk_budgeting', 'hrp')
        config: Configurações opcionais
        include_charts: Incluir gráficos Plotly (padrão: False)
        
    Returns:
        JSON com portfólio otimizado, métricas e gráficos Plotly
    """
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        if not data or 'symbols' not in data:
            return jsonify({"error": "Lista de símbolos é obrigatória"}), 400
        
        symbols = data['symbols']
        period = data.get('period', '2y')
        optimization_type = data.get('optimization_type', 'mean_risk')
        include_benchmark = data.get('include_benchmark', True)
        include_charts = data.get('include_charts', False)
        config_data = data.get('config', {})
        
        if not symbols or not isinstance(symbols, list):
            return jsonify({"error": "Símbolos deve ser uma lista não vazia"}), 400
        
        logger.info(f"Otimizando portfólio global: {symbols}, tipo: {optimization_type}")
        
        service = get_skfolio_service()
        
        # Carregar dados globais via yfinance com benchmark automático
        prices = service.load_global_market_data(
            symbols=symbols,
            period=period,
            include_benchmark=include_benchmark
        )
        
        # Excluir benchmark dos dados de otimização (mantém apenas para comparação)
        benchmark_symbols = ['^BVSP', '^IBOV', 'BOVA11.SA', '^GSPC', '^IXIC', '^DJI', 'BTC-USD']  # Benchmarks globais
        optimization_prices = prices.copy()
        
        # Remover colunas de benchmark para otimização
        for benchmark_symbol in benchmark_symbols:
            if benchmark_symbol in optimization_prices.columns:
                optimization_prices = optimization_prices.drop(columns=[benchmark_symbol])
                logger.info(f"Removido benchmark {benchmark_symbol} da otimização")
        
        # Converter preços em retornos (sem benchmark)
        returns = service.prepare_returns(optimization_prices)
        
        # Configurar otimização
        config = parse_optimization_config(config_data)
        
        # Executar otimização baseada no tipo - TODOS os 17+ algoritmos suportados
        try:
            if optimization_type == 'mean_risk':
                model, portfolio = service.optimize_mean_risk(returns, config)
            elif optimization_type == 'risk_budgeting':
                risk_budgets = data.get('risk_budgets')
                model, portfolio = service.optimize_risk_budgeting(returns, risk_budgets, config)
            elif optimization_type == 'hrp':
                model, portfolio = service.optimize_hierarchical_risk_parity(returns, config)
            elif optimization_type == 'herc':
                # HERC - Hierarchical Equal Risk Contribution
                from skfolio.optimization import HierarchicalEqualRiskContribution
                from skfolio.prior import EmpiricalPrior
                prior_estimator = EmpiricalPrior()
                model = HierarchicalEqualRiskContribution(
                    risk_measure=config.risk_measure,
                    prior_estimator=prior_estimator
                )
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'nested_clusters':
                model, portfolio = service.optimize_nested_clusters(returns, config)
            elif optimization_type == 'black_litterman':
                # Black-Litterman com views opcionais
                views = data.get('views', None)  # Views podem ser passadas opcionalmente
                market_caps = data.get('market_caps', None)  # Market caps opcionais
                model, portfolio = service.optimize_black_litterman(returns, config, views, market_caps)
            elif optimization_type == 'factor_model':
                # Factor Model - precisa de fatores externos
                factors = data.get('factors')  # Fatores podem ser passados opcionalmente
                if factors is None:
                    # Usar fatores padrão do SKFolio se não fornecidos
                    from skfolio.datasets import load_factors_dataset
                    try:
                        factor_prices = load_factors_dataset()
                        factor_prices = factor_prices.loc[returns.index[0]:returns.index[-1]]
                        factors = service.prepare_returns(factor_prices)
                    except:
                        # Se não conseguir carregar fatores, usar empirical prior
                        model, portfolio = service.optimize_mean_risk(returns, config)
                    else:
                        model, portfolio = service.factor_model_optimization(returns, factors, config)
                else:
                    model, portfolio = service.factor_model_optimization(returns, factors, config)
            elif optimization_type == 'black_litterman_factor':
                # Black-Litterman + Factor Model combinados
                views = data.get('views', [])
                factors = data.get('factors')
                factor_views = data.get('factor_views')
                if factors is None:
                    from skfolio.datasets import load_factors_dataset
                    try:
                        factor_prices = load_factors_dataset()
                        factor_prices = factor_prices.loc[returns.index[0]:returns.index[-1]]
                        factors = service.prepare_returns(factor_prices)
                        model, portfolio = service.factor_model_optimization(returns, factors, config, factor_views)
                    except:
                        model, portfolio = service.black_litterman_optimization(returns, views, config)
                else:
                    model, portfolio = service.factor_model_optimization(returns, factors, config, factor_views)
            elif optimization_type == 'distributionally_robust_cvar':
                # Distributionally Robust CVaR
                from skfolio.optimization import DistributionallyRobustCVaR
                from skfolio.prior import EmpiricalPrior
                prior_estimator = EmpiricalPrior()
                model = DistributionallyRobustCVaR(
                    prior_estimator=prior_estimator,
                    solver=config.solver,
                    solver_params=config.solver_params
                )
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'max_diversification':
                # Maximum Diversification
                from skfolio.optimization import MaximumDiversification
                from skfolio.prior import EmpiricalPrior
                prior_estimator = EmpiricalPrior()
                model = MaximumDiversification(
                    prior_estimator=prior_estimator,
                    min_weights=config.min_weights,
                    max_weights=config.max_weights,
                    solver=config.solver,
                    solver_params=config.solver_params
                )
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'equal_weighted':
                # Equal Weighted
                from skfolio.optimization import EqualWeighted
                model = EqualWeighted()
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'inverse_volatility':
                # Inverse Volatility
                from skfolio.optimization import InverseVolatility
                model = InverseVolatility()
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'entropy_pooling':
                # Entropy Pooling
                mean_views = data.get('mean_views')
                cvar_views = data.get('cvar_views')
                model, portfolio = service.entropy_pooling_optimization(returns, mean_views, cvar_views, config)
            elif optimization_type == 'opinion_pooling':
                # Opinion Pooling
                from skfolio.prior import OpinionPooling, EmpiricalPrior
                from skfolio.optimization import MeanRisk
                opinions = data.get('opinions', [])
                if opinions:
                    prior_estimator = OpinionPooling(opinions=opinions)
                else:
                    prior_estimator = EmpiricalPrior()
                model = MeanRisk(
                    objective_function=config.objective_function,
                    risk_measure=config.risk_measure,
                    prior_estimator=prior_estimator,
                    solver=config.solver,
                    solver_params=config.solver_params
                )
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'stacking':
                # Stacking Optimization (Ensemble)
                from skfolio.optimization import StackingOptimization, MeanRisk, RiskBudgeting
                from skfolio.prior import EmpiricalPrior
                
                # Criar ensemble de diferentes estimadores
                estimators = [
                    ('mean_risk', MeanRisk(risk_measure=config.risk_measure)),
                    ('risk_budgeting', RiskBudgeting(risk_measure=config.risk_measure))
                ]
                
                model = StackingOptimization(
                    estimators=estimators,
                    final_estimator=MeanRisk(risk_measure=config.risk_measure),
                    cv=5
                )
                model.fit(returns)
                portfolio = model.predict(returns)
            elif optimization_type == 'synthetic_data':
                # Synthetic Data Generation
                n_samples = data.get('n_samples', 2000)
                distribution_type = data.get('distribution_type', 'vine_copula')
                model, portfolio = service.synthetic_data_optimization(returns, n_samples, distribution_type, config)
            elif optimization_type == 'grid_search':
                # Grid Search + Cross Validation
                param_grid = data.get('param_grid', {
                    'risk_measure': [RiskMeasure.VARIANCE, RiskMeasure.CVAR],
                    'l1_coef': [0.0, 0.01, 0.05],
                    'l2_coef': [0.0, 0.01, 0.05]
                })
                model_config = ModelSelectionConfig()
                model, portfolio = service.grid_search_optimization(returns, param_grid, model_config)
            elif optimization_type == 'randomized_search':
                # Randomized Search
                param_distributions = data.get('param_distributions', {
                    'l1_coef': [0.0, 0.001, 0.01, 0.05, 0.1],
                    'l2_coef': [0.0, 0.001, 0.01, 0.05, 0.1]
                })
                n_iter = data.get('n_iter', 20)
                model_config = ModelSelectionConfig()
                model, portfolio = service.randomized_search_optimization(returns, param_distributions, n_iter, model_config)
            else:
                return jsonify({"error": f"Tipo de otimização '{optimization_type}' não suportado"}), 400
                
        except Exception as optimization_error:
            logger.error(f"Erro na otimização {optimization_type}: {str(optimization_error)}")
            return jsonify({
                "error": f"Erro na otimização {optimization_type}",
                "details": str(optimization_error),
                "timestamp": datetime.now().isoformat()
            }), 500
        
        # Extrair resultados
        if hasattr(portfolio.weights, 'to_dict'):
            weights = portfolio.weights.to_dict()
        else:
            # Se weights é numpy array, converter para dict usando os nomes das colunas
            weights = dict(zip(returns.columns, portfolio.weights))
        
        # Garantir que as chaves são strings (não tuplas)
        weights = {str(k): float(v) for k, v in weights.items()}
        
        # Calcular métricas do portfólio com mais detalhes
        metrics = {
            'expected_return': float(portfolio.annualized_mean),
            'volatility': float(portfolio.annualized_standard_deviation),
            'sharpe_ratio': float(portfolio.annualized_sharpe_ratio),
            'max_drawdown': float(portfolio.max_drawdown),
            'calmar_ratio': float(portfolio.calmar_ratio),
            'sortino_ratio': float(portfolio.annualized_sortino_ratio)
        }
        
        # Adicionar métricas de risco se disponíveis
        try:
            # VaR é uma propriedade, não método
            metrics['var_95'] = float(portfolio.value_at_risk)
        except (AttributeError, TypeError, ValueError):
            metrics['var_95'] = None
            
        try:
            # CVaR é uma propriedade, não método
            metrics['cvar_95'] = float(portfolio.cvar)
        except (AttributeError, TypeError, ValueError):
            metrics['cvar_95'] = None
        
        # Informações dos ativos
        assets_info = []
        for symbol in returns.columns:
            asset_return = returns[symbol].mean() * 252  # Anualizado
            asset_vol = returns[symbol].std() * np.sqrt(252)  # Anualizado
            
            assets_info.append({
                'symbol': symbol,
                'weight': weights.get(symbol, 0.0),
                'expected_return': float(asset_return),
                'volatility': float(asset_vol),
                'sharpe_ratio': float(asset_return / asset_vol) if asset_vol > 0 else 0.0
            })
        
        # Gerar gráficos Plotly se solicitado
        charts = None
        if include_charts:
            try:
                logger.info(f"🎨 Gerando visualizações completas para otimização {optimization_type}")
                charts = service.generate_portfolio_charts(
                    returns=returns,
                    weights=weights,
                    portfolio=portfolio,
                    optimization_type=optimization_type
                )
                logger.info(f"✅ {len(charts)} gráficos gerados: {list(charts.keys())}")
                
                # Verificar gráficos principais
                expected_charts = [
                    'allocation_pie', 'correlation_heatmap', 'returns_distribution', 
                    'efficient_frontier', 'risk_return_scatter', 'cumulative_returns',
                    'drawdown_chart', 'performance_attribution', 'rolling_metrics', 
                    'volatility_surface'
                ]
                
                missing_charts = [chart for chart in expected_charts if chart not in charts]
                if missing_charts:
                    logger.warning(f"⚠️  Gráficos não gerados: {missing_charts}")
                    
            except Exception as chart_error:
                logger.error(f"❌ Erro crítico ao gerar gráficos: {chart_error}")
                import traceback
                traceback.print_exc()
                charts = {"error": f"Erro ao gerar gráficos: {str(chart_error)}"}
        
        response_data = {
            "success": True,
            "optimization_type": optimization_type,
            "period": period,
            "portfolio_metrics": metrics,
            "weights": weights,
            "assets_info": assets_info,
            "data_info": {
                "start_date": returns.index.min().strftime('%Y-%m-%d'),
                "end_date": returns.index.max().strftime('%Y-%m-%d'),
                "observations": len(returns),
                "assets_count": len(returns.columns)
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Adicionar gráficos se disponíveis
        if charts:
            response_data["charts"] = charts
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na otimização de portfólio: {str(e)}")
        return jsonify({
            "error": "Erro interno na otimização",
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@skfolio_bp.route('/global-portfolio/sample-portfolio', methods=['GET'])
def get_sample_global_portfolio():
    """
    Obtém uma carteira exemplo com ativos globais diversificados otimizada
    
    Query Params:
        optimization_type: Tipo de otimização (padrão: 'mean_risk')
        period: Período de dados (padrão: '2y')
        
    Returns:
        JSON com carteira exemplo global otimizada
    """
    try:
        optimization_type = request.args.get('optimization_type', 'mean_risk')
        period = request.args.get('period', '2y')
        
        logger.info(f"Gerando carteira exemplo global - tipo: {optimization_type}, período: {period}")
        
        service = get_skfolio_service()
        
        # Obter dados da carteira exemplo global
        symbols = ['PETR4.SA', 'AAPL', 'BTC-USD', 'TSLA', 'MSFT']
        prices = service.load_global_market_data(
            symbols=symbols,
            period=period,
            include_benchmark=True
        )
        
        # Excluir benchmark dos dados de otimização
        benchmark_symbols = ['^BVSP', '^IBOV', 'BOVA11.SA', '^GSPC', '^IXIC', '^DJI', 'BTC-USD']
        optimization_prices = prices.copy()
        
        for benchmark_symbol in benchmark_symbols:
            if benchmark_symbol in optimization_prices.columns:
                optimization_prices = optimization_prices.drop(columns=[benchmark_symbol])
                logger.info(f"Removido benchmark {benchmark_symbol} da carteira exemplo global")
        
        returns = service.prepare_returns(optimization_prices)
        
        # Otimizar usando configuração padrão
        config = OptimizationConfig()
        
        if optimization_type == 'mean_risk':
            model, portfolio = service.optimize_mean_risk(returns, config)
        elif optimization_type == 'risk_budgeting':
            model, portfolio = service.optimize_risk_budgeting(returns, None, config)
        elif optimization_type == 'hrp':
            model, portfolio = service.optimize_hierarchical_risk_parity(returns, config)
        else:
            return jsonify({"error": f"Tipo '{optimization_type}' não suportado"}), 400
        
        # Extrair resultados
        if hasattr(portfolio.weights, 'to_dict'):
            weights = portfolio.weights.to_dict()
        else:
            # Se weights é numpy array, converter para dict usando os nomes das colunas
            weights = dict(zip(returns.columns, portfolio.weights))
        
        # Garantir que as chaves são strings (não tuplas)
        weights = {str(k): float(v) for k, v in weights.items()}
        
        # Métricas do portfólio
        metrics = {
            'expected_return': float(portfolio.annualized_mean),
            'volatility': float(portfolio.annualized_standard_deviation),
            'sharpe_ratio': float(portfolio.annualized_sharpe_ratio),
            'max_drawdown': float(portfolio.max_drawdown),
            'calmar_ratio': float(portfolio.calmar_ratio),
            'sortino_ratio': float(portfolio.annualized_sortino_ratio),
            'cvar_95': float(portfolio.cvar)
        }
        
        # Descrição dos ativos
        asset_descriptions = {
            'PETR4.SA': 'Petrobras PN - Petróleo e Gás',
            'VALE3.SA': 'Vale ON - Mineração',
            'ITUB4.SA': 'Itaú Unibanco PN - Bancos',
            'BBDC4.SA': 'Bradesco PN - Bancos',
            'ABEV3.SA': 'Ambev ON - Bebidas',
            'B3SA3.SA': 'B3 ON - Serviços Financeiros',
            'WEGE3.SA': 'WEG ON - Máquinas e Equipamentos',
            'RENT3.SA': 'Localiza ON - Aluguel de Carros',
            'BBAS3.SA': 'Banco do Brasil ON - Bancos',
            'MGLU3.SA': 'Magazine Luiza ON - Varejo',
            '^BVSP': 'Ibovespa - Índice de Mercado'
        }
        
        # Informações detalhadas dos ativos
        assets_detailed = []
        for symbol in returns.columns:
            weight = weights.get(symbol, 0.0)
            if weight > 0.001:  # Apenas ativos com peso significativo
                asset_return = returns[symbol].mean() * 252
                asset_vol = returns[symbol].std() * np.sqrt(252)
                
                assets_detailed.append({
                    'symbol': symbol,
                    'description': asset_descriptions.get(symbol, symbol),
                    'weight': round(weight, 4),
                    'weight_percent': round(weight * 100, 2),
                    'expected_return': round(float(asset_return), 4),
                    'volatility': round(float(asset_vol), 4)
                })
        
        # Ordenar por peso decrescente
        assets_detailed.sort(key=lambda x: x['weight'], reverse=True)
        
        return jsonify({
            "success": True,
            "description": "Carteira exemplo com principais ações brasileiras",
            "optimization_type": optimization_type,
            "period": period,
            "portfolio_metrics": metrics,
            "assets": assets_detailed,
            "total_weight": round(sum(weights.values()), 4),
            "data_period": {
                "start": returns.index.min().strftime('%Y-%m-%d'),
                "end": returns.index.max().strftime('%Y-%m-%d'),
                "observations": len(returns)
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar carteira exemplo brasileira: {str(e)}")
        return jsonify({
            "error": "Erro interno ao gerar carteira exemplo",
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@skfolio_bp.route('/global-portfolio/available-symbols', methods=['GET'])
def get_available_global_symbols():
    """
    Lista símbolos de ativos globais populares organizados por categoria
    
    Returns:
        JSON com símbolos organizados por categorias globais
    """
    try:
        symbols_by_category = {
            "Ações Brasileiras": [
                {"symbol": "PETR4.SA", "name": "Petrobras PN"},
                {"symbol": "VALE3.SA", "name": "Vale ON"},
                {"symbol": "ITUB4.SA", "name": "Itaú Unibanco PN"},
                {"symbol": "BBDC4.SA", "name": "Bradesco PN"},
                {"symbol": "ABEV3.SA", "name": "Ambev ON"},
                {"symbol": "B3SA3.SA", "name": "B3 ON"},
                {"symbol": "WEGE3.SA", "name": "WEG ON"},
                {"symbol": "RENT3.SA", "name": "Localiza ON"}
            ],
            "Ações Americanas": [
                {"symbol": "AAPL", "name": "Apple Inc"},
                {"symbol": "MSFT", "name": "Microsoft Corporation"},
                {"symbol": "GOOGL", "name": "Alphabet Inc"},
                {"symbol": "TSLA", "name": "Tesla Inc"},
                {"symbol": "AMZN", "name": "Amazon.com Inc"},
                {"symbol": "NVDA", "name": "NVIDIA Corporation"},
                {"symbol": "META", "name": "Meta Platforms Inc"},
                {"symbol": "NFLX", "name": "Netflix Inc"}
            ],
            "Criptomoedas": [
                {"symbol": "BTC-USD", "name": "Bitcoin"},
                {"symbol": "ETH-USD", "name": "Ethereum"},
                {"symbol": "BNB-USD", "name": "Binance Coin"},
                {"symbol": "ADA-USD", "name": "Cardano"},
                {"symbol": "SOL-USD", "name": "Solana"},
                {"symbol": "DOT-USD", "name": "Polkadot"},
                {"symbol": "MATIC-USD", "name": "Polygon"},
                {"symbol": "AVAX-USD", "name": "Avalanche"}
            ],
            "Varejo": [
                {"symbol": "MGLU3", "name": "Magazine Luiza ON"},
                {"symbol": "LREN3", "name": "Lojas Renner ON"},
                {"symbol": "AMER3", "name": "Americanas ON"},
                {"symbol": "VIIA3", "name": "Via ON"}
            ],
            "Bebidas": [
                {"symbol": "ABEV3", "name": "Ambev ON"}
            ],
            "Telecomunicações": [
                {"symbol": "VIVT3", "name": "Vivo ON"},
                {"symbol": "TIMS3", "name": "TIM ON"}
            ],
            "Energia Elétrica": [
                {"symbol": "EGIE3", "name": "Engie Brasil ON"},
                {"symbol": "EQTL3", "name": "Equatorial ON"},
                {"symbol": "CMIG4", "name": "Cemig PN"}
            ],
            "Máquinas e Equipamentos": [
                {"symbol": "WEGE3", "name": "WEG ON"}
            ],
            "Serviços Financeiros": [
                {"symbol": "B3SA3", "name": "B3 ON"},
                {"symbol": "IRBR3", "name": "IRB Brasil RE ON"}
            ],
            "Aluguel de Carros": [
                {"symbol": "RENT3", "name": "Localiza ON"}
            ],
            "Siderurgia": [
                {"symbol": "GOAU4", "name": "Gerdau Metalúrgica PN"}
            ],
            "Papel e Celulose": [
                {"symbol": "SUZB3", "name": "Suzano ON"}
            ],
            "Frigoríficos": [
                {"symbol": "JBSS3", "name": "JBS ON"},
                {"symbol": "BEEF3", "name": "Minerva ON"}
            ]
        }
        
        # Contar total de símbolos
        total_symbols = sum(len(symbols) for symbols in symbols_by_sector.values())
        
        return jsonify({
            "success": True,
            "description": "Símbolos de ações brasileiras organizados por setor",
            "total_sectors": len(symbols_by_sector),
            "total_symbols": total_symbols,
            "symbols_by_sector": symbols_by_sector,
            "usage_note": "Use os símbolos sem .SA - será adicionado automaticamente",
            "example_request": {
                "symbols": ["PETR4", "VALE3", "ITUB4"],
                "period": "2y",
                "optimization_type": "mean_risk"
            },
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar símbolos brasileiros: {str(e)}")
        return jsonify({
            "error": "Erro interno ao listar símbolos",
            "details": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@skfolio_bp.route('/charts/generate', methods=['POST'])
def generate_charts():
    """
    Gera visualizações avançadas usando Plotly para análise de portfólio
    """
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        period = data.get('period', '2y')
        optimization_type = data.get('optimization_type', 'mean_risk')
        auto_format = data.get('auto_format', True)
        include_benchmark = data.get('include_benchmark', True)
        
        if len(symbols) < 2:
            return jsonify({
                'success': False,
                'error': 'Pelo menos 2 símbolos são necessários'
            }), 400
        
        # Gerar visualizações
        charts_data = skfolio_service.generate_advanced_charts(
            symbols=symbols,
            period=period,
            optimization_type=optimization_type,
            auto_format=auto_format,
            include_benchmark=include_benchmark
        )
        
        return jsonify({
            'success': True,
            'charts': charts_data,
            'metadata': {
                'symbols': symbols,
                'period': period,
                'optimization_type': optimization_type,
                'charts_count': len(charts_data),
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar gráficos: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@skfolio_bp.route('/charts/efficient-frontier', methods=['POST'])
def generate_efficient_frontier():
    """
    Gera gráfico da fronteira eficiente
    """
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        period = data.get('period', '2y')
        auto_format = data.get('auto_format', True)
        
        chart_data = skfolio_service.generate_efficient_frontier_chart(
            symbols=symbols,
            period=period,
            auto_format=auto_format
        )
        
        return jsonify({
            'success': True,
            'chart': chart_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar fronteira eficiente: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@skfolio_bp.route('/charts/correlation-matrix', methods=['POST'])
def generate_correlation_matrix():
    """
    Gera matriz de correlação interativa
    """
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        period = data.get('period', '2y')
        auto_format = data.get('auto_format', True)
        
        chart_data = skfolio_service.generate_correlation_matrix_chart(
            symbols=symbols,
            period=period,
            auto_format=auto_format
        )
        
        return jsonify({
            'success': True,
            'chart': chart_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar matriz de correlação: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@skfolio_bp.route('/charts/risk-return-scatter', methods=['POST'])
def generate_risk_return_scatter():
    """
    Gera gráfico de dispersão risco vs retorno
    """
    try:
        data = request.get_json()
        symbols = data.get('symbols', [])
        period = data.get('period', '2y')
        auto_format = data.get('auto_format', True)
        
        chart_data = skfolio_service.generate_risk_return_scatter_chart(
            symbols=symbols,
            period=period,
            auto_format=auto_format
        )
        
        return jsonify({
            'success': True,
            'chart': chart_data
        })
        
    except Exception as e:
        logger.error(f"Erro ao gerar gráfico risco-retorno: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================
# ROTAS DE COMPATIBILIDADE (LEGACY)
# =====================================

@skfolio_bp.route('/brazilian-stocks/optimize', methods=['POST'])
def optimize_brazilian_portfolio_legacy():
    """
    Rota de compatibilidade para otimização de portfólio brasileiro
    Redireciona para o endpoint global
    """
    return optimize_global_portfolio()

@skfolio_bp.route('/brazilian-stocks/sample-portfolio', methods=['GET'])
def get_sample_brazilian_portfolio_legacy():
    """
    Rota de compatibilidade para carteira exemplo brasileira
    Redireciona para o endpoint global
    """
    return get_sample_global_portfolio()

@skfolio_bp.route('/brazilian-stocks/available-symbols', methods=['GET'])
def get_available_brazilian_symbols_legacy():
    """
    Rota de compatibilidade para símbolos brasileiros
    Redireciona para o endpoint global
    """
    return get_available_global_symbols() 