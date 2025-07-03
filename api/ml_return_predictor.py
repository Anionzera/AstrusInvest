import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import logging
from typing import Dict, Optional, Tuple

# Configuração de logging
logger = logging.getLogger('statistical-predictor')
logger.setLevel(logging.INFO)

# Verificar se o logger já tem handlers para evitar duplicados
if not logger.handlers:
    # Adicionar handler para stdout
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class MLReturnPredictor:
    """
    Preditor de retornos usando métodos estatísticos e machine learning (sem TensorFlow)
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_window = 20  # Janela de features para previsão
        self.validation_scores = {}
        
    def prepare_data(self, prices, feature_window=20):
        """
        Prepara os dados e treina modelos estatísticos para cada ativo
        
        Args:
            prices (DataFrame): DataFrame com preços históricos dos ativos
            feature_window (int): Tamanho da janela para features técnicas
        """
        try:
            logger.info(f"Preparando dados estatísticos para {len(prices.columns)} ativos")
            self.feature_window = feature_window
            returns = prices.pct_change().dropna()
            
            for ticker in returns.columns:
                # Verificar se temos dados suficientes
                if len(returns[ticker].dropna()) < feature_window + 30:
                    logger.warning(f"Dados insuficientes para {ticker}. Pulando...")
                    continue
                    
                try:
                    # Criar features técnicas
                    features_df = self._create_technical_features(prices[ticker], returns[ticker])
                    
                    if features_df.empty:
                        logger.warning(f"Não foi possível criar features para {ticker}")
                        continue
                    
                    # Preparar dados para treinamento
                    X, y = self._prepare_supervised_data(features_df, returns[ticker])
                    
                    if len(X) < 50:  # Mínimo de dados para treinamento
                        logger.warning(f"Dados insuficientes para treinamento de {ticker}")
                        continue
                    
                    # Dividir em treino e validação
                    split_idx = int(len(X) * 0.8)
                    X_train, X_val = X[:split_idx], X[split_idx:]
                    y_train, y_val = y[:split_idx], y[split_idx:]
                    
                    # Normalizar features
                    scaler = MinMaxScaler()
                    X_train_scaled = scaler.fit_transform(X_train)
                    X_val_scaled = scaler.transform(X_val)
                    self.scalers[ticker] = scaler
                    
                    # Treinar múltiplos modelos e selecionar o melhor
                    models_to_try = {
                        'ridge': Ridge(alpha=1.0),
                        'linear': LinearRegression(),
                        'random_forest': RandomForestRegressor(n_estimators=50, random_state=42, max_depth=10)
                    }
                    
                    best_model = None
                    best_score = float('-inf')
                    best_model_name = None
                    
                    for model_name, model in models_to_try.items():
                        try:
                            # Treinar modelo
                            model.fit(X_train_scaled, y_train)
                            
                            # Validar
                            y_pred = model.predict(X_val_scaled)
                            score = r2_score(y_val, y_pred)
                            
                            if score > best_score:
                                best_score = score
                                best_model = model
                                best_model_name = model_name
                                
                        except Exception as e:
                            logger.warning(f"Erro ao treinar modelo {model_name} para {ticker}: {e}")
                            continue
                    
                    if best_model is not None:
                        self.models[ticker] = best_model
                        self.validation_scores[ticker] = {
                            'r2_score': best_score,
                            'model_type': best_model_name
                        }
                        logger.info(f"Modelo {best_model_name} treinado para {ticker} com R² = {best_score:.4f}")
                    else:
                        logger.warning(f"Nenhum modelo válido para {ticker}")
                        
                except Exception as e:
                    logger.error(f"Erro ao treinar modelo para {ticker}: {str(e)}")
                    continue
                    
            logger.info(f"Modelos estatísticos treinados para {len(self.models)} ativos")
            return len(self.models) > 0
            
        except Exception as e:
            logger.error(f"Erro ao preparar dados: {str(e)}")
            return False
    
    def _create_technical_features(self, prices: pd.Series, returns: pd.Series) -> pd.DataFrame:
        """
        Cria features técnicas para previsão
        """
        try:
            features = pd.DataFrame(index=prices.index)
            
            # Médias móveis
            features['sma_5'] = prices.rolling(5).mean() / prices
            features['sma_10'] = prices.rolling(10).mean() / prices
            features['sma_20'] = prices.rolling(20).mean() / prices
            
            # Volatilidade histórica
            features['volatility_5'] = returns.rolling(5).std()
            features['volatility_10'] = returns.rolling(10).std()
            features['volatility_20'] = returns.rolling(20).std()
            
            # RSI simplificado
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            features['rsi'] = 100 - (100 / (1 + rs))
            
            # Momentum
            features['momentum_5'] = returns.rolling(5).sum()
            features['momentum_10'] = returns.rolling(10).sum()
            
            # Retornos defasados
            for lag in [1, 2, 3, 5]:
                features[f'return_lag_{lag}'] = returns.shift(lag)
            
            # Bandas de Bollinger
            sma_20 = prices.rolling(20).mean()
            std_20 = prices.rolling(20).std()
            features['bb_upper'] = (prices - (sma_20 + 2 * std_20)) / std_20
            features['bb_lower'] = (prices - (sma_20 - 2 * std_20)) / std_20
            
            # Remover NaN
            features = features.dropna()
            
            return features
            
        except Exception as e:
            logger.error(f"Erro ao criar features técnicas: {e}")
            return pd.DataFrame()
    
    def _prepare_supervised_data(self, features_df: pd.DataFrame, returns: pd.Series) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepara dados para aprendizado supervisionado
        """
        try:
            # Alinhar features com returns
            aligned_features = features_df.reindex(returns.index).dropna()
            aligned_returns = returns.reindex(aligned_features.index)
            
            # Criar features de sequência (usar múltiplos períodos)
            X_list = []
            y_list = []
            
            window = min(self.feature_window, len(aligned_features) // 4)
            
            for i in range(window, len(aligned_features) - 1):
                # Features: janela de features técnicas
                feature_window = aligned_features.iloc[i-window:i].values.flatten()
                X_list.append(feature_window)
                
                # Target: retorno do próximo período
                y_list.append(aligned_returns.iloc[i+1])
            
            return np.array(X_list), np.array(y_list)
            
        except Exception as e:
            logger.error(f"Erro ao preparar dados supervisionados: {e}")
            return np.array([]), np.array([])
    
    def predict_returns(self, prices, forecast_period=252):
        """
        Prever retornos anualizados para cada ativo usando modelos estatísticos
        
        Args:
            prices (DataFrame): DataFrame com preços históricos dos ativos
            forecast_period (int): Horizonte de previsão em dias
            
        Returns:
            Series: Série com retornos previstos anualizados para cada ativo
        """
        try:
            predicted_returns = {}
            returns = prices.pct_change().dropna()
            
            for ticker in prices.columns:
                if ticker not in self.models or ticker not in self.scalers:
                    logger.warning(f"Sem modelo treinado para {ticker}. Usando média histórica.")
                    # Fallback para média histórica
                    mean_return = returns[ticker].mean() * 252
                    predicted_returns[ticker] = mean_return
                    continue
                    
                try:
                    # Criar features para previsão
                    features_df = self._create_technical_features(prices[ticker], returns[ticker])
                    
                    if features_df.empty:
                        logger.warning(f"Não foi possível criar features para previsão de {ticker}")
                        predicted_returns[ticker] = returns[ticker].mean() * 252
                        continue
                    
                    # Usar últimas observações para previsão
                    recent_features = features_df.tail(self.feature_window).values.flatten()
                    recent_features_scaled = self.scalers[ticker].transform([recent_features])
                    
                    # Fazer previsão
                    predicted_return = self.models[ticker].predict(recent_features_scaled)[0]
                    
                    # Anualizar e aplicar ajustes baseados na qualidade do modelo
                    r2_score = self.validation_scores.get(ticker, {}).get('r2_score', 0)
                    
                    # Se o modelo não é muito bom, ponderar com média histórica
                    if r2_score < 0.1:
                        historical_mean = returns[ticker].mean()
                        weight_model = max(0.3, r2_score + 0.2)  # Peso mínimo de 30%
                        predicted_return = weight_model * predicted_return + (1 - weight_model) * historical_mean
                    
                    # Anualizar
                    annualized_return = predicted_return * 252
                    
                    # Aplicar limites de sanidade
                    annualized_return = np.clip(annualized_return, -0.8, 2.0)  # Entre -80% e +200%
                    
                    predicted_returns[ticker] = annualized_return
                    logger.info(f"Retorno previsto para {ticker}: {annualized_return:.2%} (R² = {r2_score:.3f})")
                    
                except Exception as e:
                    logger.error(f"Erro ao prever retornos para {ticker}: {str(e)}")
                    # Fallback para média histórica
                    predicted_returns[ticker] = returns[ticker].mean() * 252
                    continue
            
            # Se não conseguimos prever nenhum retorno, retornar None
            if not predicted_returns:
                logger.error("Não foi possível prever retornos para nenhum ativo")
                return None
                
            return pd.Series(predicted_returns)
            
        except Exception as e:
            logger.error(f"Erro ao prever retornos: {str(e)}")
            return None
            
    def predict_risk(self, prices, forecast_period=252):
        """
        Prever matriz de covariância usando métodos estatísticos
        
        Args:
            prices (DataFrame): DataFrame com preços históricos dos ativos
            forecast_period (int): Horizonte de previsão em dias
            
        Returns:
            DataFrame: Matriz de covariância prevista
        """
        try:
            returns = prices.pct_change().dropna()
            tickers = [t for t in prices.columns if t in self.models]
            
            if len(tickers) < 2:
                logger.error("Número insuficiente de ativos com modelos treinados")
                return None
            
            # Para simplificar, usar covariância histórica com decaimento exponencial
            # Isso é mais simples que prever cada covariância individualmente
            
            # Calcular pesos exponenciais (mais peso para observações recentes)
            n_obs = len(returns)
            decay_factor = 0.94  # Fator de decaimento típico
            weights = np.array([decay_factor ** i for i in range(n_obs)])
            weights = weights[::-1]  # Reverter para dar mais peso aos recentes
            weights = weights / weights.sum()  # Normalizar
            
            # Calcular covariância ponderada
            weighted_returns = returns[tickers] * np.sqrt(weights[:, np.newaxis])
            cov_matrix = weighted_returns.cov() * 252  # Anualizar
            
            logger.info(f"Matriz de covariância calculada para {len(tickers)} ativos")
            return cov_matrix
            
        except Exception as e:
            logger.error(f"Erro ao prever matriz de risco: {str(e)}")
            return None
    
    def get_model_quality_report(self) -> Dict:
        """
        Retorna relatório da qualidade dos modelos treinados
        """
        try:
            if not self.validation_scores:
                return {"message": "Nenhum modelo treinado"}
            
            total_models = len(self.validation_scores)
            good_models = sum(1 for score in self.validation_scores.values() if score.get('r2_score', 0) > 0.1)
            avg_r2 = np.mean([score.get('r2_score', 0) for score in self.validation_scores.values()])
            
            model_types = {}
            for score_data in self.validation_scores.values():
                model_type = score_data.get('model_type', 'unknown')
                model_types[model_type] = model_types.get(model_type, 0) + 1
            
            return {
                "total_models": total_models,
                "good_models": good_models,
                "good_model_ratio": good_models / total_models if total_models > 0 else 0,
                "average_r2_score": avg_r2,
                "model_types_distribution": model_types,
                "individual_scores": self.validation_scores
            }
            
        except Exception as e:
            logger.error(f"Erro ao gerar relatório de qualidade: {e}")
            return {"error": str(e)} 