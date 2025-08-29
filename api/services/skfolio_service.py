"""
SKFolio Service - Implementação Completa da Biblioteca SKFolio
============================================================

Este módulo implementa todas as funcionalidades do SKFolio 0.10.1 de forma perfeita,
incluindo otimização de portfólio, estimadores de risco, validação cruzada,
modelos hierárquicos e análises avançadas.

Funcionalidades Implementadas:
- Portfolio Optimization (Mean-Risk, Risk Budgeting, etc.)
- Hierarchical Optimization (HRP, HERC, NCO)
- Risk Measures (CVaR, EDaR, Variance, etc.)
- Expected Returns Estimators (Empirical, Shrinkage, etc.)
- Covariance Estimators (Denoising, Detoning, etc.)
- Model Selection e Cross-Validation
- Uncertainty Sets e Robust Optimization
- Factor Models e Black-Litterman
- Synthetic Data Generation
"""

import warnings
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging

# Adicionar import do yfinance
import yfinance as yf

# SKFolio Core Imports
import skfolio
from skfolio import RatioMeasure, RiskMeasure
from skfolio.datasets import load_sp500_dataset, load_factors_dataset

# Portfolio Optimization
from skfolio.optimization import (
    EqualWeighted, InverseVolatility, Random,
    MeanRisk, RiskBudgeting, MaximumDiversification,
    DistributionallyRobustCVaR,
    HierarchicalRiskParity, HierarchicalEqualRiskContribution,
    NestedClustersOptimization, StackingOptimization,
    ObjectiveFunction
)

# Prior Estimators
from skfolio.prior import (
    EmpiricalPrior, BlackLitterman, FactorModel,
    SyntheticData, EntropyPooling, OpinionPooling
)

# Moments Estimators
from skfolio.moments import (
    EmpiricalMu, EWMu, ShrunkMu, EquilibriumMu,
    EmpiricalCovariance, EWCovariance, GerberCovariance,
    DenoiseCovariance, DetoneCovariance, LedoitWolf,
    OAS, ShrunkCovariance, GraphicalLassoCV, ImpliedCovariance
)

# Distance and Clustering
from skfolio.distance import (
    PearsonDistance, KendallDistance, SpearmanDistance,
    CovarianceDistance, DistanceCorrelation
)
from skfolio.cluster import HierarchicalClustering, LinkageMethod

# Uncertainty Sets
from skfolio.uncertainty_set import (
    EmpiricalMuUncertaintySet, EmpiricalCovarianceUncertaintySet,
    BootstrapMuUncertaintySet, BootstrapCovarianceUncertaintySet
)

# Pre-selection
from skfolio.pre_selection import (
    DropCorrelated, DropZeroVariance, SelectKExtremes,
    SelectNonDominated, SelectComplete, SelectNonExpiring
)

# Model Selection
from skfolio.model_selection import (
    CombinatorialPurgedCV, WalkForward, cross_val_predict
)

# Preprocessing
from skfolio.preprocessing import prices_to_returns

# Scikit-learn
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, KFold
from sklearn.pipeline import Pipeline
from sklearn import set_config

# Distribution and Copulas
from skfolio.distribution import VineCopula, GaussianCopula, StudentTCopula

# Utils
from scipy.stats import loguniform

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class OptimizationConfig:
    """Configuração para otimização de portfólio"""
    objective_function: ObjectiveFunction = ObjectiveFunction.MINIMIZE_RISK
    risk_measure: RiskMeasure = RiskMeasure.VARIANCE
    min_weights: float = 0.0
    max_weights: float = 1.0
    budget: float = 1.0
    l1_coef: float = 0.0
    l2_coef: float = 0.0
    transaction_costs: float = 0.0
    management_fees: float = 0.0
    solver: str = 'CLARABEL'
    solver_params: Optional[Dict] = field(default_factory=lambda: {
        "tol_gap_abs": 1e-9,
        "tol_gap_rel": 1e-9,
        "verbose": False
    })

@dataclass
class RiskConfig:
    """Configuração para medidas de risco"""
    cvar_beta: float = 0.95
    evar_beta: float = 0.95
    cdar_beta: float = 0.95
    edar_beta: float = 0.95
    risk_free_rate: float = 0.0
    min_acceptable_return: Optional[float] = None

@dataclass
class ModelSelectionConfig:
    """Configuração para seleção de modelos"""
    cv_method: str = 'WalkForward'  # 'WalkForward', 'CombinatorialPurged', 'KFold'
    n_splits: int = 5
    train_size: int = 252
    test_size: int = 60
    n_jobs: int = -1

