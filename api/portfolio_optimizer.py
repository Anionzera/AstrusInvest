import pandas as pd
import numpy as np
import yfinance as yf
from pypfopt import expected_returns, risk_models, objective_functions
from pypfopt import EfficientFrontier, BlackLittermanModel, HRPOpt, CLA
from pypfopt import DiscreteAllocation
from pypfopt.black_litterman import BlackLittermanModel, market_implied_risk_aversion, market_implied_prior_returns
from pypfopt.risk_models import CovarianceShrinkage, risk_matrix
from pypfopt.efficient_frontier import EfficientCVaR
from pypfopt.expected_returns import mean_historical_return, ema_historical_return, capm_return
from pypfopt.hierarchical_portfolio import HRPOpt
from pypfopt.cla import CLA
import logging
from ml_return_predictor import MLReturnPredictor
from services.performance_analyzer import PerformanceAnalyzer
from typing import Dict, Any

# Configuração de logging
logger = logging.getLogger('portfolio-optimizer')
logger.setLevel(logging.INFO)

# Verificar se o logger já tem handlers para evitar duplicados
if not logger.handlers:
    # Adicionar handler para stdout
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Implementação da função james_stein_shrinkage que não está disponível na versão atual
def james_stein_shrinkage(returns, frequency=252):
    """
    Implementação do método James-Stein Shrinkage para estimativa de retornos esperados.
    
    O método de encolhimento (shrinkage) de James-Stein reduz o impacto de valores extremos
    e ajuda a mitigar o problema de overfitting ao estimar retornos esperados.
    
    Args:
        returns (pd.DataFrame): dataframe de retornos diários de ativos
        frequency (int): número de períodos em um ano, para anualização (252 para dias úteis)
    
    Returns:
        pd.Series: série com retornos esperados anualizados após aplicação do shrinkage
    """
    mean_returns = returns.mean() * frequency
    global_mean = mean_returns.mean()
    
    # Fator de encolhimento (shrinkage)
    # Quanto maior o número de ativos em relação ao número de observações,
    # maior o encolhimento em direção à média global
    n_assets = len(returns.columns)
    n_observations = len(returns)
    
    # Cálculo do fator de shrinkage (simplificado)
    shrinkage_factor = min(0.5, n_assets / n_observations)
    
    # Aplicar shrinkage
    shrunk_returns = (1 - shrinkage_factor) * mean_returns + shrinkage_factor * global_mean
    
    return shrunk_returns

