import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import logging

# Configuração de logging
logger = logging.getLogger('ml-predictor')
logger.setLevel(logging.INFO)

# Verificar se o logger já tem handlers para evitar duplicados
if not logger.handlers:
    # Adicionar handler para stdout
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class MLReturnPredictor:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.sequence_length = 60  # Dias para considerar em cada sequência
        
    def prepare_data(self, prices, sequence_length=60):
        """
        Prepara os dados e treina os modelos LSTM para cada ativo
        
        Args:
            prices (DataFrame): DataFrame com preços históricos dos ativos
            sequence_length (int): Tamanho da sequência para o modelo LSTM
        """
        try:
            logger.info(f"Preparando dados de ML para {len(prices.columns)} ativos")
            self.sequence_length = sequence_length
            returns = prices.pct_change().dropna()
            
            for ticker in returns.columns:
                # Verificar se temos dados suficientes
                if len(returns[ticker].dropna()) < sequence_length + 30:
                    logger.warning(f"Dados insuficientes para {ticker}. Pulando...")
                    continue
                    
                try:
                    # Normalização
                    data = returns[ticker].values.reshape(-1, 1)
                    scaler = MinMaxScaler(feature_range=(0, 1))
                    scaled_data = scaler.fit_transform(data)
                    self.scalers[ticker] = scaler
                    
                    # Criar sequências
                    X, y = [], []
                    for i in range(len(scaled_data) - sequence_length):
                        X.append(scaled_data[i:i + sequence_length, 0])
                        y.append(scaled_data[i + sequence_length, 0])
                        
                    X, y = np.array(X), np.array(y)
                    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
                    
                    # Treinar modelo LSTM para cada ativo
                    model = Sequential()
                    model.add(LSTM(units=50, return_sequences=True, input_shape=(X.shape[1], 1)))
                    model.add(Dropout(0.2))
                    model.add(LSTM(units=50))
                    model.add(Dropout(0.2))
                    model.add(Dense(units=1))
                    
                    model.compile(optimizer='adam', loss='mean_squared_error')
                    
                    # Usar early stopping para evitar overfitting
                    early_stop = tf.keras.callbacks.EarlyStopping(
                        monitor='loss', patience=5, restore_best_weights=True)
                    
                    model.fit(
                        X, y, 
                        epochs=25, 
                        batch_size=32, 
                        verbose=0,
                        callbacks=[early_stop]
                    )
                    
                    self.models[ticker] = model
                    logger.info(f"Modelo treinado com sucesso para {ticker}")
                    
                except Exception as e:
                    logger.error(f"Erro ao treinar modelo para {ticker}: {str(e)}")
                    continue
                    
            logger.info(f"Modelos treinados com sucesso para {len(self.models)} ativos")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao preparar dados para ML: {str(e)}")
            return False
    
    def predict_returns(self, prices, forecast_period=252):
        """
        Prever retornos anualizados para cada ativo usando modelos LSTM
        
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
                    logger.warning(f"Sem modelo treinado para {ticker}. Pulando...")
                    continue
                    
                try:
                    # Preparar dados para predição
                    last_sequence = returns[ticker].tail(self.sequence_length).values
                    
                    # Verificar se temos NaN ou infinitos
                    if np.isnan(last_sequence).any() or np.isinf(last_sequence).any():
                        logger.warning(f"Valores inválidos na sequência para {ticker}. Pulando...")
                        continue
                        
                    scaled_sequence = self.scalers[ticker].transform(last_sequence.reshape(-1, 1))
                    X_test = np.reshape(scaled_sequence, (1, self.sequence_length, 1))
                    
                    # Fazer previsões sequenciais
                    cumulative_return = 1.0
                    forecast_returns = []
                    
                    for _ in range(forecast_period):
                        next_return_scaled = self.models[ticker].predict(X_test, verbose=0)[0, 0]
                        
                        # Converter de volta para escala original
                        next_return = self.scalers[ticker].inverse_transform(
                            np.array([[next_return_scaled]]))[0, 0]
                        
                        # Acumular retorno
                        cumulative_return *= (1 + next_return)
                        forecast_returns.append(next_return)
                        
                        # Atualizar sequência para próxima previsão
                        X_test = np.append(X_test[:, 1:, :], [[[next_return_scaled]]], axis=1)
                    
                    # Calcular volatilidade das previsões
                    forecast_vol = np.std(forecast_returns) * np.sqrt(252)
                    
                    # Anualizar retorno
                    annualized_return = cumulative_return ** (252/forecast_period) - 1
                    
                    # Ajustar retorno usando Sharpe histórico para controlar previsões otimistas demais
                    historical_sharpe = returns[ticker].mean() / returns[ticker].std() * np.sqrt(252)
                    forecast_sharpe = annualized_return / forecast_vol if forecast_vol > 0 else 0
                    
                    # Se a previsão tiver Sharpe muito superior ao histórico, ajustar
                    if forecast_sharpe > 2 * historical_sharpe and historical_sharpe > 0:
                        annualized_return = 2 * historical_sharpe * forecast_vol
                    
                    predicted_returns[ticker] = annualized_return
                    logger.info(f"Retorno previsto para {ticker}: {annualized_return:.2%}")
                    
                except Exception as e:
                    logger.error(f"Erro ao prever retornos para {ticker}: {str(e)}")
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
        Prever matriz de covariância usando métodos de ML
        
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
            
            # Prever retornos futuros para cada ativo
            forecast_returns = {}
            
            for ticker in tickers:
                # Preparar dados para predição
                last_sequence = returns[ticker].tail(self.sequence_length).values
                scaled_sequence = self.scalers[ticker].transform(last_sequence.reshape(-1, 1))
                X_test = np.reshape(scaled_sequence, (1, self.sequence_length, 1))
                
                # Fazer previsões sequenciais
                ticker_forecasts = []
                for _ in range(forecast_period):
                    next_return_scaled = self.models[ticker].predict(X_test, verbose=0)[0, 0]
                    
                    # Converter de volta para escala original
                    next_return = self.scalers[ticker].inverse_transform(
                        np.array([[next_return_scaled]]))[0, 0]
                    
                    ticker_forecasts.append(next_return)
                    
                    # Atualizar sequência para próxima previsão
                    X_test = np.append(X_test[:, 1:, :], [[[next_return_scaled]]], axis=1)
                
                forecast_returns[ticker] = ticker_forecasts
            
            # Criar DataFrame com previsões de retornos
            forecast_df = pd.DataFrame(forecast_returns)
            
            # Calcular matriz de covariância baseada nas previsões
            cov_matrix = forecast_df.cov() * 252  # Anualizar
            
            return cov_matrix
            
        except Exception as e:
            logger.error(f"Erro ao prever matriz de covariância: {str(e)}")
            return None 