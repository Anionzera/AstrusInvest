from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional, Tuple, Union
from pydantic import BaseModel
import json
import numpy as np
from portfolio_optimizer import PortfolioOptimizer

router = APIRouter()

class OptimizePortfolioRequest(BaseModel):
    tickers: List[str]
    method: str = "max_sharpe"
    risk_free_rate: float = 0.1
    target_return: Optional[float] = None
    target_risk: Optional[float] = None
    min_weight: float = 0
    max_weight: float = 1
    period: str = "2y"
    asset_categories: Optional[Dict[str, str]] = None
    category_constraints: Optional[Dict[str, Tuple[float, float, float]]] = None
    use_ml_predictions: bool = False

class DiscreteAllocationRequest(BaseModel):
    tickers: List[str]
    total_value: float = 100000
    risk_free_rate: float = 0.1
    period: str = "2y"
    asset_categories: Optional[Dict[str, str]] = None
    category_constraints: Optional[Dict[str, Tuple[float, float, float]]] = None
    use_ml_predictions: bool = False

@router.post("/optimize")
async def optimize_portfolio(request: OptimizePortfolioRequest):
    try:
        # Inicializar o otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados
        data_loaded = optimizer.load_data(
            request.tickers, 
            periodo=request.period,
            asset_categories=request.asset_categories
        )
        
        if not data_loaded:
            raise HTTPException(
                status_code=400, 
                detail="Falha ao carregar dados dos ativos. Verifique os tickers informados."
            )
        
        # Definir limites de peso
        weight_bounds = (request.min_weight, request.max_weight)
        
        # Converter category_constraints de Dict para restrições esperadas pelo optimizer
        category_constraints = request.category_constraints
        
        # Otimizar portfólio
        result = optimizer.optimize_portfolio(
            method=request.method,
            risk_free_rate=request.risk_free_rate,
            target_return=request.target_return,
            target_risk=request.target_risk,
            weight_bounds=weight_bounds,
            category_constraints=category_constraints,
            use_ml_predictions=request.use_ml_predictions
        )
        
        if not result:
            raise HTTPException(
                status_code=400, 
                detail="Falha na otimização. Verifique os parâmetros informados."
            )
        
        # Converter arrays numpy para listas e valores de retorno para porcentagem
        if 'performance' in result:
            for key in result['performance']:
                if isinstance(result['performance'][key], (np.float64, np.float32, float)):
                    # Converter para porcentagem
                    result['performance'][key] = float(result['performance'][key] * 100)
        
        # Adicionar categoria dos ativos no resultado
        if request.asset_categories:
            result['asset_categories'] = request.asset_categories
            
        # Adicionar informação se usou ML nas predições
        result['used_ml_predictions'] = request.use_ml_predictions
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/discrete-allocation")
async def discrete_allocation(request: DiscreteAllocationRequest):
    try:
        # Inicializar o otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados
        data_loaded = optimizer.load_data(
            request.tickers, 
            periodo=request.period,
            asset_categories=request.asset_categories
        )
        
        if not data_loaded:
            raise HTTPException(
                status_code=400, 
                detail="Falha ao carregar dados dos ativos. Verifique os tickers informados."
            )
        
        # Otimizar portfólio
        optimize_result = optimizer.optimize_portfolio(
            risk_free_rate=request.risk_free_rate,
            category_constraints=request.category_constraints,
            use_ml_predictions=request.use_ml_predictions
        )
        
        if not optimize_result:
            raise HTTPException(
                status_code=400, 
                detail="Falha na otimização. Verifique os parâmetros informados."
            )
        
        # Calcular alocação discreta
        allocation_result = optimizer.get_discrete_allocation(request.total_value)
        
        if not allocation_result:
            raise HTTPException(
                status_code=400, 
                detail="Falha ao calcular alocação discreta."
            )
            
        # Adicionar informação se usou ML nas predições
        allocation_result['used_ml_predictions'] = request.use_ml_predictions
        
        return allocation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/efficient-frontier")
async def efficient_frontier(request: OptimizePortfolioRequest):
    try:
        # Inicializar o otimizador
        optimizer = PortfolioOptimizer()
        
        # Carregar dados
        data_loaded = optimizer.load_data(
            request.tickers, 
            periodo=request.period
        )
        
        if not data_loaded:
            raise HTTPException(
                status_code=400, 
                detail="Falha ao carregar dados dos ativos. Verifique os tickers informados."
            )
        
        # Se usar ML, treinar o modelo primeiro
        if request.use_ml_predictions:
            # Inicializar e treinar o preditor de ML
            from ml_return_predictor import MLReturnPredictor
            ml_predictor = MLReturnPredictor()
            ml_data_prepared = ml_predictor.prepare_data(optimizer.prices)
            
            if not ml_data_prepared:
                raise HTTPException(
                    status_code=400, 
                    detail="Falha ao preparar dados para Machine Learning."
                )
                
            # Atribuir o preditor ao otimizador
            optimizer.ml_predictor = ml_predictor
        
        # Gerar fronteira eficiente
        result = optimizer.generate_efficient_frontier(
            risk_free_rate=request.risk_free_rate
        )
        
        if not result:
            raise HTTPException(
                status_code=400, 
                detail="Falha ao gerar fronteira eficiente."
            )
        
        # Converter arrays numpy para listas
        for key in result:
            if isinstance(result[key], list):
                for i, item in enumerate(result[key]):
                    if isinstance(item, dict):
                        for k, v in item.items():
                            if isinstance(v, (np.float64, np.float32, float)):
                                result[key][i][k] = float(v * 100)  # Converter para porcentagem
            elif isinstance(result[key], dict):
                for k, v in result[key].items():
                    if isinstance(v, (np.float64, np.float32, float)):
                        result[key][k] = float(v * 100)  # Converter para porcentagem
        
        # Adicionar informação se usou ML nas predições
        result['used_ml_predictions'] = request.use_ml_predictions
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 