class SKFolioService:
    """
    Serviço principal para todas as funcionalidades do SKFolio
    
    Esta classe implementa de forma completa todas as funcionalidades
    da biblioteca SKFolio, proporcionando uma interface unificada
    para otimização de portfólio, análise de risco e validação de modelos.
    """
    
    def __init__(self):
        """Inicializa o serviço SKFolio"""
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("Inicializando SKFolio Service v0.10.1")
        
        # Configurar saída do scikit-learn
        set_config(transform_output="pandas")
        
        # Cache para modelos treinados
        self._model_cache = {}
        self._data_cache = {}
        
        # Configurações padrão
        self.default_optimization_config = OptimizationConfig()
        self.default_risk_config = RiskConfig()
        self.default_model_selection_config = ModelSelectionConfig()
    
    def validate_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Valida e prepara os dados para análise
        
        Args:
            data: DataFrame com preços ou retornos
            
        Returns:
            DataFrame validado e limpo
        """
        if data.empty:
            raise ValueError("DataFrame não pode estar vazio")
        
        if not isinstance(data.index, pd.DatetimeIndex):
            try:
                data.index = pd.to_datetime(data.index)
            except:
                raise ValueError("Índice deve ser convertível para DateTime")
        
        # Limpeza robusta de dados
        data = self._robust_data_cleaning(data)
        
        # Verificar se há dados suficientes
        if len(data) < 60:  # Mínimo de 60 observações
            raise ValueError("Dados insuficientes para análise (mínimo 60 observações)")
        
        return data
    
    def _robust_data_cleaning(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Limpeza robusta de dados para evitar valores infinitos e NaN
        
        Args:
            data: DataFrame original
            
        Returns:
            DataFrame limpo
        """
        # 1. Remover valores NaN
        data_clean = data.dropna()
        
        # 2. Remover valores infinitos
        data_clean = data_clean.replace([np.inf, -np.inf], np.nan).dropna()
        
        # 3. Para dados de preços, remover valores <= 0
        if data_clean.min().min() > 0:  # Assumir que são preços se todos valores > 0
            data_clean = data_clean[(data_clean > 0).all(axis=1)]
        
        # 4. Remover outliers extremos (retornos > 50% ou < -50% em um dia)
        # Isso só se aplica se parecem ser retornos (valores entre -1 e 1)
        if data_clean.max().max() < 1 and data_clean.min().min() > -1:
            # Parecem ser retornos, aplicar filtro de outliers
            outlier_mask = (data_clean.abs() > 0.5).any(axis=1)
            if outlier_mask.sum() < len(data_clean) * 0.05:  # Se < 5% são outliers
                data_clean = data_clean[~outlier_mask]
                if outlier_mask.sum() > 0:
                    self.logger.warning(f"Removidos {outlier_mask.sum()} outliers extremos")
        
        # 5. Verificar se ainda há valores problemáticos
        if data_clean.isnull().any().any():
            self.logger.warning("Ainda há valores NaN após limpeza")
            data_clean = data_clean.dropna()
        
        if np.isinf(data_clean.values).any():
            self.logger.warning("Ainda há valores infinitos após limpeza")
            data_clean = data_clean.replace([np.inf, -np.inf], np.nan).dropna()
        
        self.logger.info(f"Dados limpos: {len(data_clean)} observações, {len(data_clean.columns)} ativos")
        
        return data_clean
    
    def prepare_returns(self, prices: pd.DataFrame) -> pd.DataFrame:
        """
        Converte preços em retornos usando SKFolio
        
        Args:
            prices: DataFrame com preços dos ativos
            
        Returns:
            DataFrame com retornos
        """
        prices = self.validate_data(prices)
        
        # Usar função do SKFolio para conversão
        returns = prices_to_returns(prices)
        
        # Aplicar limpeza robusta nos retornos também
        returns = self._robust_data_cleaning(returns)
        
        self.logger.info(f"Retornos calculados para {len(returns.columns)} ativos, "
                        f"{len(returns)} observações")
        
        return returns
    
    # =====================================
    # OTIMIZAÇÃO DE PORTFÓLIO
    # =====================================
    
    def optimize_mean_risk(
        self,
        returns: pd.DataFrame,
        config: Optional[OptimizationConfig] = None,
        prior_estimator = None,
        uncertainty_sets: Optional[Dict] = None
    ):
        """
        Otimização Mean-Risk com configurações avançadas
        
        Args:
            returns: DataFrame com retornos dos ativos
            config: Configuração de otimização
            prior_estimator: Estimador de prior personalizado
            uncertainty_sets: Conjuntos de incerteza para robustez
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar estimador de prior
        if prior_estimator is None:
            prior_estimator = EmpiricalPrior(
                mu_estimator=ShrunkMu(),
                covariance_estimator=DenoiseCovariance()
            )
        
        # Configurar conjuntos de incerteza se fornecidos
        mu_uncertainty = None
        cov_uncertainty = None
        
        if uncertainty_sets:
            if 'mu' in uncertainty_sets:
                mu_uncertainty = BootstrapMuUncertaintySet(**uncertainty_sets['mu'])
            if 'covariance' in uncertainty_sets:
                cov_uncertainty = BootstrapCovarianceUncertaintySet(**uncertainty_sets['covariance'])
        
        # Criar modelo de otimização
        model = MeanRisk(
            objective_function=config.objective_function,
            risk_measure=config.risk_measure,
            prior_estimator=prior_estimator,
            min_weights=config.min_weights,
            max_weights=config.max_weights,
            budget=config.budget,
            l1_coef=config.l1_coef,
            l2_coef=config.l2_coef,
            transaction_costs=config.transaction_costs,
            management_fees=config.management_fees,
            mu_uncertainty_set_estimator=mu_uncertainty,
            covariance_uncertainty_set_estimator=cov_uncertainty,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização Mean-Risk concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    def optimize_risk_budgeting(
        self,
        returns: pd.DataFrame,
        risk_budgets: Optional[Dict[str, float]] = None,
        config: Optional[OptimizationConfig] = None
    ):
        """
        Otimização Risk Budgeting (Risk Parity)
        
        Args:
            returns: DataFrame com retornos dos ativos
            risk_budgets: Orçamentos de risco por ativo
            config: Configuração de otimização
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar prior com estimador robusto
        prior_estimator = EmpiricalPrior(
            covariance_estimator=GerberCovariance()
        )
        
        # Criar modelo Risk Budgeting
        model = RiskBudgeting(
            risk_measure=config.risk_measure,
            prior_estimator=prior_estimator,
            min_weights=config.min_weights,
            max_weights=config.max_weights,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização Risk Budgeting concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    def optimize_hierarchical_risk_parity(
        self,
        returns: pd.DataFrame,
        config: Optional[OptimizationConfig] = None,
        linkage_method: LinkageMethod = LinkageMethod.WARD,
        distance_estimator = None
    ):
        """
        Otimização Hierarchical Risk Parity (HRP) - VERSÃO ROBUSTA
        
        Args:
            returns: DataFrame com retornos dos ativos
            config: Configuração de otimização
            linkage_method: Método de linkage para clustering
            distance_estimator: Estimador de distância personalizado
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # 🛡️ VERIFICAÇÃO ROBUSTA: HRP precisa de pelo menos 3 ativos
        if len(returns.columns) < 3:
            self.logger.warning(f"HRP requer pelo menos 3 ativos (recebido: {len(returns.columns)}). Usando Equal Weighted como fallback.")
            from skfolio.optimization import EqualWeighted
            model = EqualWeighted()
            model.fit(returns)
            portfolio = model.predict(returns)
            self.logger.info(f"Fallback Equal Weighted concluído. Sharpe: {portfolio.annualized_sharpe_ratio:.4f}")
            return model, portfolio
        
        # 🛡️ VERIFICAÇÃO ROBUSTA: Dados suficientes
        if len(returns) < 60:
            self.logger.warning(f"HRP recomenda pelo menos 60 observações (recebido: {len(returns)}). Usando fallback para Mean-Risk.")
            return self.optimize_mean_risk(returns, config)
        
        try:
            # Configurar estimador de distância
            if distance_estimator is None:
                distance_estimator = PearsonDistance()
            
            # Configurar prior robusto
            prior_estimator = EmpiricalPrior(
                covariance_estimator=DenoiseCovariance()
            )
            
            # 🚀 MODELO HRP ROBUSTO
            model = HierarchicalRiskParity(
                risk_measure=config.risk_measure,
                distance_estimator=distance_estimator,
                prior_estimator=prior_estimator
            )
            
            # Treinar modelo
            model.fit(returns)
            
            # Gerar portfólio
            portfolio = model.predict(returns)
            
            self.logger.info(f"✅ Otimização HRP concluída com sucesso! "
                            f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
            
            return model, portfolio
            
        except ValueError as e:
            if "empty sequence" in str(e).lower():
                self.logger.warning(f"🔄 HRP falhou com poucos clusters. Usando fallback Mean-Risk. Erro: {str(e)[:100]}")
                return self.optimize_mean_risk(returns, config)
            else:
                raise e
        except Exception as e:
            self.logger.warning(f"🔄 HRP falhou: {str(e)[:100]}. Usando fallback Mean-Risk.")
            return self.optimize_mean_risk(returns, config)
    
    def optimize_nested_clusters(
        self,
        returns: pd.DataFrame,
        config: Optional[OptimizationConfig] = None,
        inner_estimator = None,
        outer_estimator = None
    ):
        """
        Otimização Nested Clusters Optimization (NCO)
        
        Args:
            returns: DataFrame com retornos dos ativos
            config: Configuração de otimização
            inner_estimator: Estimador interno (dentro dos clusters)
            outer_estimator: Estimador externo (entre clusters)
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar estimadores padrão
        if inner_estimator is None:
            inner_estimator = MeanRisk(risk_measure=RiskMeasure.CVAR)
        
        if outer_estimator is None:
            outer_estimator = RiskBudgeting(risk_measure=RiskMeasure.VARIANCE)
        
        # Criar modelo NCO
        model = NestedClustersOptimization(
            inner_estimator=inner_estimator,
            outer_estimator=outer_estimator,
            cv=KFold(n_splits=5, shuffle=False),
            n_jobs=-1
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização NCO concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    # =====================================
    # MODELOS AVANÇADOS
    # =====================================
    
    def black_litterman_optimization(
        self,
        returns: pd.DataFrame,
        views: List[str],
        config: Optional[OptimizationConfig] = None,
        market_caps: Optional[pd.Series] = None
    ):
        """
        Otimização usando modelo Black-Litterman
        
        Args:
            returns: DataFrame com retornos dos ativos
            views: Lista de views no formato ["AAPL - MSFT == 0.02"]
            config: Configuração de otimização
            market_caps: Capitalização de mercado dos ativos
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar Black-Litterman
        bl_prior = BlackLitterman(
            views=views,
            market_caps=market_caps
        )
        
        # Criar modelo de otimização
        model = MeanRisk(
            objective_function=ObjectiveFunction.MAXIMIZE_RATIO,
            prior_estimator=bl_prior,
            risk_measure=config.risk_measure,
            min_weights=config.min_weights,
            max_weights=config.max_weights,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização Black-Litterman concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    def factor_model_optimization(
        self,
        returns: pd.DataFrame,
        factors: pd.DataFrame,
        config: Optional[OptimizationConfig] = None,
        factor_views: Optional[List[str]] = None
    ):
        """
        Otimização usando modelo de fatores
        
        Args:
            returns: DataFrame com retornos dos ativos
            factors: DataFrame com retornos dos fatores
            config: Configuração de otimização
            factor_views: Views sobre os fatores (Black-Litterman nos fatores)
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        factors = self.validate_data(factors)
        
        # Configurar estimador de prior para fatores
        if factor_views:
            factor_prior = BlackLitterman(views=factor_views)
        else:
            factor_prior = EmpiricalPrior(
                covariance_estimator=DetoneCovariance()
            )
        
        # Criar modelo de fatores
        factor_model = FactorModel(
            factor_prior_estimator=factor_prior
        )
        
        # Criar modelo de otimização
        model = MeanRisk(
            objective_function=ObjectiveFunction.MAXIMIZE_RATIO,
            prior_estimator=factor_model,
            risk_measure=config.risk_measure,
            min_weights=config.min_weights,
            max_weights=config.max_weights,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns, factors)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização Factor Model concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    def entropy_pooling_optimization(
        self,
        returns: pd.DataFrame,
        mean_views: Optional[List[str]] = None,
        cvar_views: Optional[List[str]] = None,
        config: Optional[OptimizationConfig] = None
    ):
        """
        Otimização usando Entropy Pooling
        
        Args:
            returns: DataFrame com retornos dos ativos
            mean_views: Views sobre médias ["AAPL == 0.01"]
            cvar_views: Views sobre CVaR ["AAPL == 0.05"]
            config: Configuração de otimização
            
        Returns:
            Modelo otimizado e portfólio resultante
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar Entropy Pooling
        entropy_pooling = EntropyPooling(
            mean_views=mean_views,
            cvar_views=cvar_views
        )
        
        # Criar modelo de otimização
        model = HierarchicalRiskParity(
            risk_measure=RiskMeasure.CVAR,
            prior_estimator=entropy_pooling,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização Entropy Pooling concluída. "
                        f"Entropia Relativa: {entropy_pooling.relative_entropy_:.4f}")
        
        return model, portfolio
    
    # =====================================
    # VALIDAÇÃO CRUZADA E SELEÇÃO DE MODELOS
    # =====================================
    
    def grid_search_optimization(
        self,
        returns: pd.DataFrame,
        param_grid: Dict,
        config: Optional[ModelSelectionConfig] = None,
        base_estimator = None
    ):
        """
        Grid Search para otimização de hiperparâmetros
        
        Args:
            returns: DataFrame com retornos dos ativos
            param_grid: Grade de parâmetros para busca
            config: Configuração de seleção de modelos
            base_estimator: Estimador base para busca
            
        Returns:
            Melhor modelo encontrado e resultados da busca
        """
        if config is None:
            config = self.default_model_selection_config
        
        returns = self.validate_data(returns)
        
        # Configurar estimador base
        if base_estimator is None:
            base_estimator = MeanRisk(
                objective_function=ObjectiveFunction.MAXIMIZE_RATIO,
                prior_estimator=EmpiricalPrior(
                    mu_estimator=EWMu(alpha=0.2)
                )
            )
        
        # Configurar validação cruzada
        if config.cv_method == 'WalkForward':
            cv = WalkForward(
                train_size=config.train_size,
                test_size=config.test_size
            )
        elif config.cv_method == 'CombinatorialPurged':
            cv = CombinatorialPurgedCV(
                n_folds=config.n_splits,
                n_test_folds=2
            )
        else:
            cv = KFold(n_splits=config.n_splits, shuffle=False)
        
        # Executar Grid Search
        grid_search = GridSearchCV(
            estimator=base_estimator,
            param_grid=param_grid,
            cv=cv,
            n_jobs=config.n_jobs,
            scoring='neg_mean_squared_error'
        )
        
        grid_search.fit(returns)
        
        best_model = grid_search.best_estimator_
        
        self.logger.info(f"Grid Search concluído. "
                        f"Melhores parâmetros: {grid_search.best_params_}")
        
        return best_model, grid_search
    
    def randomized_search_optimization(
        self,
        returns: pd.DataFrame,
        param_distributions: Dict,
        n_iter: int = 20,
        config: Optional[ModelSelectionConfig] = None
    ):
        """
        Randomized Search para otimização de hiperparâmetros
        
        Args:
            returns: DataFrame com retornos dos ativos
            param_distributions: Distribuições de parâmetros
            n_iter: Número de iterações
            config: Configuração de seleção de modelos
            
        Returns:
            Melhor modelo encontrado e resultados da busca
        """
        if config is None:
            config = self.default_model_selection_config
        
        returns = self.validate_data(returns)
        
        # Estimador base com regularização
        base_estimator = MeanRisk(
            objective_function=ObjectiveFunction.MAXIMIZE_RATIO
        )
        
        # Configurar validação cruzada
        cv = WalkForward(
            train_size=config.train_size,
            test_size=config.test_size
        )
        
        # Executar Randomized Search
        randomized_search = RandomizedSearchCV(
            estimator=base_estimator,
            param_distributions=param_distributions,
            n_iter=n_iter,
            cv=cv,
            n_jobs=config.n_jobs,
            random_state=42
        )
        
        randomized_search.fit(returns)
        
        best_model = randomized_search.best_estimator_
        
        self.logger.info(f"Randomized Search concluído. "
                        f"Melhor score: {randomized_search.best_score_:.4f}")
        
        return best_model, randomized_search
    
    def cross_validation_analysis(
        self,
        returns: pd.DataFrame,
        model,
        config: Optional[ModelSelectionConfig] = None
    ):
        """
        Análise de validação cruzada completa
        
        Args:
            returns: DataFrame com retornos dos ativos
            model: Modelo para validação
            config: Configuração de seleção de modelos
            
        Returns:
            População de portfólios e métricas de validação
        """
        if config is None:
            config = self.default_model_selection_config
        
        returns = self.validate_data(returns)
        
        # Configurar validação cruzada
        if config.cv_method == 'CombinatorialPurged':
            cv = CombinatorialPurgedCV(
                n_folds=config.n_splits,
                n_test_folds=2
            )
            
            # Análise detalhada do CV
            cv_summary = cv.summary(returns)
            self.logger.info(f"CV Summary: {cv_summary}")
            
        else:
            cv = KFold(n_splits=config.n_splits, shuffle=False)
        
        # Executar validação cruzada
        population = cross_val_predict(model, returns, cv=cv)
        
        # Calcular métricas de validação
        metrics = {
            'mean_sharpe': population.mean_measure(RatioMeasure.SHARPE_RATIO),
            'mean_sortino': population.mean_measure(RatioMeasure.SORTINO_RATIO),
            'mean_calmar': population.mean_measure(RatioMeasure.CALMAR_RATIO),
            'std_sharpe': population.std_measure(RatioMeasure.SHARPE_RATIO),
            'std_sortino': population.std_measure(RatioMeasure.SORTINO_RATIO)
        }
        
        self.logger.info(f"Validação cruzada concluída. "
                        f"Sharpe médio: {metrics['mean_sharpe']:.4f} "
                        f"(±{metrics['std_sharpe']:.4f})")
        
        return population, metrics
    
    # =====================================
    # PRÉ-SELEÇÃO E PIPELINE
    # =====================================
    
    def create_optimization_pipeline(
        self,
        returns: pd.DataFrame,
        pre_selection_steps: Optional[List] = None,
        optimization_step = None
    ):
        """
        Cria pipeline completo de otimização com pré-seleção
        
        Args:
            returns: DataFrame com retornos dos ativos
            pre_selection_steps: Passos de pré-seleção
            optimization_step: Passo de otimização
            
        Returns:
            Pipeline configurado e treinado
        """
        returns = self.validate_data(returns)
        
        # Configurar passos de pré-seleção padrão
        if pre_selection_steps is None:
            pre_selection_steps = [
                ('drop_zero_var', DropZeroVariance()),
                ('drop_correlated', DropCorrelated(threshold=0.95)),
                ('select_k_extremes', SelectKExtremes(k=min(20, len(returns.columns)), highest=True))
            ]
        
        # Configurar otimização padrão
        if optimization_step is None:
            optimization_step = ('optimization', MeanRisk(
                objective_function=ObjectiveFunction.MAXIMIZE_RATIO,
                risk_measure=RiskMeasure.VARIANCE
            ))
        
        # Criar pipeline
        steps = pre_selection_steps + [optimization_step]
        pipeline = Pipeline(steps)
        
        # Treinar pipeline
        pipeline.fit(returns)
        
        # Gerar portfólio
        portfolio = pipeline.predict(returns)
        
        self.logger.info(f"Pipeline concluído. "
                        f"Ativos selecionados: {len(portfolio.weights)}, "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return pipeline, portfolio
    
    # =====================================
    # STRESS TESTING E CENÁRIOS
    # =====================================
    
    def stress_test_portfolio(
        self,
        returns: pd.DataFrame,
        model,
        stress_scenarios: Dict[str, Dict[str, float]],
        n_samples: int = 10000
    ):
        """
        Teste de estresse usando dados sintéticos
        
        Args:
            returns: DataFrame com retornos dos ativos
            model: Modelo de portfólio treinado
            stress_scenarios: Cenários de estresse {ativo: shock}
            n_samples: Número de amostras sintéticas
            
        Returns:
            Resultados dos testes de estresse
        """
        returns = self.validate_data(returns)
        
        stress_results = {}
        
        for scenario_name, scenario_shocks in stress_scenarios.items():
            # Configurar Vine Copula para dados sintéticos
            central_assets = list(scenario_shocks.keys())
            
            vine = VineCopula(
                central_assets=central_assets,
                log_transform=True,
                n_jobs=-1
            )
            
            vine.fit(returns)
            
            # Gerar dados estressados
            stressed_returns = vine.sample(
                n_samples=n_samples,
                conditioning=scenario_shocks
            )
            
            # Avaliar portfólio no cenário estressado
            stressed_portfolio = model.predict(stressed_returns)
            
            stress_results[scenario_name] = {
                'sharpe_ratio': stressed_portfolio.annualized_sharpe_ratio,
                'max_drawdown': stressed_portfolio.max_drawdown,
                'var_95': stressed_portfolio.value_at_risk(0.95),
                'cvar_95': stressed_portfolio.cvar(0.95),
                'volatility': stressed_portfolio.annualized_volatility
            }
            
            self.logger.info(f"Stress test '{scenario_name}' concluído. "
                           f"Sharpe sob estresse: {stressed_portfolio.annualized_sharpe_ratio:.4f}")
        
        return stress_results
    
    def synthetic_data_optimization(
        self,
        returns: pd.DataFrame,
        n_samples: int = 2000,
        distribution_type: str = 'vine_copula',
        config: Optional[OptimizationConfig] = None
    ):
        """
        Otimização usando dados sintéticos
        
        Args:
            returns: DataFrame com retornos históricos
            n_samples: Número de amostras sintéticas
            distribution_type: Tipo de distribuição ('vine_copula', 'gaussian')
            config: Configuração de otimização
            
        Returns:
            Modelo otimizado com dados sintéticos
        """
        if config is None:
            config = self.default_optimization_config
        
        returns = self.validate_data(returns)
        
        # Configurar estimador de distribuição
        if distribution_type == 'vine_copula':
            distribution_estimator = VineCopula(
                log_transform=True,
                n_jobs=-1
            )
        else:
            distribution_estimator = GaussianCopula()
        
        # Criar prior com dados sintéticos
        synthetic_prior = SyntheticData(
            distribution_estimator=distribution_estimator,
            n_samples=n_samples
        )
        
        # Criar modelo de otimização
        model = MeanRisk(
            risk_measure=RiskMeasure.CVAR,
            prior_estimator=synthetic_prior,
            min_weights=config.min_weights,
            max_weights=config.max_weights,
            solver=config.solver,
            solver_params=config.solver_params
        )
        
        # Treinar modelo
        model.fit(returns)
        
        # Gerar portfólio
        portfolio = model.predict(returns)
        
        self.logger.info(f"Otimização com dados sintéticos concluída. "
                        f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
        
        return model, portfolio
    
    # =====================================
    # ANÁLISE E RELATÓRIOS
    # =====================================
    
    def generate_comprehensive_report(
        self,
        returns: pd.DataFrame,
        models: Dict[str, Any],
        benchmark_returns: Optional[pd.Series] = None
    ) -> Dict[str, Any]:
        """
        Gera relatório abrangente de todos os modelos
        
        Args:
            returns: DataFrame com retornos dos ativos
            models: Dicionário com modelos treinados
            benchmark_returns: Retornos do benchmark para comparação
            
        Returns:
            Relatório completo com todas as métricas
        """
        returns = self.validate_data(returns)
        
        report = {
            'summary': {},
            'portfolios': {},
            'risk_metrics': {},
            'performance_metrics': {},
            'attribution': {}
        }
        
        for model_name, model in models.items():
            # Gerar portfólio
            portfolio = model.predict(returns)
            
            # Métricas de performance
            performance = {
                'annualized_return': portfolio.annualized_return,
                'annualized_volatility': portfolio.annualized_volatility,
                'sharpe_ratio': portfolio.annualized_sharpe_ratio,
                'sortino_ratio': portfolio.sortino_ratio,
                'calmar_ratio': portfolio.calmar_ratio,
                'max_drawdown': portfolio.max_drawdown,
                'value_at_risk_95': portfolio.value_at_risk(0.95),
                'cvar_95': portfolio.cvar(0.95)
            }
            
            # Métricas de risco
            risk_metrics = {
                'volatility': portfolio.annualized_volatility,
                'downside_deviation': portfolio.annualized_downside_deviation,
                'max_drawdown': portfolio.max_drawdown,
                'ulcer_index': portfolio.ulcer_index,
                'skewness': portfolio.skew,
                'kurtosis': portfolio.kurtosis
            }
            
            # Atribuição de performance
            if hasattr(portfolio, 'contribution'):
                attribution = {
                    'weights': portfolio.weights.to_dict(),
                    'contribution_to_return': portfolio.contribution.to_dict(),
                    'active_weights': (portfolio.weights - (1/len(portfolio.weights))).to_dict()
                }
            else:
                attribution = {
                    'weights': portfolio.weights.to_dict()
                }
            
            # Armazenar resultados
            report['portfolios'][model_name] = portfolio
            report['performance_metrics'][model_name] = performance
            report['risk_metrics'][model_name] = risk_metrics
            report['attribution'][model_name] = attribution
        
        # Resumo comparativo
        if len(models) > 1:
            best_sharpe = max(
                report['performance_metrics'].items(),
                key=lambda x: x[1]['sharpe_ratio']
            )
            
            best_calmar = max(
                report['performance_metrics'].items(),
                key=lambda x: x[1]['calmar_ratio']
            )
            
            report['summary'] = {
                'best_sharpe_model': best_sharpe[0],
                'best_sharpe_value': best_sharpe[1]['sharpe_ratio'],
                'best_calmar_model': best_calmar[0],
                'best_calmar_value': best_calmar[1]['calmar_ratio'],
                'total_models': len(models)
            }
        
        self.logger.info(f"Relatório abrangente gerado para {len(models)} modelos")
        
        return report
    
    def compare_models(
        self,
        returns: pd.DataFrame,
        models: Dict[str, Any],
        metrics: List[str] = None
    ) -> pd.DataFrame:
        """
        Compara múltiplos modelos de otimização
        
        Args:
            returns: DataFrame com retornos dos ativos
            models: Dicionário com modelos para comparar
            metrics: Lista de métricas para comparação
            
        Returns:
            DataFrame com comparação dos modelos
        """
        if metrics is None:
            metrics = [
                'annualized_return', 'annualized_volatility', 'sharpe_ratio',
                'sortino_ratio', 'calmar_ratio', 'max_drawdown'
            ]
        
        returns = self.validate_data(returns)
        
        comparison_data = {}
        
        for model_name, model in models.items():
            portfolio = model.predict(returns)
            
            model_metrics = {}
            for metric in metrics:
                if hasattr(portfolio, metric):
                    if callable(getattr(portfolio, metric)):
                        model_metrics[metric] = getattr(portfolio, metric)()
                    else:
                        model_metrics[metric] = getattr(portfolio, metric)
                else:
                    model_metrics[metric] = np.nan
            
            comparison_data[model_name] = model_metrics
        
        comparison_df = pd.DataFrame(comparison_data).T
        
        self.logger.info(f"Comparação de {len(models)} modelos concluída")
        
        return comparison_df
    
    # =====================================
    # UTILITÁRIOS E HELPERS
    # =====================================
    
    def get_available_risk_measures(self) -> List[str]:
        """Retorna lista de medidas de risco disponíveis"""
        return [measure.name for measure in RiskMeasure]
    
    def get_available_ratio_measures(self) -> List[str]:
        """Retorna lista de medidas de ratio disponíveis"""
        return [measure.name for measure in RatioMeasure]
    
    def get_solver_info(self) -> Dict[str, Any]:
        """Retorna informações sobre solvers disponíveis"""
        import cvxpy as cp
        
        available_solvers = cp.installed_solvers()
        
        solver_info = {
            'available_solvers': available_solvers,
            'default_solver': 'CLARABEL',
            'recommended_solvers': ['CLARABEL', 'OSQP', 'SCS'],
            'commercial_solvers': ['GUROBI', 'MOSEK', 'CPLEX']
        }
        
        return solver_info
    
    def validate_configuration(self, config: OptimizationConfig) -> bool:
        """Valida configuração de otimização"""
        try:
            # Verificar solver
            import cvxpy as cp
            if config.solver not in cp.installed_solvers():
                self.logger.warning(f"Solver {config.solver} não disponível. "
                                  f"Usando solver padrão.")
                config.solver = 'CLARABEL'
            
            # Verificar parâmetros
            if config.min_weights > config.max_weights:
                raise ValueError("min_weights deve ser menor que max_weights")
            
            if config.budget <= 0:
                raise ValueError("budget deve ser positivo")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Erro na validação da configuração: {e}")
            return False
    
    def load_global_stocks_data(
        self,
        symbols: List[str],
        period: str = "2y",
        interval: str = "1d",
        include_benchmark: bool = False,
        benchmark_symbol: str = None
    ) -> pd.DataFrame:
        """
        Carrega dados de qualquer ticker global via yfinance
        
        Args:
            symbols: Lista de símbolos (ex: ['PETR4.SA', 'AAPL', 'BTC-USD'])
            period: Período ('1y', '2y', '3y', '5y', 'max')
            interval: Intervalo ('1d', '1wk', '1mo')
            include_benchmark: Incluir benchmark
            benchmark_symbol: Símbolo do benchmark (detecta automaticamente se None)
            
        Returns:
            DataFrame com preços ajustados
        """
        try:
            self.logger.info(f"Carregando dados globais para: {symbols}")
            
            # Detectar benchmark automaticamente se não especificado
            if include_benchmark and benchmark_symbol is None:
                # Detectar mercado predominante
                has_brazilian = any('.SA' in symbol for symbol in symbols)
                has_us = any(symbol in ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'] or 
                           (not '.SA' in symbol and not 'USD' in symbol and not symbol.startswith('^')) 
                           for symbol in symbols)
                has_crypto = any('USD' in symbol or symbol in ['BTC', 'ETH', 'BNB'] for symbol in symbols)
                
                if has_brazilian:
                    benchmark_symbol = "^BVSP"
                elif has_us:
                    benchmark_symbol = "^GSPC"  # S&P 500
                elif has_crypto:
                    benchmark_symbol = "BTC-USD"  # Bitcoin como benchmark crypto
                else:
                    benchmark_symbol = "^GSPC"  # Default para S&P 500
            
            # Preparar lista de símbolos
            all_symbols = symbols.copy()
            
            # Adicionar benchmark se solicitado
            if include_benchmark and benchmark_symbol and benchmark_symbol not in all_symbols:
                all_symbols.append(benchmark_symbol)
                self.logger.info(f"Benchmark {benchmark_symbol} adicionado automaticamente")
            
            # Abordagem robusta: baixar cada símbolo individualmente para garantir apenas Adj Close
            prices_dict = {}
            
            for symbol in all_symbols:
                try:
                    self.logger.info(f"Baixando dados para {symbol}...")
                    
                    # Baixar dados individuais
                    data = yf.download(
                        symbol,
                        period=period,
                        interval=interval,
                        progress=False,
                        auto_adjust=False
                    )
                    
                    if data.empty:
                        self.logger.warning(f"Nenhum dado obtido para {symbol}")
                        continue
                    
                    # Usar Adj Close se disponível, senão Close
                    if 'Adj Close' in data.columns:
                        price_series = data['Adj Close']
                        self.logger.info(f"✓ {symbol}: {len(price_series)} observações (Adj Close)")
                    elif 'Close' in data.columns:
                        price_series = data['Close']
                        self.logger.info(f"✓ {symbol}: {len(price_series)} observações (Close)")
                    else:
                        self.logger.warning(f"Sem dados de preço válidos para {symbol}")
                        continue
                    
                    # Adicionar ao dicionário
                    prices_dict[symbol] = price_series
                    
                except Exception as e:
                    self.logger.error(f"Erro ao baixar {symbol}: {e}")
                    continue
            
            if not prices_dict:
                raise ValueError("Nenhum símbolo retornou dados válidos")
            
            # Criar DataFrame com todos os preços de forma robusta
            all_series = list(prices_dict.values())
            
            # Obter a união de todos os índices
            all_indices = set()
            for series in all_series:
                all_indices.update(series.index)
            
            # Ordenar índices
            common_index = sorted(all_indices)
            
            # Criar DataFrame vazio com o índice comum
            prices = pd.DataFrame(index=common_index)
            
            # Adicionar cada série ao DataFrame
            for symbol, series in prices_dict.items():
                prices[symbol] = series
            
            # Validação e limpeza dos dados
            original_length = len(prices)
            prices = prices.dropna(how='all')  # Remover linhas completamente vazias
            
            if len(prices) < original_length:
                self.logger.info(f"Removidas {original_length - len(prices)} linhas com dados faltantes")
            
            # Forward fill apenas se necessário
            if prices.isnull().any().any():
                self.logger.info("Aplicando forward fill para preencher gaps...")
                prices = prices.fillna(method='ffill')
                
            # Remover linhas restantes com NaN (início da série)
            prices = prices.dropna()
            
            # Verificar qualidade dos dados
            if len(prices) < 60:
                raise ValueError(f"Dados insuficientes após limpeza: {len(prices)} observações")
            
            # Log de estatísticas
            self.logger.info(f"Dados carregados com sucesso:")
            self.logger.info(f"  - Período: {prices.index.min().date()} a {prices.index.max().date()}")
            self.logger.info(f"  - Observações: {len(prices)}")
            self.logger.info(f"  - Ativos: {list(prices.columns)}")
            
            return prices
            
        except Exception as e:
            self.logger.error(f"Erro ao carregar dados globais: {str(e)}")
            raise ValueError(f"Erro ao carregar dados: {str(e)}")

    def load_global_market_data(
        self,
        symbols: List[str],
        period: str = "2y", 
        interval: str = "1d",
        include_benchmark: bool = True,
        benchmark_symbol: str = None
    ) -> pd.DataFrame:
        """
        Carrega dados de ativos de qualquer mercado via yfinance de forma totalmente configurável
        
        Args:
            symbols: Lista de símbolos (ex: ['PETR4.SA', 'AAPL', 'BTC-USD'])
            period: Período de dados ('1y', '2y', '3y', '5y', 'max')
            interval: Intervalo ('1d', '1wk', '1mo')
            include_benchmark: Se True, inclui benchmark apropriado
            benchmark_symbol: Benchmark específico (detecta automaticamente se None)
            
        Returns:
            DataFrame com preços dos ativos prontos para otimização
        """
        try:
            self.logger.info(f"Carregando dados de {len(symbols)} ativos via yfinance")
            
            # Detectar benchmark automaticamente se não especificado
            if include_benchmark and benchmark_symbol is None:
                # Detectar mercado predominante
                has_brazilian = any('.SA' in symbol for symbol in symbols)
                has_us = any(symbol in ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN'] or 
                           (not '.SA' in symbol and not 'USD' in symbol and not symbol.startswith('^')) 
                           for symbol in symbols)
                has_crypto = any('USD' in symbol or symbol in ['BTC', 'ETH', 'BNB'] for symbol in symbols)
                
                if has_brazilian:
                    benchmark_symbol = "^BVSP"
                elif has_us:
                    benchmark_symbol = "^GSPC"  # S&P 500
                elif has_crypto:
                    benchmark_symbol = "BTC-USD"  # Bitcoin como benchmark crypto
                else:
                    benchmark_symbol = "^GSPC"  # Default para S&P 500
            
            # Adicionar benchmark se solicitado
            all_symbols = symbols.copy()
            if include_benchmark and benchmark_symbol:
                if benchmark_symbol not in all_symbols:
                    all_symbols.append(benchmark_symbol)
                    self.logger.info(f"Benchmark {benchmark_symbol} adicionado automaticamente")
            
            self.logger.info(f"Símbolos formatados: {all_symbols}")
            
            # Abordagem simplificada: baixar cada símbolo individualmente
            prices_dict = {}
            
            for symbol in all_symbols:
                try:
                    self.logger.info(f"Baixando dados para {symbol}...")
                    
                    # Baixar dados individuais
                    data = yf.download(
                        symbol,
                        period=period,
                        interval=interval,
                        progress=False,
                        auto_adjust=False
                    )
                    
                    if data.empty:
                        self.logger.warning(f"Nenhum dado obtido para {symbol}")
                        continue
                    
                    # Usar Adj Close se disponível, senão Close
                    if 'Adj Close' in data.columns:
                        price_series = data['Adj Close']
                        self.logger.info(f"✓ {symbol}: {len(price_series)} observações (Adj Close)")
                    elif 'Close' in data.columns:
                        price_series = data['Close']
                        self.logger.info(f"✓ {symbol}: {len(price_series)} observações (Close)")
                    else:
                        self.logger.warning(f"Sem dados de preço válidos para {symbol}")
                        continue
                    
                    # Adicionar ao dicionário
                    prices_dict[symbol] = price_series
                    
                except Exception as e:
                    self.logger.error(f"Erro ao baixar {symbol}: {e}")
                    continue
            
            if not prices_dict:
                raise ValueError("Nenhum símbolo retornou dados válidos")
            
            # Criar DataFrame com todos os preços de forma robusta
            # Primeiro, vamos alinhar todas as séries pelo índice
            all_series = list(prices_dict.values())
            
            # Obter a união de todos os índices
            all_indices = set()
            for series in all_series:
                all_indices.update(series.index)
            
            # Ordenar índices
            common_index = sorted(all_indices)
            
            # Criar DataFrame vazio com o índice comum
            prices = pd.DataFrame(index=common_index)
            
            # Adicionar cada série ao DataFrame
            for symbol, series in prices_dict.items():
                prices[symbol] = series
            
            # Validação e limpeza dos dados
            original_length = len(prices)
            prices = prices.dropna(how='all')  # Remover linhas completamente vazias
            
            if len(prices) < original_length:
                self.logger.info(f"Removidas {original_length - len(prices)} linhas com dados faltantes")
            
            # Forward fill apenas se necessário
            if prices.isnull().any().any():
                self.logger.info("Aplicando forward fill para preencher gaps...")
                prices = prices.fillna(method='ffill')
                
            # Remover linhas restantes com NaN (início da série)
            prices = prices.dropna()
            
            # Verificar qualidade dos dados
            if len(prices) < 60:
                raise ValueError(f"Dados insuficientes após limpeza: {len(prices)} observações")
            
            # Log de estatísticas
            self.logger.info(f"Dados carregados com sucesso:")
            self.logger.info(f"  - Período: {prices.index.min().date()} a {prices.index.max().date()}")
            self.logger.info(f"  - Observações: {len(prices)}")
            self.logger.info(f"  - Ativos: {list(prices.columns)}")
            
            return prices
            
        except Exception as e:
            self.logger.error(f"Erro ao carregar dados brasileiros: {str(e)}")
            raise
    
    def get_sample_brazilian_portfolio_data(self) -> pd.DataFrame:
        """
        Obtém dados de uma carteira exemplo com principais ações brasileiras
        
        Returns:
            DataFrame com preços de ações brasileiras prontos para otimização
        """
        # Principais ações do Ibovespa por liquidez e relevância
        sample_symbols = [
            'PETR4',    # Petrobras
            'VALE3',    # Vale
            'ITUB4',    # Itaú Unibanco
            'BBDC4',    # Bradesco
            'ABEV3',    # Ambev
            'B3SA3',    # B3
            'WEGE3',    # WEG
            'RENT3',    # Localiza
            'BBAS3',    # Banco do Brasil
            'MGLU3'     # Magazine Luiza
        ]
        
        return self.load_brazilian_stocks_data(
            symbols=sample_symbols,
            period="2y",
            include_benchmark=True
        )

    def generate_advanced_charts(self, symbols: List[str], period: str = '2y', 
                                optimization_type: str = 'mean_risk', 
                                auto_format: bool = True, 
                                include_benchmark: bool = True) -> Dict:
        """
        Gera visualizações avançadas usando Plotly para análise completa de portfólio
        """
        try:
            import plotly.graph_objects as go
            import plotly.express as px
            from plotly.subplots import make_subplots
            import plotly.figure_factory as ff
            
            logger.info(f"Iniciando geração de gráficos avançados para {len(symbols)} símbolos")
            
            # Carregar dados
            returns_data = self.load_brazilian_stocks_data(symbols, period, auto_format, include_benchmark)
            
            if returns_data.empty:
                raise ValueError("Dados insuficientes para gerar gráficos")
            
            # Executar otimização para obter portfólio
            optimization_result = self.optimize_portfolio(
                symbols=symbols,
                period=period,
                optimization_type=optimization_type,
                auto_format=auto_format,
                include_benchmark=include_benchmark
            )
            
            if not optimization_result['success']:
                raise ValueError(f"Falha na otimização: {optimization_result.get('error', 'Erro desconhecido')}")
            
            charts_data = {}
            
            # 1. Gráfico de Pizza - Alocação do Portfólio
            charts_data['weights_pie'] = self._generate_weights_pie_chart(optimization_result)
            
            # 2. Gráfico de Dispersão - Risco vs Retorno
            charts_data['returns_scatter'] = self._generate_risk_return_scatter(returns_data)
            
            # 3. Matriz de Correlação Heatmap
            charts_data['correlation_heatmap'] = self._generate_correlation_heatmap(returns_data)
            
            # 4. Fronteira Eficiente
            charts_data['efficient_frontier'] = self._generate_efficient_frontier(symbols, period, auto_format)
            
            # 5. Retornos Cumulativos
            charts_data['cumulative_returns'] = self._generate_cumulative_returns_chart(returns_data)
            
            # 6. Análise de Drawdown
            charts_data['drawdown'] = self._generate_drawdown_chart(returns_data)
            
            # 7. Métricas de Risco
            charts_data['risk_metrics'] = self._generate_risk_metrics_chart(optimization_result)
            
            # 8. Evolução da Alocação
            charts_data['asset_allocation'] = self._generate_asset_allocation_chart(optimization_result)
            
            logger.info(f"✓ Gerados {len(charts_data)} gráficos avançados com sucesso")
            return charts_data
            
        except Exception as e:
            logger.error(f"Erro na geração de gráficos avançados: {str(e)}")
            raise

    def _generate_weights_pie_chart(self, optimization_result: Dict) -> Dict:
        """Gera gráfico de pizza para alocação do portfólio"""
        try:
            import plotly.graph_objects as go
            
            assets_info = optimization_result.get('assets_info', [])
            
            # Ordenar por peso
            assets_info = sorted(assets_info, key=lambda x: x['weight'], reverse=True)
            
            symbols = [asset['symbol'] for asset in assets_info]
            weights = [asset['weight'] * 100 for asset in assets_info]
            
            fig = go.Figure(data=[go.Pie(
                labels=symbols,
                values=weights,
                hole=0.4,
                textinfo='label+percent',
                textposition='outside',
                marker=dict(
                    colors=px.colors.qualitative.Set3[:len(symbols)],
                    line=dict(color='#FFFFFF', width=2)
                )
            )])
            
            fig.update_layout(
                title={
                    'text': f'Alocação Otimizada do Portfólio<br><sub>Tipo: {optimization_result.get("optimization_type", "N/A").replace("_", " ").title()}</sub>',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                font=dict(size=12),
                showlegend=True,
                legend=dict(
                    orientation="v",
                    yanchor="top",
                    y=1,
                    xanchor="left",
                    x=1.05
                ),
                margin=dict(t=80, b=40, l=40, r=120),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico de pizza: {str(e)}")
            return {}

    def _generate_risk_return_scatter(self, returns_data: pd.DataFrame) -> Dict:
        """Gera gráfico de dispersão risco vs retorno"""
        try:
            import plotly.graph_objects as go
            import plotly.express as px
            
            # Calcular métricas para cada ativo
            annual_returns = returns_data.mean() * 252
            annual_volatility = returns_data.std() * np.sqrt(252)
            sharpe_ratios = annual_returns / annual_volatility
            
            # Criar DataFrame para facilitar o plot
            scatter_data = pd.DataFrame({
                'Symbol': returns_data.columns,
                'Return': annual_returns.values * 100,
                'Volatility': annual_volatility.values * 100,
                'Sharpe': sharpe_ratios.values
            })
            
            fig = go.Figure()
            
            # Adicionar pontos dos ativos
            fig.add_trace(go.Scatter(
                x=scatter_data['Volatility'],
                y=scatter_data['Return'],
                mode='markers+text',
                text=scatter_data['Symbol'],
                textposition='top center',
                marker=dict(
                    size=15,
                    color=scatter_data['Sharpe'],
                    colorscale='RdYlGn',
                    showscale=True,
                    colorbar=dict(title="Sharpe Ratio"),
                    line=dict(width=1, color='DarkSlateGrey')
                ),
                hovertemplate='<b>%{text}</b><br>' +
                            'Retorno: %{y:.2f}%<br>' +
                            'Volatilidade: %{x:.2f}%<br>' +
                            'Sharpe: %{marker.color:.3f}<br>' +
                            '<extra></extra>',
                name='Ativos'
            ))
            
            fig.update_layout(
                title={
                    'text': 'Análise Risco vs Retorno dos Ativos',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                xaxis=dict(
                    title='Volatilidade Anualizada (%)',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                yaxis=dict(
                    title='Retorno Anualizado (%)',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                plot_bgcolor='white',
                margin=dict(t=80, b=40, l=60, r=40),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico risco-retorno: {str(e)}")
            return {}

    def _generate_correlation_heatmap(self, returns_data: pd.DataFrame) -> Dict:
        """Gera matriz de correlação interativa"""
        try:
            import plotly.graph_objects as go
            
            # Calcular matriz de correlação
            corr_matrix = returns_data.corr()
            
            # Preparar dados para o heatmap
            z = corr_matrix.values
            x = corr_matrix.columns.tolist()
            y = corr_matrix.index.tolist()
            
            # Criar anotações para os valores
            annotations = []
            for i, row in enumerate(z):
                for j, value in enumerate(row):
                    annotations.append(
                        dict(
                            x=x[j],
                            y=y[i],
                            text=f'{value:.2f}',
                            showarrow=False,
                            font=dict(color='white' if abs(value) > 0.5 else 'black', size=10)
                        )
                    )
            
            fig = go.Figure(data=go.Heatmap(
                z=z,
                x=x,
                y=y,
                colorscale='RdBu',
                zmid=0,
                colorbar=dict(title="Correlação"),
                hoverongaps=False,
                hovertemplate='%{y} vs %{x}<br>Correlação: %{z:.3f}<extra></extra>'
            ))
            
            fig.update_layout(
                title={
                    'text': 'Matriz de Correlação dos Ativos',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                annotations=annotations,
                xaxis=dict(side='bottom'),
                yaxis=dict(side='left'),
                margin=dict(t=80, b=40, l=60, r=40),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar matriz de correlação: {str(e)}")
            return {}

    def _generate_efficient_frontier(self, symbols: List[str], period: str, auto_format: bool) -> Dict:
        """Gera gráfico da fronteira eficiente"""
        try:
            import plotly.graph_objects as go
            from skfolio import Population
            from skfolio.optimization import MeanRisk
            from skfolio.prior import EmpiricalPrior
            
            # Carregar dados
            returns_data = self.load_brazilian_stocks_data(symbols, period, auto_format, False)
            
            if returns_data.empty:
                return {}
            
            # Configurar otimização
            prior_estimator = EmpiricalPrior()
            prior_estimator.fit(returns_data)
            
            # Criar população de portfólios
            population = Population()
            
            # Gerar múltiplos portfólios para a fronteira
            risk_targets = np.linspace(0.05, 0.50, 20)
            
            portfolios_data = []
            
            for risk_target in risk_targets:
                try:
                    optimizer = MeanRisk(
                        risk_measure=self.config.get('risk_measure', 'VARIANCE'),
                        risk_aversion=1.0 / risk_target,
                        solver=self.config.get('solver', 'CLARABEL')
                    )
                    
                    optimizer.fit(returns_data)
                    portfolio = optimizer.predict(returns_data)
                    
                    portfolios_data.append({
                        'return': portfolio.mean * 252 * 100,
                        'volatility': portfolio.std * np.sqrt(252) * 100,
                        'sharpe': portfolio.sharpe_ratio
                    })
                    
                except Exception:
                    continue
            
            if not portfolios_data:
                return {}
            
            # Criar gráfico
            returns = [p['return'] for p in portfolios_data]
            volatilities = [p['volatility'] for p in portfolios_data]
            sharpes = [p['sharpe'] for p in portfolios_data]
            
            fig = go.Figure()
            
            # Fronteira eficiente
            fig.add_trace(go.Scatter(
                x=volatilities,
                y=returns,
                mode='lines+markers',
                name='Fronteira Eficiente',
                line=dict(color='blue', width=3),
                marker=dict(
                    size=8,
                    color=sharpes,
                    colorscale='Viridis',
                    showscale=True,
                    colorbar=dict(title="Sharpe Ratio")
                ),
                hovertemplate='Retorno: %{y:.2f}%<br>' +
                            'Volatilidade: %{x:.2f}%<br>' +
                            'Sharpe: %{marker.color:.3f}<br>' +
                            '<extra></extra>'
            ))
            
            fig.update_layout(
                title={
                    'text': 'Fronteira Eficiente - Otimização de Portfólio',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                xaxis=dict(
                    title='Risco (Volatilidade %)',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                yaxis=dict(
                    title='Retorno Esperado (%)',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                plot_bgcolor='white',
                margin=dict(t=80, b=40, l=60, r=40),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar fronteira eficiente: {str(e)}")
            return {}

    def _generate_cumulative_returns_chart(self, returns_data: pd.DataFrame) -> Dict:
        """Gera gráfico de retornos cumulativos"""
        try:
            import plotly.graph_objects as go
            import plotly.express as px
            
            # Calcular retornos cumulativos
            cumulative_returns = (1 + returns_data).cumprod()
            
            fig = go.Figure()
            
            # Cores para as linhas
            colors = px.colors.qualitative.Set1
            
            for i, column in enumerate(cumulative_returns.columns):
                fig.add_trace(go.Scatter(
                    x=cumulative_returns.index,
                    y=cumulative_returns[column],
                    mode='lines',
                    name=column,
                    line=dict(color=colors[i % len(colors)], width=2),
                    hovertemplate=f'<b>{column}</b><br>' +
                                'Data: %{x}<br>' +
                                'Retorno Acumulado: %{y:.3f}<br>' +
                                '<extra></extra>'
                ))
            
            fig.update_layout(
                title={
                    'text': 'Evolução dos Retornos Cumulativos',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                xaxis=dict(
                    title='Data',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                yaxis=dict(
                    title='Retorno Cumulativo',
                    showgrid=True,
                    gridwidth=1,
                    gridcolor='LightGray'
                ),
                plot_bgcolor='white',
                margin=dict(t=80, b=40, l=60, r=40),
                height=500,
                legend=dict(
                    yanchor="top",
                    y=0.99,
                    xanchor="left",
                    x=0.01
                )
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico de retornos cumulativos: {str(e)}")
            return {}

    def _generate_drawdown_chart(self, returns_data: pd.DataFrame) -> Dict:
        """Gera gráfico de análise de drawdown"""
        try:
            import plotly.graph_objects as go
            from plotly.subplots import make_subplots
            
            # Calcular retornos cumulativos
            cumulative_returns = (1 + returns_data).cumprod()
            
            # Calcular drawdown para cada ativo
            drawdowns = {}
            for column in cumulative_returns.columns:
                running_max = cumulative_returns[column].expanding().max()
                drawdown = (cumulative_returns[column] - running_max) / running_max
                drawdowns[column] = drawdown
            
            # Criar subplot
            fig = make_subplots(
                rows=2, cols=1,
                subplot_titles=('Retornos Cumulativos', 'Drawdown'),
                vertical_spacing=0.08,
                shared_xaxes=True
            )
            
            # Cores
            colors = px.colors.qualitative.Set1
            
            # Adicionar retornos cumulativos
            for i, column in enumerate(cumulative_returns.columns):
                fig.add_trace(
                    go.Scatter(
                        x=cumulative_returns.index,
                        y=cumulative_returns[column],
                        mode='lines',
                        name=column,
                        line=dict(color=colors[i % len(colors)], width=2),
                        showlegend=True
                    ),
                    row=1, col=1
                )
            
            # Adicionar drawdowns
            for i, column in enumerate(cumulative_returns.columns):
                fig.add_trace(
                    go.Scatter(
                        x=cumulative_returns.index,
                        y=drawdowns[column] * 100,
                        mode='lines',
                        name=f'{column} DD',
                        line=dict(color=colors[i % len(colors)], width=2),
                        showlegend=False,
                        fill='tonexty' if i == 0 else None,
                        fillcolor='rgba(255,0,0,0.1)' if i == 0 else None
                    ),
                    row=2, col=1
                )
            
            fig.update_layout(
                title={
                    'text': 'Análise de Drawdown dos Ativos',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                height=700,
                margin=dict(t=80, b=40, l=60, r=40)
            )
            
            fig.update_xaxes(title_text="Data", row=2, col=1)
            fig.update_yaxes(title_text="Retorno Cumulativo", row=1, col=1)
            fig.update_yaxes(title_text="Drawdown (%)", row=2, col=1)
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico de drawdown: {str(e)}")
            return {}

    def _generate_risk_metrics_chart(self, optimization_result: Dict) -> Dict:
        """Gera gráfico de métricas de risco"""
        try:
            import plotly.graph_objects as go
            
            metrics = optimization_result.get('portfolio_metrics', {})
            
            # Preparar dados
            metric_names = ['Sharpe Ratio', 'Calmar Ratio', 'VaR 95%', 'CVaR 95%']
            metric_values = [
                metrics.get('sharpe_ratio', 0),
                metrics.get('calmar_ratio', 0),
                abs(metrics.get('var_95', 0)) * 100,  # Converter para positivo e %
                abs(metrics.get('cvar_95', 0)) * 100   # Converter para positivo e %
            ]
            
            # Cores baseadas na performance
            colors = ['green' if v > 0 else 'red' for v in metric_values[:2]] + ['orange', 'red']
            
            fig = go.Figure()
            
            fig.add_trace(go.Bar(
                x=metric_names,
                y=metric_values,
                marker=dict(
                    color=colors,
                    line=dict(color='black', width=1)
                ),
                text=[f'{v:.3f}' if i < 2 else f'{v:.2f}%' for i, v in enumerate(metric_values)],
                textposition='auto',
                hovertemplate='<b>%{x}</b><br>Valor: %{text}<extra></extra>'
            ))
            
            fig.update_layout(
                title={
                    'text': 'Métricas de Risco do Portfólio Otimizado',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                xaxis=dict(title='Métricas'),
                yaxis=dict(title='Valor'),
                plot_bgcolor='white',
                margin=dict(t=80, b=40, l=60, r=40),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico de métricas de risco: {str(e)}")
            return {}

    def _generate_asset_allocation_chart(self, optimization_result: Dict) -> Dict:
        """Gera gráfico de evolução da alocação"""
        try:
            import plotly.graph_objects as go
            
            assets_info = optimization_result.get('assets_info', [])
            
            if not assets_info:
                return {}
            
            # Ordenar por peso
            assets_info = sorted(assets_info, key=lambda x: x['weight'], reverse=True)
            
            symbols = [asset['symbol'] for asset in assets_info]
            weights = [asset['weight'] * 100 for asset in assets_info]
            returns = [asset['expected_return'] * 100 for asset in assets_info]
            volatilities = [asset['volatility'] * 100 for asset in assets_info]
            
            fig = go.Figure()
            
            # Barras de alocação
            fig.add_trace(go.Bar(
                x=symbols,
                y=weights,
                name='Peso (%)',
                marker=dict(color='lightblue'),
                yaxis='y1',
                text=[f'{w:.1f}%' for w in weights],
                textposition='auto'
            ))
            
            # Linha de retorno esperado
            fig.add_trace(go.Scatter(
                x=symbols,
                y=returns,
                mode='lines+markers',
                name='Retorno Esperado (%)',
                yaxis='y2',
                line=dict(color='green', width=3),
                marker=dict(size=8)
            ))
            
            # Linha de volatilidade
            fig.add_trace(go.Scatter(
                x=symbols,
                y=volatilities,
                mode='lines+markers',
                name='Volatilidade (%)',
                yaxis='y2',
                line=dict(color='red', width=3),
                marker=dict(size=8)
            ))
            
            fig.update_layout(
                title={
                    'text': 'Alocação vs Características dos Ativos',
                    'x': 0.5,
                    'xanchor': 'center',
                    'font': {'size': 18}
                },
                xaxis=dict(title='Ativos'),
                yaxis=dict(title='Peso no Portfólio (%)', side='left'),
                yaxis2=dict(title='Retorno/Volatilidade (%)', side='right', overlaying='y'),
                legend=dict(x=0.02, y=0.98),
                margin=dict(t=80, b=40, l=60, r=60),
                height=500
            )
            
            return {
                'data': fig.data,
                'layout': fig.layout
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar gráfico de alocação: {str(e)}")
            return {}

    def generate_portfolio_charts(
        self,
        returns: pd.DataFrame,
        weights: Dict[str, float],
        portfolio: Any,
        optimization_type: str = 'mean_risk'
    ) -> Dict[str, str]:
        """
        Gera gráficos Plotly para visualização do portfólio - VERSÃO COMPLETA
        
        Args:
            returns: DataFrame com retornos dos ativos
            weights: Dicionário com pesos do portfólio
            portfolio: Objeto portfolio do SKFolio
            optimization_type: Tipo de otimização
            
        Returns:
            Dict com TODOS os gráficos Plotly em HTML
        """
        try:
            import plotly.graph_objects as go
            import plotly.express as px
            from plotly.subplots import make_subplots
            import plotly.io as pio
            
            charts = {}
            
            # 1. 📊 Gráfico de Pizza - Alocação do Portfólio (EXISTENTE)
            try:
                # Filtrar pesos significativos
                significant_weights = {k: v for k, v in weights.items() if v > 0.01}
                
                if significant_weights:
                    fig_pie = go.Figure(data=[go.Pie(
                        labels=list(significant_weights.keys()),
                        values=list(significant_weights.values()),
                        hole=0.3,
                        textinfo='label+percent',
                        textposition='auto',
                        marker=dict(
                            colors=px.colors.qualitative.Set3,
                            line=dict(color='#FFFFFF', width=2)
                        )
                    )])
                    
                    fig_pie.update_layout(
                        title={
                            'text': f'Alocação do Portfólio - {optimization_type.upper()}',
                            'x': 0.5,
                            'font': {'size': 16}
                        },
                        showlegend=True,
                        height=400,
                        margin=dict(t=50, b=50, l=50, r=50)
                    )
                    
                    charts['allocation_pie'] = fig_pie.to_html(
                        include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                        config={'displayModeBar': True, 'responsive': True}
                    )
                    
            except Exception as e:
                self.logger.warning(f"Erro ao gerar gráfico de pizza: {e}")
            
            # 2. 🔥 Matriz de Correlação (EXISTENTE)
            try:
                corr_matrix = returns.corr()
                
                fig_corr = go.Figure(data=go.Heatmap(
                    z=corr_matrix.values,
                    x=corr_matrix.columns,
                    y=corr_matrix.columns,
                    colorscale='RdBu',
                    zmid=0,
                    text=np.round(corr_matrix.values, 2),
                    texttemplate='%{text}',
                    textfont={"size": 10},
                    hoverongaps=False
                ))
                
                fig_corr.update_layout(
                    title={
                        'text': 'Matriz de Correlação dos Ativos',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    xaxis_title='Ativos',
                    yaxis_title='Ativos',
                    height=500,
                    margin=dict(t=50, b=50, l=50, r=50)
                )
                
                charts['correlation_heatmap'] = fig_corr.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar matriz de correlação: {e}")
            
            # 3. 📊 Distribuição de Retornos (EXISTENTE - MELHORADO)
            try:
                # Calcular retornos do portfólio
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                
                fig_dist = make_subplots(
                    rows=2, cols=2,
                    subplot_titles=[
                        'Distribuição de Retornos do Portfólio', 
                        'Box Plot dos Retornos',
                        'Retornos Acumulados vs Benchmark', 
                        'Q-Q Plot (Normalidade)'
                    ],
                    specs=[[{"secondary_y": False}, {"secondary_y": False}],
                           [{"secondary_y": False}, {"secondary_y": False}]],
                    vertical_spacing=0.12,
                    horizontal_spacing=0.1
                )
                
                # Histograma
                fig_dist.add_trace(
                    go.Histogram(
                        x=portfolio_returns,
                        nbinsx=50,
                        name='Retornos',
                        opacity=0.7,
                        marker_color='blue',
                        showlegend=False
                    ),
                    row=1, col=1
                )
                
                # Box Plot
                fig_dist.add_trace(
                    go.Box(
                        y=portfolio_returns,
                        name='Box Plot',
                        marker_color='green',
                        showlegend=False
                    ),
                    row=1, col=2
                )
                
                # Retornos acumulados
                cumulative_returns = (1 + portfolio_returns).cumprod()
                fig_dist.add_trace(
                    go.Scatter(
                        x=cumulative_returns.index,
                        y=cumulative_returns,
                        mode='lines',
                        name='Portfolio',
                        line=dict(color='blue', width=2),
                        showlegend=False
                    ),
                    row=2, col=1
                )
                
                # Adicionar benchmark se disponível
                if '^BVSP' in returns.columns:
                    benchmark_returns = returns['^BVSP']
                    benchmark_cumulative = (1 + benchmark_returns).cumprod()
                    fig_dist.add_trace(
                        go.Scatter(
                            x=benchmark_cumulative.index,
                            y=benchmark_cumulative,
                            mode='lines',
                            name='IBOVESPA',
                            line=dict(color='red', width=2, dash='dash'),
                            showlegend=False
                        ),
                        row=2, col=1
                    )
                
                # Q-Q Plot aproximado
                from scipy import stats
                sorted_returns = np.sort(portfolio_returns)
                theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(sorted_returns)))
                
                fig_dist.add_trace(
                    go.Scatter(
                        x=theoretical_quantiles,
                        y=sorted_returns,
                        mode='markers',
                        name='Q-Q Plot',
                        marker=dict(color='purple', size=4),
                        showlegend=False
                    ),
                    row=2, col=2
                )
                
                # Linha de referência para Q-Q Plot
                fig_dist.add_trace(
                    go.Scatter(
                        x=[theoretical_quantiles.min(), theoretical_quantiles.max()],
                        y=[sorted_returns.min(), sorted_returns.max()],
                        mode='lines',
                        name='Linha Normal',
                        line=dict(color='red', dash='dash'),
                        showlegend=False
                    ),
                    row=2, col=2
                )
                
                fig_dist.update_layout(
                    title={
                        'text': 'Análise Completa de Retornos do Portfólio',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    height=700,
                    showlegend=False,
                    margin=dict(t=80, b=50, l=50, r=50)
                )
                
                charts['returns_distribution'] = fig_dist.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar distribuição de retornos: {e}")
            
            # 4. 📈 Fronteira Eficiente (EXISTENTE - MELHORADO)
            try:
                if optimization_type == 'mean_risk':
                    # Gerar pontos da fronteira eficiente
                    asset_rets = returns.mean() * 252
                    asset_vols = returns.std() * np.sqrt(252)
                    
                    fig_frontier = go.Figure()
                    
                    # Portfólio otimizado
                    fig_frontier.add_trace(go.Scatter(
                        x=[float(portfolio.annualized_standard_deviation)],
                        y=[float(portfolio.annualized_mean)],
                        mode='markers',
                        name='Portfólio Otimizado',
                        marker=dict(color='red', size=15, symbol='star'),
                        hovertemplate='<b>Portfólio Otimizado</b><br>' +
                                    'Volatilidade: %{x:.2%}<br>' +
                                    'Retorno: %{y:.2%}<br>' +
                                    f'Sharpe: {portfolio.annualized_sharpe_ratio:.3f}<extra></extra>'
                    ))
                    
                    # Ativos individuais
                    hover_text = [f'{asset}<br>Vol: {vol:.2%}<br>Ret: {ret:.2%}<br>Sharpe: {ret/vol:.3f}' 
                                for asset, vol, ret in zip(returns.columns, asset_vols, asset_rets)]
                    
                    fig_frontier.add_trace(go.Scatter(
                        x=asset_vols,
                        y=asset_rets,
                        mode='markers+text',
                        name='Ativos Individuais',
                        marker=dict(color='blue', size=10),
                        text=returns.columns,
                        textposition='top center',
                        hovertemplate='%{hovertext}<extra></extra>',
                        hovertext=hover_text
                    ))
                    
                    # Linha de Capital Market Line (CML) aproximada
                    risk_free_rate = 0.1  # 10% ao ano (aproximação)
                    tangent_slope = (portfolio.annualized_mean - risk_free_rate) / portfolio.annualized_standard_deviation
                    x_cml = np.linspace(0, asset_vols.max() * 1.2, 100)
                    y_cml = risk_free_rate + tangent_slope * x_cml
                    
                    fig_frontier.add_trace(go.Scatter(
                        x=x_cml,
                        y=y_cml,
                        mode='lines',
                        name='Capital Market Line',
                        line=dict(color='green', dash='dash', width=2),
                        hovertemplate='CML<br>Volatilidade: %{x:.2%}<br>Retorno: %{y:.2%}<extra></extra>'
                    ))
                    
                    fig_frontier.update_layout(
                        title={
                            'text': 'Fronteira Eficiente & Capital Market Line',
                            'x': 0.5,
                            'font': {'size': 16}
                        },
                        xaxis_title='Volatilidade (Anualizada)',
                        yaxis_title='Retorno Esperado (Anualizado)',
                        height=500,
                        margin=dict(t=50, b=50, l=50, r=50),
                        hovermode='closest'
                    )
                    
                    charts['efficient_frontier'] = fig_frontier.to_html(
                        include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                        config={'displayModeBar': True, 'responsive': True}
                    )
                        
            except Exception as e:
                self.logger.warning(f"Erro ao gerar fronteira eficiente: {e}")
            
            # 5. 🎯 NOVO: Risk-Return Scatter (Análise Individual)
            try:
                asset_rets = returns.mean() * 252
                asset_vols = returns.std() * np.sqrt(252)
                asset_sharpe = asset_rets / asset_vols
                
                # Calcular contribuição de cada ativo
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                asset_contributions = {}
                for asset in returns.columns:
                    if asset in weights:
                        asset_contributions[asset] = weights[asset] * returns[asset].mean() * 252
                
                colors = [weights.get(asset, 0) for asset in returns.columns]
                sizes = [weights.get(asset, 0) * 1000 + 10 for asset in returns.columns]  # Tamanho baseado no peso
                
                fig_scatter = go.Figure()
                
                for i, asset in enumerate(returns.columns):
                    fig_scatter.add_trace(go.Scatter(
                        x=[asset_vols[i]],
                        y=[asset_rets[i]],
                        mode='markers+text',
                        name=asset,
                        marker=dict(
                            size=sizes[i],
                            color=colors[i],
                            colorscale='Viridis',
                            showscale=i==0,
                            colorbar=dict(title="Peso no Portfólio") if i==0 else None,
                            line=dict(width=2, color='white')
                        ),
                        text=asset,
                        textposition='middle center',
                        textfont=dict(color='white', size=10),
                        hovertemplate=f'<b>{asset}</b><br>' +
                                    f'Volatilidade: {asset_vols[i]:.2%}<br>' +
                                    f'Retorno: {asset_rets[i]:.2%}<br>' +
                                    f'Sharpe: {asset_sharpe[i]:.3f}<br>' +
                                    f'Peso: {weights.get(asset, 0):.1%}<br>' +
                                    f'Contribuição: {asset_contributions.get(asset, 0):.2%}<extra></extra>',
                        showlegend=False
                    ))
                
                fig_scatter.update_layout(
                    title={
                        'text': 'Análise Risco-Retorno por Ativo (Tamanho = Peso)',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    xaxis_title='Volatilidade (Anualizada)',
                    yaxis_title='Retorno Esperado (Anualizado)',
                    height=500,
                    margin=dict(t=50, b=50, l=50, r=50),
                    hovermode='closest'
                )
                
                charts['risk_return_scatter'] = fig_scatter.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar risk-return scatter: {e}")
            
            # 6. 📈 NOVO: Cumulative Returns (Análise Temporal Completa)
            try:
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                cumulative_returns = (1 + portfolio_returns).cumprod()
                
                fig_cumret = make_subplots(
                    rows=2, cols=1,
                    subplot_titles=['Retornos Cumulativos', 'Retornos Mensais vs Benchmark'],
                    vertical_spacing=0.15,
                    row_heights=[0.7, 0.3]
                )
                
                # Retornos cumulativos do portfólio
                fig_cumret.add_trace(
                    go.Scatter(
                        x=cumulative_returns.index,
                        y=cumulative_returns,
                        mode='lines',
                        name='Portfólio',
                        line=dict(color='blue', width=3),
                        hovertemplate='Data: %{x}<br>Valor: %{y:.3f}<br>Retorno: %{customdata:.2%}<extra></extra>',
                        customdata=(cumulative_returns - 1)
                    ),
                    row=1, col=1
                )
                
                # Benchmark se disponível
                if len([col for col in returns.columns if col.startswith('^')]) > 0:
                    benchmark_col = [col for col in returns.columns if col.startswith('^')][0]
                    benchmark_cumulative = (1 + returns[benchmark_col]).cumprod()
                    fig_cumret.add_trace(
                        go.Scatter(
                            x=benchmark_cumulative.index,
                            y=benchmark_cumulative,
                            mode='lines',
                            name='Benchmark',
                            line=dict(color='red', width=2, dash='dash'),
                            hovertemplate='Data: %{x}<br>Valor: %{y:.3f}<br>Retorno: %{customdata:.2%}<extra></extra>',
                            customdata=(benchmark_cumulative - 1)
                        ),
                        row=1, col=1
                    )
                
                # Retornos mensais
                monthly_returns = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
                colors = ['green' if r > 0 else 'red' for r in monthly_returns]
                
                fig_cumret.add_trace(
                    go.Bar(
                        x=monthly_returns.index,
                        y=monthly_returns,
                        name='Retornos Mensais',
                        marker_color=colors,
                        hovertemplate='Mês: %{x}<br>Retorno: %{y:.2%}<extra></extra>',
                        showlegend=False
                    ),
                    row=2, col=1
                )
                
                fig_cumret.update_layout(
                    title={
                        'text': 'Análise Temporal de Performance',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    height=700,
                    margin=dict(t=80, b=50, l=50, r=50),
                    hovermode='x unified'
                )
                
                charts['cumulative_returns'] = fig_cumret.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar retornos cumulativos: {e}")
            
            # 7. 📉 NOVO: Drawdown Chart (Análise de Risco Avançada)
            try:
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                cumulative_returns = (1 + portfolio_returns).cumprod()
                
                # Calcular drawdown
                running_max = cumulative_returns.expanding().max()
                drawdown = (cumulative_returns - running_max) / running_max
                
                # Identificar períodos de drawdown
                drawdown_periods = []
                in_drawdown = False
                start_date = None
                
                for date, dd in drawdown.items():
                    if dd < -0.01 and not in_drawdown:  # Início do drawdown (>1%)
                        in_drawdown = True
                        start_date = date
                    elif dd >= -0.001 and in_drawdown:  # Fim do drawdown
                        in_drawdown = False
                        if start_date:
                            drawdown_periods.append((start_date, date))
                
                fig_dd = make_subplots(
                    rows=3, cols=1,
                    subplot_titles=[
                        'Evolução do Portfólio vs Máximo Histórico',
                        'Drawdown (% da Perda)',
                        'Distribuição dos Drawdowns'
                    ],
                    vertical_spacing=0.1,
                    row_heights=[0.4, 0.4, 0.2]
                )
                
                # Gráfico 1: Valor vs Máximo
                fig_dd.add_trace(
                    go.Scatter(
                        x=cumulative_returns.index,
                        y=cumulative_returns,
                        mode='lines',
                        name='Valor do Portfólio',
                        line=dict(color='blue', width=2),
                        hovertemplate='Data: %{x}<br>Valor: %{y:.3f}<extra></extra>'
                    ),
                    row=1, col=1
                )
                
                fig_dd.add_trace(
                    go.Scatter(
                        x=running_max.index,
                        y=running_max,
                        mode='lines',
                        name='Máximo Histórico',
                        line=dict(color='green', width=2, dash='dash'),
                        hovertemplate='Data: %{x}<br>Máximo: %{y:.3f}<extra></extra>'
                    ),
                    row=1, col=1
                )
                
                # Gráfico 2: Drawdown
                fig_dd.add_trace(
                    go.Scatter(
                        x=drawdown.index,
                        y=drawdown * 100,
                        mode='lines',
                        name='Drawdown',
                        line=dict(color='red', width=2),
                        fill='tozeroy',
                        fillcolor='rgba(255,0,0,0.3)',
                        hovertemplate='Data: %{x}<br>Drawdown: %{y:.2f}%<extra></extra>',
                        showlegend=False
                    ),
                    row=2, col=1
                )
                
                # Marcar períodos significativos de drawdown
                for start, end in drawdown_periods:
                    fig_dd.add_vrect(
                        x0=start, x1=end,
                        fillcolor="red", opacity=0.2,
                        layer="below", line_width=0,
                        row=2, col=1
                    )
                
                # Gráfico 3: Histograma de drawdowns
                drawdown_values = drawdown[drawdown < -0.001] * 100  # Apenas drawdowns significativos
                
                fig_dd.add_trace(
                    go.Histogram(
                        x=drawdown_values,
                        nbinsx=30,
                        name='Distribuição DD',
                        marker_color='red',
                        opacity=0.7,
                        hovertemplate='Drawdown: %{x:.2f}%<br>Frequência: %{y}<extra></extra>',
                        showlegend=False
                    ),
                    row=3, col=1
                )
                
                # Estatísticas de drawdown
                max_dd = drawdown.min() * 100
                avg_dd = drawdown_values.mean() if len(drawdown_values) > 0 else 0
                dd_duration = len(drawdown_periods)
                
                fig_dd.update_layout(
                    title={
                        'text': f'Análise de Drawdown | Máx: {max_dd:.2f}% | Méd: {avg_dd:.2f}% | Períodos: {dd_duration}',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    height=800,
                    margin=dict(t=80, b=50, l=50, r=50),
                    hovermode='x unified'
                )
                
                charts['drawdown_chart'] = fig_dd.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar gráfico de drawdown: {e}")
            
            # 8. 📊 NOVO: Performance Attribution (Contribuição por Ativo)
            try:
                # Calcular contribuição de cada ativo para o retorno total
                contributions = {}
                total_return = 0
                
                for asset in returns.columns:
                    if asset in weights and weights[asset] > 0:
                        asset_return = returns[asset].mean() * 252  # Anualizado
                        contribution = weights[asset] * asset_return
                        contributions[asset] = contribution
                        total_return += contribution
                
                # Calcular volatilidade contribution
                vol_contributions = {}
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                portfolio_vol = portfolio_returns.std() * np.sqrt(252)
                
                for asset in returns.columns:
                    if asset in weights and weights[asset] > 0:
                        # Contribuição marginal para volatilidade
                        asset_vol = returns[asset].std() * np.sqrt(252)
                        vol_contributions[asset] = weights[asset] * asset_vol
                
                fig_attr = make_subplots(
                    rows=2, cols=2,
                    subplot_titles=[
                        'Contribuição para Retorno (%)',
                        'Contribuição para Risco (%)',
                        'Eficiência: Retorno/Risco por Ativo',
                        'Decomposição Sharpe Ratio'
                    ],
                    specs=[[{"type": "bar"}, {"type": "bar"}],
                           [{"type": "scatter"}, {"type": "bar"}]],
                    vertical_spacing=0.15,
                    horizontal_spacing=0.1
                )
                
                # Gráfico 1: Contribuição para retorno
                assets = list(contributions.keys())
                contrib_values = [contributions[asset] * 100 for asset in assets]
                colors_ret = ['green' if v > 0 else 'red' for v in contrib_values]
                
                fig_attr.add_trace(
                    go.Bar(
                        x=assets,
                        y=contrib_values,
                        name='Contrib. Retorno',
                        marker_color=colors_ret,
                        hovertemplate='Ativo: %{x}<br>Contribuição: %{y:.2f}%<extra></extra>',
                        showlegend=False
                    ),
                    row=1, col=1
                )
                
                # Gráfico 2: Contribuição para risco
                vol_values = [vol_contributions.get(asset, 0) * 100 for asset in assets]
                
                fig_attr.add_trace(
                    go.Bar(
                        x=assets,
                        y=vol_values,
                        name='Contrib. Risco',
                        marker_color='orange',
                        hovertemplate='Ativo: %{x}<br>Contrib. Risco: %{y:.2f}%<extra></extra>',
                        showlegend=False
                    ),
                    row=1, col=2
                )
                
                # Gráfico 3: Eficiência (Retorno/Risco)
                efficiency = []
                for asset in assets:
                    ret_contrib = contributions[asset] * 100
                    risk_contrib = vol_contributions.get(asset, 0.001) * 100
                    eff = ret_contrib / risk_contrib if risk_contrib > 0 else 0
                    efficiency.append(eff)
                
                fig_attr.add_trace(
                    go.Scatter(
                        x=vol_values,
                        y=contrib_values,
                        mode='markers+text',
                        text=assets,
                        textposition='top center',
                        name='Eficiência',
                        marker=dict(
                            size=[weights.get(asset, 0) * 1000 + 10 for asset in assets],
                            color=efficiency,
                            colorscale='Viridis',
                            showscale=True,
                            colorbar=dict(title="Eficiência")
                        ),
                        hovertemplate='Ativo: %{text}<br>Risco: %{x:.2f}%<br>Retorno: %{y:.2f}%<br>Eficiência: %{marker.color:.2f}<extra></extra>',
                        showlegend=False
                    ),
                    row=2, col=1
                )
                
                # Gráfico 4: Sharpe decomposition
                asset_sharpe = []
                for asset in assets:
                    asset_ret = returns[asset].mean() * 252
                    asset_vol = returns[asset].std() * np.sqrt(252)
                    sharpe = asset_ret / asset_vol if asset_vol > 0 else 0
                    asset_sharpe.append(sharpe)
                
                fig_attr.add_trace(
                    go.Bar(
                        x=assets,
                        y=asset_sharpe,
                        name='Sharpe Individual',
                        marker_color='purple',
                        hovertemplate='Ativo: %{x}<br>Sharpe: %{y:.3f}<extra></extra>',
                        showlegend=False
                    ),
                    row=2, col=2
                )
                
                # Linha do Sharpe do portfólio
                portfolio_sharpe = portfolio.annualized_sharpe_ratio if hasattr(portfolio, 'annualized_sharpe_ratio') else 0
                fig_attr.add_hline(
                    y=portfolio_sharpe,
                    line=dict(color='red', dash='dash', width=2),
                    annotation_text=f'Portfólio: {portfolio_sharpe:.3f}',
                    row=2, col=2
                )
                
                fig_attr.update_layout(
                    title={
                        'text': 'Análise de Atribuição de Performance',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    height=700,
                    margin=dict(t=80, b=50, l=50, r=50)
                )
                
                charts['performance_attribution'] = fig_attr.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar performance attribution: {e}")
            
            # 9. 📈 NOVO: Rolling Metrics (Métricas Móveis)
            try:
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                window = min(60, len(portfolio_returns) // 4)  # Janela de 60 dias ou 1/4 dos dados
                
                # Calcular métricas móveis
                rolling_return = portfolio_returns.rolling(window).mean() * 252
                rolling_vol = portfolio_returns.rolling(window).std() * np.sqrt(252)
                rolling_sharpe = rolling_return / rolling_vol
                
                # Calcular beta móvel se houver benchmark
                rolling_beta = pd.Series(index=portfolio_returns.index, dtype=float)
                if len([col for col in returns.columns if col.startswith('^')]) > 0:
                    benchmark_col = [col for col in returns.columns if col.startswith('^')][0]
                    benchmark_returns = returns[benchmark_col]
                    
                    for i in range(window, len(portfolio_returns)):
                        port_window = portfolio_returns.iloc[i-window:i]
                        bench_window = benchmark_returns.iloc[i-window:i]
                        
                        covariance = np.cov(port_window, bench_window)[0, 1]
                        benchmark_var = np.var(bench_window)
                        
                        rolling_beta.iloc[i] = covariance / benchmark_var if benchmark_var > 0 else 1
                
                fig_rolling = make_subplots(
                    rows=2, cols=2,
                    subplot_titles=[
                        f'Retorno Móvel ({window}d)',
                        f'Volatilidade Móvel ({window}d)',
                        f'Sharpe Ratio Móvel ({window}d)',
                        f'Beta Móvel ({window}d)' if not rolling_beta.isna().all() else 'VaR Móvel (95%)'
                    ],
                    vertical_spacing=0.15,
                    horizontal_spacing=0.1
                )
                
                # Retorno móvel
                fig_rolling.add_trace(
                    go.Scatter(
                        x=rolling_return.index,
                        y=rolling_return * 100,
                        mode='lines',
                        name='Retorno Móvel',
                        line=dict(color='blue', width=2),
                        hovertemplate='Data: %{x}<br>Retorno: %{y:.2f}%<extra></extra>',
                        showlegend=False
                    ),
                    row=1, col=1
                )
                
                # Volatilidade móvel
                fig_rolling.add_trace(
                    go.Scatter(
                        x=rolling_vol.index,
                        y=rolling_vol * 100,
                        mode='lines',
                        name='Volatilidade Móvel',
                        line=dict(color='red', width=2),
                        hovertemplate='Data: %{x}<br>Volatilidade: %{y:.2f}%<extra></extra>',
                        showlegend=False
                    ),
                    row=1, col=2
                )
                
                # Sharpe móvel
                fig_rolling.add_trace(
                    go.Scatter(
                        x=rolling_sharpe.index,
                        y=rolling_sharpe,
                        mode='lines',
                        name='Sharpe Móvel',
                        line=dict(color='green', width=2),
                        hovertemplate='Data: %{x}<br>Sharpe: %{y:.3f}<extra></extra>',
                        showlegend=False
                    ),
                    row=2, col=1
                )
                
                # Beta móvel ou VaR
                if not rolling_beta.isna().all():
                    fig_rolling.add_trace(
                        go.Scatter(
                            x=rolling_beta.index,
                            y=rolling_beta,
                            mode='lines',
                            name='Beta Móvel',
                            line=dict(color='purple', width=2),
                            hovertemplate='Data: %{x}<br>Beta: %{y:.3f}<extra></extra>',
                            showlegend=False
                        ),
                        row=2, col=2
                    )
                    
                    # Linha de referência para beta = 1
                    fig_rolling.add_hline(
                        y=1.0,
                        line=dict(color='gray', dash='dash', width=1),
                        annotation_text='Beta = 1.0',
                        row=2, col=2
                    )
                else:
                    # VaR móvel como alternativa
                    rolling_var = portfolio_returns.rolling(window).quantile(0.05) * 100
                    fig_rolling.add_trace(
                        go.Scatter(
                            x=rolling_var.index,
                            y=rolling_var,
                            mode='lines',
                            name='VaR 95% Móvel',
                            line=dict(color='orange', width=2),
                            hovertemplate='Data: %{x}<br>VaR 95%: %{y:.2f}%<extra></extra>',
                            showlegend=False
                        ),
                        row=2, col=2
                    )
                
                fig_rolling.update_layout(
                    title={
                        'text': f'Métricas Móveis de Risco-Retorno (Janela: {window} dias)',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    height=600,
                    margin=dict(t=80, b=50, l=50, r=50),
                    hovermode='x unified'
                )
                
                charts['rolling_metrics'] = fig_rolling.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar métricas móveis: {e}")
            
            # 10. 🌡️ NOVO: Volatility Surface (Superfície de Volatilidade)
            try:
                # Calcular volatilidade por diferentes janelas temporais
                windows = [5, 10, 20, 30, 60, 90, 120, 180, 252]
                vol_surface = pd.DataFrame(index=returns.index)
                
                portfolio_returns = (returns * pd.Series(weights)).sum(axis=1)
                
                for window in windows:
                    if window <= len(portfolio_returns):
                        vol_surface[f'{window}d'] = portfolio_returns.rolling(window).std() * np.sqrt(252) * 100
                
                # Criar heatmap da superfície de volatilidade
                # Reduzir densidade para melhor visualização
                vol_surface_sample = vol_surface.iloc[::max(1, len(vol_surface)//100)]  # Max 100 pontos
                
                fig_volsurf = go.Figure(data=go.Heatmap(
                    z=vol_surface_sample.values.T,
                    x=vol_surface_sample.index,
                    y=[f'{w}d' for w in windows if f'{w}d' in vol_surface_sample.columns],
                    colorscale='Viridis',
                    hoverongaps=False,
                    hovertemplate='Data: %{x}<br>Janela: %{y}<br>Volatilidade: %{z:.2f}%<extra></extra>'
                ))
                
                fig_volsurf.update_layout(
                    title={
                        'text': 'Superfície de Volatilidade (Por Janela Temporal)',
                        'x': 0.5,
                        'font': {'size': 16}
                    },
                    xaxis_title='Data',
                    yaxis_title='Janela Temporal',
                    height=500,
                    margin=dict(t=50, b=50, l=50, r=50)
                )
                
                charts['volatility_surface'] = fig_volsurf.to_html(
                    include_plotlyjs='https://cdn.plot.ly/plotly-3.0.1.min.js',
                    config={'displayModeBar': True, 'responsive': True}
                )
                
            except Exception as e:
                self.logger.warning(f"Erro ao gerar superfície de volatilidade: {e}")
            
            self.logger.info(f"✅ Gerados {len(charts)} gráficos: {list(charts.keys())}")
            return charts
            
        except ImportError:
            self.logger.error("Plotly não está instalado. Instale com: pip install plotly")
            return {"error": "Plotly não está disponível"}
        except Exception as e:
            self.logger.error(f"Erro geral ao gerar gráficos: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": f"Erro ao gerar gráficos: {str(e)}"}

    def optimize_black_litterman(
        self,
        returns: pd.DataFrame,
        config: Optional[OptimizationConfig] = None,
        views: Optional[List[str]] = None,
        market_caps: Optional[pd.Series] = None
    ):
        """
        Otimização Black-Litterman básica ou com views customizadas
        
        Args:
            returns: DataFrame com retornos
            config: Configuração de otimização
            views: Lista de views (opcional - se None, usa views neutras)
            market_caps: Capitalização de mercado (opcional)
            
        Returns:
            Tuple com modelo e portfólio otimizado
        """
        if config is None:
            config = self.default_optimization_config
        
        try:
            # Se não houver views, criar views neutras baseadas nos ativos
            if views is None:
                # Gerar views neutras (retorno esperado igual à média histórica)
                asset_names = returns.columns.tolist()
                mean_returns = returns.mean()
                
                # Criar views neutras com incerteza moderada
                views = []
                for asset in asset_names:
                    expected_return = mean_returns[asset] * 252  # Anualizar
                    # View neutra: esperamos que o retorno seja próximo à média histórica
                    # Usar formato mais compatível com SKFolio
                    views.append(f"{asset} == {expected_return:.8f}")
                
                self.logger.info(f"Criadas {len(views)} views neutras para Black-Litterman")
            
            # Usar Black-Litterman com views (neutras ou customizadas)
            bl_kwargs = {'views': views}
            if market_caps is not None:
                bl_kwargs['market_caps'] = market_caps
            
            bl_prior = BlackLitterman(**bl_kwargs)
            
            model = MeanRisk(
                objective_function=config.objective_function,
                risk_measure=config.risk_measure,
                prior_estimator=bl_prior,
                min_weights=config.min_weights,
                max_weights=config.max_weights,
                budget=config.budget,
                solver=config.solver,
                solver_params=config.solver_params
            )
            
            model.fit(returns)
            portfolio = model.predict(returns)
            
            self.logger.info(f"Otimização Black-Litterman concluída. "
                            f"Sharpe Ratio: {portfolio.annualized_sharpe_ratio:.4f}")
            
            return model, portfolio
            
        except Exception as e:
            self.logger.error(f"Erro na otimização Black-Litterman: {str(e)}")
            # Fallback para Mean-Risk padrão em caso de erro
            self.logger.warning("Usando fallback para Mean-Risk devido ao erro no Black-Litterman")
            return self.optimize_mean_risk(returns, config)

    def robust_data_validation(self, returns: pd.DataFrame, min_observations: int = 30) -> tuple[bool, str]:
        """
        🛡️ VALIDAÇÃO ROBUSTA DE DADOS PARA OTIMIZAÇÃO
        
        Args:
            returns: DataFrame com retornos
            min_observations: Mínimo de observações necessárias
            
        Returns:
            (is_valid, message)
        """
        issues = []
        
        # Verificar dimensões
        if len(returns) < min_observations:
            issues.append(f"Poucas observações: {len(returns)} < {min_observations}")
            
        if len(returns.columns) < 2:
            issues.append(f"Poucos ativos: {len(returns.columns)} < 2")
            
        # Verificar dados válidos
        if returns.isnull().sum().sum() > len(returns) * 0.1:  # Mais de 10% de NaN
            issues.append("Muitos valores nulos nos dados")
            
        # Verificar variância
        zero_variance_assets = returns.columns[returns.var() < 1e-8].tolist()
        if zero_variance_assets:
            issues.append(f"Ativos sem variância: {zero_variance_assets}")
            
        # Verificar correlação extrema
        if len(returns.columns) > 1:
            corr_matrix = returns.corr()
            high_corr = (corr_matrix.abs() > 0.99) & (corr_matrix != 1.0)
            if high_corr.any().any():
                issues.append("Correlação extrema entre ativos detectada")
        
        is_valid = len(issues) == 0
        message = "; ".join(issues) if issues else "Dados válidos"
        
        return is_valid, message

    def get_recommended_period_for_assets(self, n_assets: int) -> str:
        """
        🎯 RECOMENDA PERÍODO BASEADO NO NÚMERO DE ATIVOS
        
        Args:
            n_assets: Número de ativos
            
        Returns:
            Período recomendado
        """
        if n_assets <= 2:
            return "1y"  # Mais dados para poucos ativos
        elif n_assets <= 5:
            return "2y"
        else:
            return "3y"

# Instância global do serviço
skfolio_service = SKFolioService()

def get_skfolio_service() -> SKFolioService:
    """Retorna instância global do serviço SKFolio"""
    return skfolio_service 