class PortfolioOptimizer:
    def __init__(self):
        self.prices = None
        self.returns = None
        self.cov_matrix = None
        self.ef = None
        self.weights = None
        self.performance = None
        self.allocation = None
        self.asset_categories = {}  # Mapeamento de assets para categorias
        self.ml_predictor = None    # Preditor de ML para retornos
        self.cla = None             # Critical Line Algorithm
        self.risk_model = None      # Modelo de risco utilizado
        self.returns_model = None   # Modelo de retornos utilizado
        self.benchmark = None       # Benchmark para CAPM
        
    def load_data(self, tickers, periodo="2y", fonte="yahoo", asset_categories=None):
        """
        Carrega dados históricos para um conjunto de ativos
        
        Args:
            tickers (list): Lista de tickers dos ativos
            periodo (str): Período de dados a serem recuperados (ex: 1y, 2y, 5y)
            fonte (str): Fonte de dados (apenas 'yahoo' suportado por enquanto)
            asset_categories (dict): Mapeamento de tickers para categorias de ativos
        
        Returns:
            bool: True se os dados foram carregados com sucesso
        """
        try:
            # Armazenar categorias de ativos, se fornecidas
            if asset_categories:
                self.asset_categories = asset_categories
                logger.info(f"Categorias de ativos fornecidas para {len(asset_categories)} ativos")
            
            if fonte == "yahoo":
                logger.info(f"Carregando dados de {len(tickers)} ativos do Yahoo Finance")
                
                # Mapeamento de tickers comuns para seus símbolos corretos no Yahoo Finance
                ticker_mapping = {
                    # Índices
                    "IBOV": "^BVSP",      # Ibovespa
                    "IBOV.SA": "^BVSP",   # Ibovespa 
                    "BOVESPA": "^BVSP",   # Ibovespa
                    "SP500": "^GSPC",     # S&P 500
                    "S&P500": "^GSPC",    # S&P 500
                    "S&P": "^GSPC",       # S&P 500
                    "NASDAQ": "^IXIC",    # NASDAQ Composite
                    "DOW": "^DJI",        # Dow Jones
                    "DJIA": "^DJI",       # Dow Jones
                    "NIKKEI": "^N225",    # Nikkei 225
                    "FTSE": "^FTSE",      # FTSE 100
                    "DAX": "^GDAXI",      # DAX
                    
                    # Criptomoedas principais são formatadas automaticamente abaixo
                }
                
                # Formatar tickers
                formatted_tickers = []
                valid_tickers = []
                
                for ticker in tickers:
                    # Verificar se o ticker está no mapeamento especial
                    if ticker in ticker_mapping:
                        formatted_ticker = ticker_mapping[ticker]
                    # Formatar criptomoedas
                    elif ticker.upper() in ["BTC", "ETH", "XRP", "LTC", "ADA", "DOT", "BNB", "DOGE", "SOL", "USDT", "USDC"]:
                        formatted_ticker = f"{ticker.upper()}-USD"
                    # Formatar ações brasileiras
                    elif ('.' not in ticker and not ticker.startswith('^') and 
                          not ticker.endswith('-USD') and not ticker.endswith('=X')):
                        formatted_ticker = f"{ticker}.SA"
                    else:
                        formatted_ticker = ticker
                    
                    formatted_tickers.append(formatted_ticker)
                    valid_tickers.append(ticker)  # Manter registro do ticker original
                
                # Baixar dados com tratamento de erros mais robusto
                try:
                    # Tentar baixar todos os tickers de uma vez com auto_adjust=False para ter Adj Close
                    data = yf.download(formatted_tickers, period=periodo, auto_adjust=False)
                    
                    # Se dados válidos foram encontrados
                    if not data.empty:
                        # Priorizar 'Adj Close' sobre 'Close'
                        if 'Adj Close' in data.columns:
                            self.prices = data['Adj Close']
                            logger.info("Usando 'Adj Close' para dados de preços")
                        elif 'Close' in data.columns:
                            logger.warning("Coluna 'Adj Close' não encontrada, usando 'Close' como alternativa")
                            self.prices = data['Close']
                        else:
                            # Se nem Close estiver disponível, use o primeiro tipo de preço disponível
                            logger.warning(f"Colunas 'Adj Close' e 'Close' não encontradas. Colunas disponíveis: {data.columns.levels[0]}")
                            self.prices = data[data.columns.levels[0][0]]
                        
                        # Remover colunas completamente vazias
                        self.prices = self.prices.dropna(axis=1, how='all')
                        
                        # Se não conseguimos dados suficientes, tentar baixar individualmente
                        if self.prices.shape[1] < 2 and len(formatted_tickers) > 2:
                            logger.warning(f"Apenas {self.prices.shape[1]} ativos com dados válidos ao baixar em lote. Tentando baixar individualmente...")
                            return self._load_data_individually(formatted_tickers, valid_tickers, periodo)
                    else:
                        # Se a matriz de dados estiver vazia, tentar baixar individualmente
                        logger.warning("Dados vazios ao baixar em lote. Tentando baixar individualmente...")
                        return self._load_data_individually(formatted_tickers, valid_tickers, periodo)
                
                except Exception as e:
                    logger.error(f"Erro ao baixar dados em lote: {str(e)}. Tentando baixar individualmente...")
                    return self._load_data_individually(formatted_tickers, valid_tickers, periodo)
                
                # Verificar se ainda temos dados suficientes
                if self.prices.shape[1] < 2:
                    logger.error(f"Número insuficiente de ativos com dados válidos: {self.prices.shape[1]}")
                    return False
                
                # Preencher NaN restantes com o último valor disponível
                self.prices = self.prices.ffill()
                self.prices = self.prices.dropna()  # Remover linhas iniciais com NaN
                
                # Verificar novamente após remoção de NaN
                if len(self.prices) < 30:  # Precisamos de pelo menos 30 observações
                    logger.error(f"Número insuficiente de observações após remoção de NaN: {len(self.prices)}")
                    return False
                
                # Calcular retornos
                self.returns = self.prices.pct_change().dropna()
                
                logger.info(f"Dados carregados com sucesso para {self.prices.shape[1]} ativos")
                return True
            else:
                logger.error(f"Fonte de dados '{fonte}' não suportada")
                return False
        except Exception as e:
            logger.error(f"Erro ao carregar dados: {str(e)}")
            return False
            
    def _load_data_individually(self, formatted_tickers, original_tickers, periodo):
        """
        Carrega dados históricos individualmente para cada ticker, ignorando os que falham
        """
        all_prices = {}
        successful_tickers = []
        
        # Mapeamento de tickers formatados para originais
        ticker_map = dict(zip(formatted_tickers, original_tickers))
        
        for ticker in formatted_tickers:
            try:
                # Tentar baixar dados para este ticker com auto_adjust=False
                data = yf.download(ticker, period=periodo, auto_adjust=False)
                
                if data.empty:
                    logger.warning(f"Sem dados para {ticker}")
                    continue
                
                # Priorizar 'Adj Close' sobre 'Close'
                if 'Adj Close' in data.columns:
                    prices = data['Adj Close']
                    logger.info(f"Usando 'Adj Close' para {ticker}")
                elif 'Close' in data.columns:
                    prices = data['Close']
                    logger.warning(f"Usando 'Close' para {ticker} (Adj Close não disponível)")
                else:
                    # Se não tem Adj Close nem Close, pular
                    logger.warning(f"Sem dados de preço para {ticker}")
                    continue
                
                # Verificar se temos dados suficientes
                if len(prices.dropna()) < 30:
                    logger.warning(f"Dados insuficientes para {ticker} ({len(prices.dropna())} dias)")
                    continue
                
                # Adicionar à lista de preços
                all_prices[ticker] = prices
                
                # Registrar que este ticker foi bem-sucedido
                original_ticker = ticker_map.get(ticker, ticker)
                if original_ticker in self.asset_categories:
                    # Atualizar a categoria para usar o ticker formatado
                    category = self.asset_categories[original_ticker]
                    self.asset_categories[ticker] = category
                    if original_ticker != ticker:
                        del self.asset_categories[original_ticker]
                
                successful_tickers.append(ticker)
                logger.info(f"Dados carregados com sucesso para {ticker}")
                
            except Exception as e:
                logger.warning(f"Erro ao baixar dados para {ticker}: {str(e)}")
        
        # Verificar se temos ativos suficientes
        if len(all_prices) < 2:
            logger.error(f"Número insuficiente de ativos com dados válidos: {len(all_prices)}")
            return False
        
        # Criar DataFrame com todos os preços
        self.prices = pd.DataFrame(all_prices)
        
        # Preencher NaN restantes com o último valor disponível
        self.prices = self.prices.ffill()
        self.prices = self.prices.dropna()  # Remover linhas iniciais com NaN
        
        # Calcular retornos
        self.returns = self.prices.pct_change().dropna()
        
        logger.info(f"Dados carregados com sucesso para {self.prices.shape[1]} ativos: {', '.join(successful_tickers)}")
        return True
    
    def optimize_portfolio(self, method="efficient_frontier", risk_free_rate=0.1, target_return=None, 
                          target_risk=None, weight_bounds=(0, 1), category_constraints=None, 
                          use_ml_predictions=False, returns_model="mean_historical", 
                          risk_model="sample_cov", benchmark=None, 
                          cvar_beta=0.95, shrinkage_method="ledoit_wolf"):
        """
        Otimiza a carteira utilizando um dos métodos disponíveis
        
        Args:
            method (str): Método de otimização ('efficient_frontier', 'black_litterman', 'hrp', etc.)
            risk_free_rate (float): Taxa livre de risco anualizada (ex: 0.1 para 10%)
            target_return (float): Retorno alvo anualizado para otimização
            target_risk (float): Risco alvo anualizado para otimização
            weight_bounds (tuple): Limites de peso para cada ativo (min, max)
            category_constraints (dict): Restrições de alocação por categoria de ativos
                                       Formato: {"categoria": (min_weight, target_weight, max_weight)}
            use_ml_predictions (bool): Se True, usa predições de ML em vez de média histórica
            returns_model (str): Modelo para estimativa de retornos esperados:
                                "mean_historical", "ema_historical", "capm", "james_stein"
            risk_model (str): Modelo para estimativa da matriz de covariância:
                              "sample_cov", "semicovariance", "exp_cov", "ledoit_wolf", "oracle_approximating"
            benchmark (str): Ticker do benchmark para CAPM (ex: "^BVSP" para Ibovespa)
            cvar_beta (float): Nível de confiança para otimização CVaR (0-1)
            shrinkage_method (str): Método de encolhimento para CovarianceShrinkage
            
        Returns:
            dict: Resultado da otimização com pesos, desempenho e métricas
        """
        if self.prices is None or self.returns is None:
            logger.error("Dados não carregados. Use load_data() primeiro.")
            return None
        
        try:
            # Armazenar benchmark se fornecido
            self.benchmark = benchmark
            
            # Obter estimativas de retorno
            if use_ml_predictions:
                logger.info("Usando predições de Machine Learning para estimativa de retornos e riscos")
                
                # Inicializar e treinar o preditor de ML se ainda não existe
                if self.ml_predictor is None:
                    self.ml_predictor = MLReturnPredictor()
                    ml_data_prepared = self.ml_predictor.prepare_data(self.prices)
                    
                    if not ml_data_prepared:
                        logger.error("Falha ao preparar dados para ML. Voltando para método tradicional.")
                        mu = self._get_expected_returns(returns_model)
                        S = self._get_risk_matrix(risk_model, shrinkage_method)
                    else:
                        # Obter predições de retorno do ML
                        mu = self.ml_predictor.predict_returns(self.prices)
                        
                        if mu is None:
                            logger.error("Falha ao prever retornos com ML. Voltando para método tradicional.")
                            mu = self._get_expected_returns(returns_model)
                            S = self._get_risk_matrix(risk_model, shrinkage_method)
                        else:
                            # Tentar usar predição de covariância de ML
                            ml_cov = self.ml_predictor.predict_risk(self.prices)
                            
                            if ml_cov is not None:
                                # Combinação da matriz de covariância histórica com predições de ML
                                S_historic = self._get_risk_matrix(risk_model, shrinkage_method)
                                
                                # Usar 70% histórico e 30% ML para balancear estabilidade e predição
                                S = 0.7 * S_historic + 0.3 * ml_cov
                                logger.info("Usando matriz de covariância combinada (histórica + ML)")
                            else:
                                # Se falhar a predição de risco ML, usar método tradicional
                                S = self._get_risk_matrix(risk_model, shrinkage_method)
                                logger.info("Usando matriz de covariância tradicional")
                else:
                    # Se o preditor já existe, apenas obter as predições
                    mu = self.ml_predictor.predict_returns(self.prices)
                    
                    if mu is None:
                        logger.error("Falha ao prever retornos com ML. Voltando para método tradicional.")
                        mu = self._get_expected_returns(returns_model)
                        S = self._get_risk_matrix(risk_model, shrinkage_method)
                    else:
                        # Tentar usar predição de covariância de ML
                        ml_cov = self.ml_predictor.predict_risk(self.prices)
                        
                        if ml_cov is not None:
                            # Combinação da matriz de covariância histórica com predições de ML
                            S_historic = self._get_risk_matrix(risk_model, shrinkage_method)
                            
                            # Usar 70% histórico e 30% ML para balancear estabilidade e predição
                            S = 0.7 * S_historic + 0.3 * ml_cov
                        else:
                            # Se falhar a predição de risco ML, usar método tradicional
                            S = self._get_risk_matrix(risk_model, shrinkage_method)
            else:
                # Método tradicional: usar retornos históricos e matriz de covariância
                mu = self._get_expected_returns(returns_model)
                S = self._get_risk_matrix(risk_model, shrinkage_method)
            
            # Armazenar modelo utilizado
            self.returns_model = returns_model
            self.risk_model = risk_model
            
            # Verificar qual método de otimização usar
            if method == "efficient_frontier":
                return self._optimize_efficient_frontier(mu, S, risk_free_rate, target_return, target_risk, weight_bounds, category_constraints)
            elif method == "black_litterman":
                return self._optimize_black_litterman(mu, S, risk_free_rate, weight_bounds, category_constraints)
            elif method == "hrp":
                return self._optimize_hrp(risk_free_rate, category_constraints)
            elif method == "equal_weight":
                return self._optimize_equal_weight(category_constraints, risk_free_rate)
            elif method == "min_volatility":
                return self._optimize_min_volatility(mu, S, risk_free_rate, weight_bounds, category_constraints)
            elif method == "max_sharpe":
                return self._optimize_max_sharpe(mu, S, risk_free_rate, weight_bounds, category_constraints)
            elif method == "efficient_cvar":
                return self._optimize_efficient_cvar(mu, self.returns, risk_free_rate, weight_bounds, category_constraints, cvar_beta)
            elif method == "cla":
                return self._optimize_cla(mu, S, risk_free_rate, weight_bounds, category_constraints)
            else:
                # Método padrão: fronteira eficiente
                return self._optimize_efficient_frontier(mu, S, risk_free_rate, target_return, target_risk, weight_bounds, category_constraints)
        except Exception as e:
            logger.error(f"Erro na otimização de portfólio: {str(e)}")
            return None
    
    def _get_expected_returns(self, method="mean_historical"):
        """
        Obtém estimativas de retornos esperados usando diferentes métodos
        
        Args:
            method (str): Método para estimativa de retornos
                          "mean_historical", "ema_historical", "capm", "james_stein"
        
        Returns:
            pd.Series: Série com retornos esperados anualizados
        """
        if method == "ema_historical":
            # Retornos históricos com média móvel exponencial (mais peso para dados recentes)
            return ema_historical_return(self.prices, span=180, frequency=252)
        elif method == "capm":
            # Retornos baseados no modelo CAPM
            if self.benchmark is None:
                logger.warning("Benchmark não fornecido para CAPM. Usando '^BVSP' como padrão.")
                benchmark = "^BVSP"
            else:
                benchmark = self.benchmark
                
            try:
                # USAR auto_adjust=False para ter Adj Close separado e sempre priorizar ele
                market_data = yf.download(benchmark, period="2y", progress=False, auto_adjust=False)
                
                # Priorizar Adj Close para benchmark do CAPM
                if 'Adj Close' in market_data.columns:
                    market_prices = market_data['Adj Close']
                    logger.info(f"✅ Usando Adj Close para benchmark CAPM {benchmark}")
                elif 'Close' in market_data.columns:
                    market_prices = market_data['Close']
                    logger.warning(f"⚠️ Adj Close não disponível, usando Close para benchmark CAPM {benchmark}")
                else:
                    raise ValueError(f"❌ Nenhuma coluna de preço encontrada para benchmark CAPM {benchmark}")
                
                return capm_return(self.prices, market_prices, frequency=252)
            except Exception as e:
                logger.error(f"Erro ao obter dados do benchmark para CAPM: {str(e)}")
                logger.info("Usando retornos históricos como alternativa")
                return mean_historical_return(self.prices, frequency=252)
        elif method == "james_stein":
            # Retornos com encolhimento James-Stein para reduzir overfitting
            # Usando nossa implementação personalizada
            return james_stein_shrinkage(self.returns, frequency=252)
        else:
            # Retornos históricos (método padrão)
            return mean_historical_return(self.prices, frequency=252)
    
    def _get_risk_matrix(self, method="sample_cov", shrinkage_method="ledoit_wolf"):
        """
        Obtém matriz de risco usando diferentes métodos
        
        Args:
            method (str): Método para estimativa da matriz de covariância
                          "sample_cov", "semicovariance", "exp_cov", "ledoit_wolf", "oracle_approximating"
            shrinkage_method (str): Método de encolhimento para CovarianceShrinkage
        
        Returns:
            pd.DataFrame: Matriz de covariância ou semicovariância
        """
        if method == "semicovariance":
            # Matriz de semicovariância (considera apenas retornos negativos)
            return risk_models.semicovariance(self.prices, frequency=252)
        elif method == "exp_cov":
            # Matriz de covariância com ponderação exponencial
            return risk_models.exp_cov(self.prices, span=180, frequency=252)
        elif method in ["ledoit_wolf", "oracle_approximating"]:
            # Matriz de covariância com encolhimento para reduzir ruído e estabilizar
            return CovarianceShrinkage(self.prices, frequency=252).ledoit_wolf()
        else:
            # Matriz de covariância amostral (método padrão)
            return risk_models.sample_cov(self.prices, frequency=252)
    
    def _infer_asset_categories(self):
        """Tenta inferir categorias de ativos a partir dos nomes dos tickers"""
        # Mapeamento simplificado para exemplificar
        category_patterns = {
            "Renda Fixa": ["TESOURO", "LFT", "LTN", "NTN", "CDB", "DEB", "FIDC"],
            "Renda Variável": ["PETR", "VALE", "ITUB", "BBDC", "ABEV", "WEGE", "MGLU"],
            "Fundos Imobiliários": ["FII", "KNRI", "HGLG", "MXRF", "BCFF", "XPLG"],
            "Internacional": ["IVVB", "BEEF", "NASD", "SP500"],
            "Fundos Multimercado": ["MULT", "HEDGE"]
        }
        
        for ticker in self.prices.columns:
            ticker_upper = ticker.upper().replace(".SA", "")
            category_found = False
            
            for category, patterns in category_patterns.items():
                for pattern in patterns:
                    if pattern in ticker_upper:
                        self.asset_categories[ticker] = category
                        category_found = True
                        break
                if category_found:
                    break
            
            if not category_found:
                # Categoria padrão para tickers não reconhecidos
                self.asset_categories[ticker] = "Outros"
    
    def _get_assets_by_category(self, category):
        """Retorna lista de ativos de uma determinada categoria"""
        if not self.asset_categories:
            return []
        
        return [ticker for ticker in self.prices.columns 
                if self.asset_categories.get(ticker) == category]
    
    def _optimize_efficient_frontier(self, mu, S, risk_free_rate, target_return, target_risk, weight_bounds, category_constraints):
        """Otimização usando fronteira eficiente com suporte a restrições por categoria"""
        ef = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
        
        # Aplicar restrições por categoria se existirem
        if category_constraints and self.asset_categories:
            self._apply_category_constraints(ef, category_constraints)
        
        if target_return is not None:
            ef.efficient_return(target_return=target_return)
        elif target_risk is not None:
            ef.efficient_risk(target_risk=target_risk)
        else:
            ef.max_sharpe(risk_free_rate=risk_free_rate)
        
        weights = ef.clean_weights()
        
        # Calcular métricas de desempenho esperado - USAR O MESMO risk_free_rate
        expected_return, expected_volatility, sharpe = ef.portfolio_performance(risk_free_rate=risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        self.ef = ef
        
        return {
            "weights": weights,
            "performance": {
                "expected_annual_return": expected_return,
                "annual_volatility": expected_volatility,
                "sharpe_ratio": sharpe
            },
            "category_allocations": category_allocations
        }
    
    def _optimize_black_litterman(self, mu, S, risk_free_rate, weight_bounds, category_constraints):
        """Otimização usando modelo Black-Litterman com suporte a restrições por categoria"""
        # Usar pesos de mercado iguais para simplificar
        market_caps = {ticker: 1 for ticker in self.prices.columns}
        
        # Criar o modelo Black-Litterman
        bl = BlackLittermanModel(S, pi="equal", market_caps=market_caps)
        
        # Gerar retornos equilibrados
        posterior_mu, posterior_S = bl.bl_returns()
        
        # Otimizar usando a fronteira eficiente
        ef = EfficientFrontier(posterior_mu, posterior_S, weight_bounds=weight_bounds)
        
        # Aplicar restrições por categoria se existirem
        if category_constraints and self.asset_categories:
            self._apply_category_constraints(ef, category_constraints)
        
        ef.max_sharpe(risk_free_rate=risk_free_rate)
        
        weights = ef.clean_weights()
        
        # Calcular métricas de desempenho esperado - USAR O MESMO risk_free_rate
        expected_return, expected_volatility, sharpe = ef.portfolio_performance(risk_free_rate=risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        self.ef = ef
        
        return {
            "weights": weights,
            "performance": {
                "expected_annual_return": expected_return,
                "annual_volatility": expected_volatility,
                "sharpe_ratio": sharpe
            },
            "category_allocations": category_allocations
        }
    
    def _optimize_hrp(self, risk_free_rate, category_constraints):
        """Otimização usando Hierarchical Risk Parity com ajustes para respeitar restrições por categoria"""
        # Utilizar algoritmo HRP (Hierarchical Risk Parity)
        hrp = HRPOpt(self.returns)
        original_weights = hrp.optimize()
        
        # Se não houver restrições de categoria, usar os pesos originais
        if not category_constraints or not self.asset_categories:
            weights = original_weights
        else:
            # Ajustar pesos para respeitar as restrições por categoria
            weights = self._adjust_weights_to_meet_constraints(original_weights, category_constraints)
        
        # Usar o mesmo risk_free_rate passado para o método optimize_portfolio
        performance = self._calculate_performance(weights, risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        
        return {
            "weights": weights,
            "performance": performance,
            "category_allocations": category_allocations
        }
    
    def _optimize_equal_weight(self, category_constraints, risk_free_rate):
        """Alocação de pesos iguais com ajustes para respeitar restrições por categoria"""
        n_assets = len(self.prices.columns)
        equal_weight = 1 / n_assets
        
        original_weights = {ticker: equal_weight for ticker in self.prices.columns}
        
        # Se não houver restrições de categoria, usar os pesos originais
        if not category_constraints or not self.asset_categories:
            weights = original_weights
        else:
            # Ajustar pesos para respeitar as restrições por categoria
            weights = self._adjust_weights_to_meet_constraints(original_weights, category_constraints)
        
        # Usar o parâmetro risk_free_rate passado para o método optimize_portfolio
        performance = self._calculate_performance(weights, risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        
        return {
            "weights": weights,
            "performance": performance,
            "category_allocations": category_allocations
        }
    
    def _optimize_min_volatility(self, mu, S, risk_free_rate, weight_bounds, category_constraints):
        """Otimização para mínima volatilidade com suporte a restrições por categoria"""
        ef = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
        
        # Aplicar restrições por categoria se existirem
        if category_constraints and self.asset_categories:
            self._apply_category_constraints(ef, category_constraints)
        
        ef.min_volatility()
        
        weights = ef.clean_weights()
        
        # Calcular métricas de desempenho esperado - USAR O MESMO risk_free_rate
        expected_return, expected_volatility, sharpe = ef.portfolio_performance(risk_free_rate=risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        self.ef = ef
        
        return {
            "weights": weights,
            "performance": {
                "expected_annual_return": expected_return,
                "annual_volatility": expected_volatility,
                "sharpe_ratio": sharpe
            },
            "category_allocations": category_allocations
        }
        
    def _optimize_max_sharpe(self, mu, S, risk_free_rate, weight_bounds, category_constraints):
        """Otimização para máximo índice de Sharpe com suporte a restrições por categoria"""
        ef = EfficientFrontier(mu, S, weight_bounds=weight_bounds)
        
        # Aplicar restrições por categoria se existirem
        if category_constraints and self.asset_categories:
            self._apply_category_constraints(ef, category_constraints)
        
        ef.max_sharpe(risk_free_rate=risk_free_rate)
        
        weights = ef.clean_weights()
        
        # Calcular métricas de desempenho esperado - USAR O MESMO risk_free_rate
        expected_return, expected_volatility, sharpe = ef.portfolio_performance(risk_free_rate=risk_free_rate)
        
        # Verificar se as restrições por categoria foram respeitadas
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        self.ef = ef
        
        return {
            "weights": weights,
            "performance": {
                "expected_annual_return": expected_return,
                "annual_volatility": expected_volatility,
                "sharpe_ratio": sharpe
            },
            "category_allocations": category_allocations
        }
    
    def _apply_category_constraints(self, ef, category_constraints):
        """Aplica restrições por categoria ao otimizador de fronteira eficiente"""
        logger.info(f"Aplicando restrições para {len(category_constraints)} categorias")
        
        for category, constraints in category_constraints.items():
            min_weight, target_weight, max_weight = constraints
            
            # Obter todos os ativos desta categoria
            category_assets = self._get_assets_by_category(category)
            
            if not category_assets:
                logger.warning(f"Nenhum ativo encontrado para a categoria {category}")
                continue
                
            logger.info(f"Categoria {category}: {len(category_assets)} ativos, limites: [{min_weight}, {target_weight}, {max_weight}]")
            
            # Criar função para soma dos pesos da categoria
            def category_sum(weights):
                return sum(weights[asset] for asset in category_assets)
            
            # Adicionar restrição de peso mínimo para a categoria
            if min_weight > 0:
                ef.add_constraint(lambda w: category_sum(w) >= min_weight)
            
            # Adicionar restrição de peso máximo para a categoria
            if max_weight < 1:
                ef.add_constraint(lambda w: category_sum(w) <= max_weight)
            
            # Tentar aproximar o peso alvo (objective function)
            if target_weight > 0:
                target_category = {}
                for asset in self.prices.columns:
                    # 1 para ativos desta categoria, 0 para outros
                    target_category[asset] = 1 if asset in category_assets else 0
                
                # Penalizar desvios do peso alvo para a categoria
                ef.add_objective(objective_functions.target_category(target_category, target_weight), weight=1.0)
    
    def _calculate_category_allocations(self, weights):
        """Calcula a alocação total por categoria com base nos pesos dos ativos"""
        if not self.asset_categories:
            return {}
        
        category_allocations = {}
        
        for ticker, weight in weights.items():
            category = self.asset_categories.get(ticker, "Outros")
            category_allocations[category] = category_allocations.get(category, 0) + weight
        
        return category_allocations
    
    def _adjust_weights_to_meet_constraints(self, original_weights, category_constraints):
        """Ajusta os pesos para atender às restrições por categoria em métodos sem support direto como HRP"""
        # Calcular alocação atual por categoria
        current_category_allocations = {}
        for ticker, weight in original_weights.items():
            category = self.asset_categories.get(ticker, "Outros")
            current_category_allocations[category] = current_category_allocations.get(category, 0) + weight
        
        # Verificar quais categorias precisam de ajuste
        categories_to_increase = {}
        categories_to_decrease = {}
        
        for category, (min_weight, target_weight, max_weight) in category_constraints.items():
            current_weight = current_category_allocations.get(category, 0)
            
            if current_weight < min_weight:
                categories_to_increase[category] = min_weight - current_weight
            elif current_weight > max_weight:
                categories_to_decrease[category] = current_weight - max_weight
        
        # Se não há ajustes necessários, retornar os pesos originais
        if not categories_to_increase and not categories_to_decrease:
            return original_weights
        
        # Criar cópia dos pesos originais para ajustar
        adjusted_weights = original_weights.copy()
        
        # Primeiro reduzir categorias que excedem os limites
        if categories_to_decrease:
            total_to_decrease = sum(categories_to_decrease.values())
            
            for category, excess in categories_to_decrease.items():
                category_assets = self._get_assets_by_category(category)
                total_category_weight = sum(original_weights[asset] for asset in category_assets)
                
                for asset in category_assets:
                    reduction_factor = excess / total_category_weight
                    adjusted_weights[asset] = adjusted_weights[asset] * (1 - reduction_factor)
        
        # Depois aumentar categorias abaixo dos limites
        if categories_to_increase:
            total_to_increase = sum(categories_to_increase.values())
            
            # Encontrar categorias que podem ser reduzidas
            available_categories = []
            for category in current_category_allocations:
                if category not in categories_to_increase and category not in categories_to_decrease:
                    min_constraint = category_constraints.get(category, (0, 0, 1))[0]
                    current = current_category_allocations[category]
                    if current > min_constraint:
                        available_categories.append(category)
            
            # Se não houver categorias disponíveis, ajustar proporcionalmente todas menos as que precisam aumentar
            if not available_categories:
                available_categories = [cat for cat in current_category_allocations 
                                       if cat not in categories_to_increase]
            
            # Calcular total disponível para redução
            total_available = sum(current_category_allocations[cat] for cat in available_categories)
            
            # Reduzir proporcionalmente as categorias disponíveis
            for category in available_categories:
                category_assets = self._get_assets_by_category(category)
                reduction_factor = total_to_increase / total_available
                
                for asset in category_assets:
                    adjusted_weights[asset] = adjusted_weights[asset] * (1 - reduction_factor)
            
            # Aumentar as categorias abaixo dos limites
            for category, shortfall in categories_to_increase.items():
                category_assets = self._get_assets_by_category(category)
                
                # Se não houver ativos nesta categoria, continuar
                if not category_assets:
                    continue
                
                # Distribuir o aumento igualmente entre os ativos da categoria
                increase_per_asset = shortfall / len(category_assets)
                
                for asset in category_assets:
                    adjusted_weights[asset] = adjusted_weights[asset] + increase_per_asset
        
        # Normalizar para garantir que a soma seja 1
        total = sum(adjusted_weights.values())
        for asset in adjusted_weights:
            adjusted_weights[asset] = adjusted_weights[asset] / total
        
        return adjusted_weights
    
    def _calculate_performance(self, weights, risk_free_rate):
        """Calcula métricas de desempenho para um conjunto de pesos"""
        portfolio_returns = np.sum(self.returns.mean() * pd.Series(weights)) * 252
        
        # Calcular matriz de covariância se ainda não existir
        if self.cov_matrix is None:
            self.cov_matrix = risk_models.sample_cov(self.prices, frequency=252)
            
        # Calcular volatilidade do portfólio
        portfolio_volatility = np.sqrt(
            np.dot(pd.Series(weights).T, np.dot(self.cov_matrix, pd.Series(weights)))
        ) * np.sqrt(252)
        
        # Calcular Sharpe ratio
        sharpe_ratio = (portfolio_returns - risk_free_rate) / portfolio_volatility
        
        return {
            "expected_annual_return": portfolio_returns,
            "annual_volatility": portfolio_volatility,
            "sharpe_ratio": sharpe_ratio
        }
    
    def get_discrete_allocation(self, total_portfolio_value):
        """
        Converte pesos fracionários em alocações discretas (números inteiros de ações)
        
        Args:
            total_portfolio_value (float): Valor total do portfólio para alocar
            
        Returns:
            dict: Alocação discreta (número de ações para cada ativo)
        """
        if self.weights is None:
            logger.error("Pesos não definidos. Execute optimize_portfolio() primeiro.")
            return None
        
        try:
            # Obter últimos preços
            latest_prices = self.prices.iloc[-1]
            
            # Criar alocação discreta
            da = DiscreteAllocation(self.weights, latest_prices, total_portfolio_value=total_portfolio_value)
            allocation, leftover = da.greedy_portfolio()
            
            self.allocation = allocation
            
            # Calcular alocação por categoria
            category_allocations = {}
            if self.asset_categories:
                category_values = {}
                
                for ticker, shares in allocation.items():
                    price = latest_prices[ticker]
                    value = shares * price
                    category = self.asset_categories.get(ticker, "Outros")
                    
                    category_values[category] = category_values.get(category, 0) + value
                
                # Converter valores para porcentagens
                for category, value in category_values.items():
                    category_allocations[category] = value / (total_portfolio_value - leftover)
            
            return {
                "allocation": allocation,
                "leftover": leftover,
                "weights": self.weights,
                "category_allocations": category_allocations
            }
        except Exception as e:
            logger.error(f"Erro na alocação discreta: {str(e)}")
            return None
    
    def generate_efficient_frontier(self, risk_free_rate=0.1, points=20, 
                                   returns_model="mean_historical", risk_model="sample_cov", 
                                   benchmark=None, shrinkage_method="ledoit_wolf"):
        """
        Gera pontos da fronteira eficiente para visualização
        
        Args:
            risk_free_rate (float): Taxa livre de risco
            points (int): Número de pontos a serem gerados
            returns_model (str): Modelo para estimativa de retornos esperados
            risk_model (str): Modelo para estimativa da matriz de covariância
            benchmark (str): Ticker do benchmark para CAPM
            shrinkage_method (str): Método de encolhimento para CovarianceShrinkage
            
        Returns:
            dict: Dados da fronteira eficiente para plotagem
        """
        if self.prices is None or self.returns is None:
            logger.error("Dados não carregados. Use load_data() primeiro.")
            return None
        
        try:
            # Armazenar benchmark se fornecido
            self.benchmark = benchmark
            
            # Calcular retornos esperados e matriz de covariância usando os modelos especificados
            mu = self._get_expected_returns(returns_model)
            S = self._get_risk_matrix(risk_model, shrinkage_method)
            
            # Gerar fronteira eficiente
            ef = EfficientFrontier(mu, S)
            
            # Determinar os limites da fronteira
            ef_min_vol = EfficientFrontier(mu, S)
            ef_min_vol.min_volatility()
            min_vol_ret, min_vol_risk, _ = ef_min_vol.portfolio_performance(risk_free_rate=risk_free_rate)
            
            ef_max_sharpe = EfficientFrontier(mu, S)
            ef_max_sharpe.max_sharpe(risk_free_rate=risk_free_rate)
            max_sharpe_ret, max_sharpe_risk, max_sharpe = ef_max_sharpe.portfolio_performance(risk_free_rate=risk_free_rate)
            
            # Gerar pontos ao longo da fronteira
            target_returns = np.linspace(min_vol_ret, max(mu) * 0.9, points)
            efficient_frontier_data = []
            
            for target_return in target_returns:
                try:
                    ef = EfficientFrontier(mu, S)
                    ef.efficient_return(target_return=target_return)
                    expected_return, expected_volatility, sharpe = ef.portfolio_performance(risk_free_rate=risk_free_rate)
                    efficient_frontier_data.append({
                        "return": expected_return,
                        "risk": expected_volatility,
                        "sharpe": sharpe
                    })
                except Exception:
                    continue
            
            # Adicionar ponto de mínima volatilidade
            efficient_frontier_data.append({
                "return": min_vol_ret,
                "risk": min_vol_risk,
                "sharpe": min_vol_ret / min_vol_risk,
                "label": "Min. Volatilidade"
            })
            
            # Adicionar ponto de máximo sharpe
            efficient_frontier_data.append({
                "return": max_sharpe_ret,
                "risk": max_sharpe_risk,
                "sharpe": max_sharpe,
                "label": "Max. Sharpe"
            })
            
            # Adicionar linha de alocação de capital (CAL)
            cal_points = []
            for risk in np.linspace(0, max(mu) * 0.5, 10):
                ret = risk_free_rate + (max_sharpe_ret - risk_free_rate) / max_sharpe_risk * risk
                cal_points.append({
                    "return": ret,
                    "risk": risk
                })
            
            # Adicionar informações sobre os modelos utilizados
            model_info = {
                "returns_model": returns_model,
                "risk_model": risk_model,
                "shrinkage_method": shrinkage_method if risk_model in ["ledoit_wolf", "oracle_approximating"] else "N/A"
            }
            
            return {
                "efficient_frontier": efficient_frontier_data,
                "capital_allocation_line": cal_points,
                "min_volatility": {"return": min_vol_ret, "risk": min_vol_risk},
                "max_sharpe": {"return": max_sharpe_ret, "risk": max_sharpe_risk},
                "models": model_info
            }
        except Exception as e:
            logger.error(f"Erro ao gerar fronteira eficiente: {str(e)}")
            return None
    
    def _optimize_cla(self, mu, S, risk_free_rate, weight_bounds, category_constraints):
        """Otimiza usando Critical Line Algorithm com suporte a restrições"""
        # Inicializar o CLA
        self.cla = CLA(mu, S)
        
        # Calcular fronteira eficiente
        self.cla.max_sharpe(risk_free_rate=risk_free_rate)
        weights = self.cla.clean_weights()
        
        # Calcular métricas de desempenho
        expected_return, expected_volatility, sharpe = self.cla.portfolio_performance(risk_free_rate=risk_free_rate)
        
        # Verificar restrições de categoria
        category_allocations = self._calculate_category_allocations(weights)
        
        self.weights = weights
        
        return {
            "weights": weights,
            "performance": {
                "expected_annual_return": expected_return,
                "annual_volatility": expected_volatility,
                "sharpe_ratio": sharpe
            },
            "category_allocations": category_allocations,
            "method": "cla"
        }
    
    def _optimize_efficient_cvar(self, mu, returns, risk_free_rate, weight_bounds, category_constraints, beta=0.95):
        """Otimiza usando CVaR (Conditional Value at Risk) com suporte a restrições"""
        try:
            # Inicializar o otimizador de CVaR
            ef_cvar = EfficientCVaR(returns, beta=beta)
            
            # Aplicar restrições por categoria se existirem
            if category_constraints and self.asset_categories:
                self._apply_category_constraints(ef_cvar, category_constraints)
            
            # Otimizar para minimizar CVaR
            ef_cvar.min_cvar()
            
            weights = ef_cvar.clean_weights()
            
            # Calcular métricas de desempenho
            expected_return, cvar, sharpe = ef_cvar.portfolio_performance(risk_free_rate=risk_free_rate)
            
            # Calcular volatilidade usando a matriz de covariância convencional para referência
            S = risk_models.sample_cov(self.prices, frequency=252)
            volatility = np.sqrt(
                np.dot(pd.Series(weights).T, np.dot(S, pd.Series(weights)))
            ) * np.sqrt(252)
            
            # Verificar restrições de categoria
            category_allocations = self._calculate_category_allocations(weights)
            
            self.weights = weights
            
            return {
                "weights": weights,
                "performance": {
                    "expected_annual_return": expected_return,
                    "annual_volatility": volatility,
                    "cvar": cvar,
                    "sharpe_ratio": sharpe
                },
                "category_allocations": category_allocations,
                "method": "efficient_cvar"
            }
        except Exception as e:
            logger.error(f"Erro na otimização CVaR: {str(e)}")
            # Fallback para método de fronteira eficiente tradicional
            logger.info("Usando fronteira eficiente como fallback")
            return self._optimize_efficient_frontier(mu, self._get_risk_matrix(), risk_free_rate, None, None, weight_bounds, category_constraints)
            
    def calculate_portfolio_performance_analysis(self, 
                                                weights: Dict[str, float],
                                                benchmark_ticker: str = "^BVSP",
                                                risk_free_rate: float = 0.0525,
                                                analysis_period_months: int = 12) -> Dict[str, Any]:
        """
        Calcula análise completa de performance usando pyfolio e empyrical
        
        Args:
            weights: Pesos do portfólio
            benchmark_ticker: Ticker do benchmark (padrão: Ibovespa)
            risk_free_rate: Taxa livre de risco anual (padrão: 5.25% - Selic)
            analysis_period_months: Período de análise em meses
            
        Returns:
            Dict com análise completa de performance
        """
        try:
            # Calcular retornos do portfólio
            portfolio_returns = self._calculate_portfolio_returns(weights)
            
            # Obter benchmark
            benchmark_returns = self._get_benchmark_returns(benchmark_ticker, analysis_period_months)
            
            # Criar analisador de performance
            analyzer = PerformanceAnalyzer()
            analyzer.set_portfolio_data(
                returns=portfolio_returns,
                benchmark_returns=benchmark_returns
            )
            
            # Calcular métricas completas
            performance_metrics = analyzer.calculate_performance_metrics(
                risk_free_rate=risk_free_rate
            )
            
            # Gerar tearsheet
            tearsheet_base64 = analyzer.generate_pyfolio_tearsheet(return_fig=True)
            
            # Calcular métricas rolling se há dados suficientes
            rolling_metrics = None
            if len(portfolio_returns) >= 63:  # ~3 meses de dados
                rolling_metrics = analyzer.calculate_rolling_metrics(
                    window=min(63, len(portfolio_returns) // 2),
                    metrics=['sharpe_ratio', 'volatility', 'max_drawdown']
                )
                rolling_metrics = rolling_metrics.dropna().tail(30).to_dict('records')
            
            return {
                "portfolio_metrics": performance_metrics,
                "tearsheet_image": tearsheet_base64,
                "rolling_metrics": rolling_metrics,
                "analysis_info": {
                    "portfolio_periods": len(portfolio_returns),
                    "benchmark_ticker": benchmark_ticker,
                    "risk_free_rate": risk_free_rate,
                    "analysis_period_months": analysis_period_months,
                    "start_date": portfolio_returns.index[0].isoformat() if len(portfolio_returns) > 0 else None,
                    "end_date": portfolio_returns.index[-1].isoformat() if len(portfolio_returns) > 0 else None
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de performance: {e}")
            return {
                "error": str(e),
                "portfolio_metrics": {},
                "tearsheet_image": None,
                "rolling_metrics": None
            }
    
    def _calculate_portfolio_returns(self, weights: Dict[str, float]) -> pd.Series:
        """
        Calcula série temporal de retornos do portfólio
        """
        if self.returns is None or self.returns.empty:
            raise ValueError("Dados de retornos não disponíveis")
        
        # Filtrar apenas ativos com pesos > 0
        active_weights = {ticker: weight for ticker, weight in weights.items() if weight > 0}
        
        # Calcular retornos do portfólio
        portfolio_returns = pd.Series(0.0, index=self.returns.index)
        
        for ticker, weight in active_weights.items():
            if ticker in self.returns.columns:
                portfolio_returns += weight * self.returns[ticker].fillna(0)
        
        # Remover valores nulos e extremos
        portfolio_returns = portfolio_returns.dropna()
        portfolio_returns = portfolio_returns.replace([np.inf, -np.inf], np.nan).dropna()
        
        # Remover timezone para compatibilidade
        if portfolio_returns.index.tz is not None:
            portfolio_returns.index = portfolio_returns.index.tz_localize(None)
        
        return portfolio_returns
    
    def _get_benchmark_returns(self, benchmark_ticker: str, months: int) -> pd.Series:
        """
        Obtém retornos do benchmark para o período especificado usando SEMPRE Adj Close
        """
        try:
            import yfinance as yf
            from datetime import datetime, timedelta
            
            # Calcular período
            end_date = datetime.now()
            start_date = end_date - timedelta(days=months * 30)
            
            # Baixar dados do benchmark usando auto_adjust=False para ter Adj Close separado
            data = yf.download(benchmark_ticker, start=start_date, end=end_date, 
                             interval="1d", progress=False, auto_adjust=False)
            
            if data.empty:
                logger.warning(f"Sem dados para benchmark {benchmark_ticker}")
                return pd.Series(dtype=float)
            
            # Função para extrair preços com prioridade ABSOLUTA para Adj Close
            def extract_benchmark_close(df, ticker_name):
                """Extrai dados de fechamento priorizando SEMPRE Adj Close."""
                
                # Tratar MultiIndex (múltiplos símbolos)
                if isinstance(df.columns, pd.MultiIndex):
                    logger.info(f"Processando MultiIndex para benchmark {ticker_name}")
                    
                    # Procurar colunas específicas
                    adj_close_col = None
                    close_col = None
                    
                    for col in df.columns:
                        if col[0] == 'Adj Close':
                            adj_close_col = col
                        elif col[0] == 'Close':
                            close_col = col
                    
                    # PRIORIDADE ABSOLUTA: Adj Close
                    if adj_close_col is not None:
                        close_data = df[adj_close_col]
                        logger.info(f"✅ Usando Adj Close para benchmark {ticker_name}")
                    elif close_col is not None:
                        close_data = df[close_col]
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para benchmark {ticker_name}")
                    else:
                        raise ValueError(f"❌ Nenhuma coluna de preço encontrada para benchmark {ticker_name}")
                
                else:
                    # Colunas simples - PRIORIDADE ABSOLUTA para Adj Close
                    if 'Adj Close' in df.columns:
                        close_data = df['Adj Close']
                        logger.info(f"✅ Usando Adj Close para benchmark {ticker_name}")
                    elif 'Close' in df.columns:
                        close_data = df['Close']
                        logger.warning(f"⚠️ Adj Close não disponível, usando Close para benchmark {ticker_name}")
                    else:
                        raise ValueError(f"❌ Nenhuma coluna de preço encontrada para benchmark {ticker_name}")
                
                return close_data
            
            # Extrair dados de fechamento com prioridade Adj Close
            try:
                close_prices = extract_benchmark_close(data, benchmark_ticker)
            except ValueError as e:
                logger.error(f"Erro ao extrair dados de benchmark: {e}")
                return pd.Series(dtype=float)
            
            # Calcular retornos diários
            benchmark_returns = close_prices.pct_change().dropna()
            benchmark_returns.name = f"{benchmark_ticker}_returns"
            
            # Remover timezone para compatibilidade
            if benchmark_returns.index.tz is not None:
                benchmark_returns.index = benchmark_returns.index.tz_localize(None)
            
            logger.info(f"✅ Benchmark {benchmark_ticker} carregado com {len(benchmark_returns)} retornos")
            return benchmark_returns
            
        except Exception as e:
            logger.error(f"Erro ao obter benchmark {benchmark_ticker}: {e}")
            return pd.Series(dtype=float)
    
    def compare_portfolio_strategies(self, 
                                   strategies: Dict[str, Dict[str, float]],
                                   benchmark_ticker: str = "^BVSP",
                                   risk_free_rate: float = 0.0525) -> Dict[str, Any]:
        """
        Compara performance entre múltiplas estratégias de portfólio
        
        Args:
            strategies: Dict com nome da estratégia e pesos
            benchmark_ticker: Ticker do benchmark
            risk_free_rate: Taxa livre de risco
            
        Returns:
            Dict com comparação completa
        """
        try:
            comparison_data = {}
            portfolio_returns_dict = {}
            
            # Calcular retornos para cada estratégia
            for strategy_name, weights in strategies.items():
                try:
                    returns = self._calculate_portfolio_returns(weights)
                    portfolio_returns_dict[strategy_name] = returns
                    
                    # Criar analisador para cada estratégia
                    analyzer = PerformanceAnalyzer()
                    benchmark_returns = self._get_benchmark_returns(benchmark_ticker, 12)
                    
                    analyzer.set_portfolio_data(
                        returns=returns,
                        benchmark_returns=benchmark_returns
                    )
                    
                    # Calcular métricas
                    metrics = analyzer.calculate_performance_metrics(risk_free_rate=risk_free_rate)
                    comparison_data[strategy_name] = metrics
                    
                except Exception as e:
                    logger.error(f"Erro ao analisar estratégia {strategy_name}: {e}")
                    comparison_data[strategy_name] = {"error": str(e)}
            
            # Usar empyrical para comparação direta
            if len(portfolio_returns_dict) > 1:
                # Criar analisador principal para comparação
                main_analyzer = PerformanceAnalyzer()
                
                # Usar primeira estratégia como base
                first_strategy = list(portfolio_returns_dict.keys())[0]
                first_returns = portfolio_returns_dict[first_strategy]
                
                # Preparar outras estratégias para comparação
                other_strategies = {k: v for k, v in portfolio_returns_dict.items() if k != first_strategy}
                
                main_analyzer.set_portfolio_data(returns=first_returns)
                comparison_df = main_analyzer.compare_portfolios(other_strategies)
                
                return {
                    "individual_metrics": comparison_data,
                    "comparative_table": comparison_df.to_dict('index'),
                    "best_strategy": {
                        "by_sharpe": comparison_df['sharpe_ratio'].idxmax() if 'sharpe_ratio' in comparison_df.columns else None,
                        "by_return": comparison_df['annual_return'].idxmax() if 'annual_return' in comparison_df.columns else None,
                        "by_risk": comparison_df['annual_volatility'].idxmin() if 'annual_volatility' in comparison_df.columns else None,
                    },
                    "benchmark_ticker": benchmark_ticker,
                    "risk_free_rate": risk_free_rate
                }
            else:
                return {
                    "individual_metrics": comparison_data,
                    "comparative_table": {},
                    "best_strategy": {},
                    "note": "Necessário pelo menos 2 estratégias para comparação"
                }
                
        except Exception as e:
            logger.error(f"Erro na comparação de estratégias: {e}")
            return {"error": str(e)}
            
    # ... (outras funções permanecem, mas serão atualizadas conforme necessário) ... 