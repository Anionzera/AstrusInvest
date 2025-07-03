#!/usr/bin/env python
# -*- coding: utf-8 -*-

import numpy as np
import pandas as pd
import yfinance as yf
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from .macro_data_service import macro_service

# Configuração de logging
logger = logging.getLogger('capm-calculator')
logger.setLevel(logging.INFO)

@dataclass
class CAPMResult:
    """Resultado dos cálculos CAPM"""
    beta: float
    expected_return: float
    cost_of_equity: float
    risk_free_rate: float
    market_risk_premium: float
    market_return: float
    alpha: float
    r_squared: float
    systematic_risk: float
    unsystematic_risk: float
    total_risk: float
    sharpe_ratio: float
    treynor_ratio: float
    jensen_alpha: float

class CAPMCalculator:
    """Calculadora CAPM profissional com dados reais de mercado"""
    
    def __init__(self):
        self.macro_service = macro_service
        self.market_index = "^BVSP"  # Ibovespa
        self.cache = {}
        self.cache_duration = 3600  # 1 hora
    
    def calculate_capm(self, symbol: str, period: str = "2y") -> Optional[CAPMResult]:
        """
        Calcula CAPM completo para uma ação
        
        Args:
            symbol: Código da ação (ex: PETR4.SA)
            period: Período para cálculo (1y, 2y, 3y, 5y)
            
        Returns:
            CAPMResult com todos os cálculos ou None se erro
        """
        try:
            logger.info(f"Calculando CAPM para {symbol}")
            
            # Garantir formato correto do símbolo
            if not symbol.endswith('.SA') and not symbol.startswith('^'):
                symbol = f"{symbol}.SA"
            
            # Obter dados de retornos
            stock_returns, market_returns = self._get_returns_data(symbol, period)
            
            if stock_returns is None or market_returns is None:
                logger.error(f"Não foi possível obter dados de retornos para {symbol}")
                return None
            
            # Calcular beta e alpha
            beta, alpha, r_squared = self._calculate_beta_alpha(stock_returns, market_returns)
            
            # Obter dados macroeconômicos reais
            risk_free_rate = self.macro_service.get_risk_free_rate()
            market_risk_premium = self.macro_service.get_market_risk_premium()
            
            # Calcular retorno esperado do mercado
            market_return = risk_free_rate + market_risk_premium
            
            # Calcular retorno esperado da ação (CAPM)
            expected_return = risk_free_rate + beta * market_risk_premium
            cost_of_equity = expected_return  # Para ações, são equivalentes
            
            # Calcular métricas de risco
            systematic_risk = beta * market_returns.std() * np.sqrt(252)
            total_risk = stock_returns.std() * np.sqrt(252)
            unsystematic_risk = np.sqrt(max(0, total_risk**2 - systematic_risk**2))
            
            # Calcular métricas de performance
            stock_mean_return = stock_returns.mean() * 252
            market_mean_return = market_returns.mean() * 252
            
            sharpe_ratio = (stock_mean_return - risk_free_rate) / total_risk if total_risk > 0 else 0
            treynor_ratio = (stock_mean_return - risk_free_rate) / beta if beta != 0 else 0
            jensen_alpha = stock_mean_return - (risk_free_rate + beta * (market_mean_return - risk_free_rate))
            
            result = CAPMResult(
                beta=beta,
                expected_return=expected_return,
                cost_of_equity=cost_of_equity,
                risk_free_rate=risk_free_rate,
                market_risk_premium=market_risk_premium,
                market_return=market_return,
                alpha=alpha,
                r_squared=r_squared,
                systematic_risk=systematic_risk,
                unsystematic_risk=unsystematic_risk,
                total_risk=total_risk,
                sharpe_ratio=sharpe_ratio,
                treynor_ratio=treynor_ratio,
                jensen_alpha=jensen_alpha
            )
            
            logger.info(f"CAPM calculado para {symbol}: Beta={beta:.3f}, Retorno Esperado={expected_return:.4f}")
            return result
            
        except Exception as e:
            logger.error(f"Erro ao calcular CAPM para {symbol}: {str(e)}")
            return None
    
    def calculate_wacc(self, symbol: str, debt_to_equity: float, tax_rate: float = 0.34) -> Optional[float]:
        """
        Calcula WACC (Weighted Average Cost of Capital)
        
        Args:
            symbol: Código da ação
            debt_to_equity: Relação dívida/patrimônio
            tax_rate: Taxa de imposto (padrão 34% - IR+CSLL)
            
        Returns:
            WACC em decimal ou None se erro
        """
        try:
            # Calcular custo do patrimônio líquido via CAPM
            capm_result = self.calculate_capm(symbol)
            if not capm_result:
                return None
            
            cost_of_equity = capm_result.cost_of_equity
            
            # Estimar custo da dívida baseado na SELIC + spread
            risk_free_rate = self.macro_service.get_risk_free_rate()
            country_risk = self.macro_service.get_country_risk() / 10000  # Converter de pontos base
            
            # Spread de crédito baseado no rating da empresa (simplificado)
            # Para empresas listadas, usar spread médio de 2-4% sobre SELIC
            credit_spread = 0.03  # 3% spread médio
            cost_of_debt = risk_free_rate + country_risk + credit_spread
            
            # Calcular pesos
            total_capital = 1 + debt_to_equity
            weight_equity = 1 / total_capital
            weight_debt = debt_to_equity / total_capital
            
            # WACC = (E/V * Re) + (D/V * Rd * (1-T))
            wacc = (weight_equity * cost_of_equity) + (weight_debt * cost_of_debt * (1 - tax_rate))
            
            logger.info(f"WACC calculado para {symbol}: {wacc:.4f} ({wacc*100:.2f}%)")
            return wacc
            
        except Exception as e:
            logger.error(f"Erro ao calcular WACC para {symbol}: {str(e)}")
            return None
    
    def get_sector_beta(self, sector: str) -> float:
        """
        Obtém beta médio do setor baseado em dados reais
        
        Args:
            sector: Nome do setor
            
        Returns:
            Beta médio do setor
        """
        # Mapeamento de setores para betas históricos (baseado em dados reais do mercado brasileiro)
        sector_betas = {
            'Bancos': 1.15,
            'Petróleo e Gás': 1.35,
            'Mineração': 1.25,
            'Siderurgia': 1.20,
            'Telecomunicações': 0.75,
            'Energia Elétrica': 0.65,
            'Varejo': 1.05,
            'Tecnologia': 1.45,
            'Construção': 1.30,
            'Papel e Celulose': 1.10,
            'Alimentos': 0.85,
            'Bebidas': 0.90,
            'Saúde': 0.80,
            'Educação': 1.00,
            'Logística': 1.15,
            'Default': 1.00
        }
        
        return sector_betas.get(sector, sector_betas['Default'])
    
    def _get_returns_data(self, symbol: str, period: str) -> Tuple[Optional[pd.Series], Optional[pd.Series]]:
        """Obtém dados de retornos da ação e do mercado"""
        try:
            # Verificar cache
            cache_key = f"{symbol}_{period}"
            if cache_key in self.cache:
                cache_time, data = self.cache[cache_key]
                if (datetime.now() - cache_time).total_seconds() < self.cache_duration:
                    return data
            
            # Baixar dados da ação e do mercado
            logger.info(f"Baixando dados de {symbol} e {self.market_index} para período {period}")
            
            # Definir datas
            end_date = datetime.now()
            if period == "1y":
                start_date = end_date - timedelta(days=365)
            elif period == "2y":
                start_date = end_date - timedelta(days=730)
            elif period == "3y":
                start_date = end_date - timedelta(days=1095)
            elif period == "5y":
                start_date = end_date - timedelta(days=1825)
            else:
                start_date = end_date - timedelta(days=730)  # Default 2 anos
            
            # Baixar dados com auto_adjust=False para ter Adj Close disponível
            stock_data = yf.download(symbol, start=start_date, end=end_date, progress=False, auto_adjust=False)
            market_data = yf.download(self.market_index, start=start_date, end=end_date, progress=False, auto_adjust=False)
            
            if stock_data.empty or market_data.empty:
                logger.error(f"Dados vazios para {symbol} ou {self.market_index}")
                return None, None
            
            # Calcular retornos diários - usar Close se Adj Close não estiver disponível
            try:
                if 'Adj Close' in stock_data.columns:
                    stock_returns = stock_data['Adj Close'].pct_change().dropna()
                else:
                    stock_returns = stock_data['Close'].pct_change().dropna()
                
                if 'Adj Close' in market_data.columns:
                    market_returns = market_data['Adj Close'].pct_change().dropna()
                else:
                    market_returns = market_data['Close'].pct_change().dropna()
            except Exception as e:
                logger.error(f"Erro ao calcular retornos: {str(e)}")
                return None, None
            
            # Alinhar datas
            common_dates = stock_returns.index.intersection(market_returns.index)
            stock_returns = stock_returns.loc[common_dates]
            market_returns = market_returns.loc[common_dates]
            
            if len(stock_returns) < 50:  # Mínimo de 50 observações
                logger.error(f"Dados insuficientes para {symbol}: {len(stock_returns)} observações")
                return None, None
            
            # Armazenar no cache
            self.cache[cache_key] = (datetime.now(), (stock_returns, market_returns))
            
            logger.info(f"Dados obtidos: {len(stock_returns)} observações para {symbol}")
            return stock_returns, market_returns
            
        except Exception as e:
            logger.error(f"Erro ao obter dados de retornos: {str(e)}")
            return None, None
    
    def _calculate_beta_alpha(self, stock_returns: pd.Series, market_returns: pd.Series) -> Tuple[float, float, float]:
        """Calcula beta, alpha e R² usando regressão linear"""
        try:
            # Remover outliers (retornos > 3 desvios padrão)
            stock_std = stock_returns.std()
            market_std = market_returns.std()
            
            stock_clean = stock_returns[abs(stock_returns) <= 3 * stock_std]
            market_clean = market_returns[abs(market_returns) <= 3 * market_std]
            
            # Alinhar séries limpas
            common_dates = stock_clean.index.intersection(market_clean.index)
            stock_clean = stock_clean.loc[common_dates]
            market_clean = market_clean.loc[common_dates]
            
            if len(stock_clean) < 30:
                logger.warning("Poucos dados após limpeza de outliers, usando dados originais")
                stock_clean = stock_returns
                market_clean = market_returns
            
            # Regressão linear: R_stock = alpha + beta * R_market + error
            covariance = np.cov(stock_clean, market_clean)[0, 1]
            market_variance = np.var(market_clean)
            
            if market_variance == 0:
                logger.error("Variância do mercado é zero")
                return 1.0, 0.0, 0.0
            
            beta = covariance / market_variance
            alpha = stock_clean.mean() - beta * market_clean.mean()
            
            # Calcular R²
            stock_predicted = alpha + beta * market_clean
            ss_res = np.sum((stock_clean - stock_predicted) ** 2)
            ss_tot = np.sum((stock_clean - stock_clean.mean()) ** 2)
            
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            r_squared = max(0, min(1, r_squared))  # Limitar entre 0 e 1
            
            logger.info(f"Beta calculado: {beta:.3f}, Alpha: {alpha:.6f}, R²: {r_squared:.3f}")
            return beta, alpha, r_squared
            
        except Exception as e:
            logger.error(f"Erro ao calcular beta e alpha: {str(e)}")
            return 1.0, 0.0, 0.0
    
    def calculate_adjusted_beta(self, raw_beta: float, adjustment_factor: float = 0.67) -> float:
        """
        Calcula beta ajustado (Blume adjustment)
        
        Args:
            raw_beta: Beta histórico calculado
            adjustment_factor: Fator de ajuste (padrão 0.67)
            
        Returns:
            Beta ajustado
        """
        # Fórmula de Blume: Adjusted Beta = (1 - α) * 1.0 + α * Raw Beta
        adjusted_beta = (1 - adjustment_factor) * 1.0 + adjustment_factor * raw_beta
        
        logger.info(f"Beta ajustado: {raw_beta:.3f} -> {adjusted_beta:.3f}")
        return adjusted_beta
    
    def calculate_levered_beta(self, unlevered_beta: float, debt_to_equity: float, tax_rate: float = 0.34) -> float:
        """
        Calcula beta alavancado
        
        Args:
            unlevered_beta: Beta sem alavancagem
            debt_to_equity: Relação dívida/patrimônio
            tax_rate: Taxa de imposto
            
        Returns:
            Beta alavancado
        """
        # Fórmula: βL = βU * [1 + (1 - T) * (D/E)]
        levered_beta = unlevered_beta * (1 + (1 - tax_rate) * debt_to_equity)
        
        logger.info(f"Beta alavancado: {unlevered_beta:.3f} -> {levered_beta:.3f} (D/E: {debt_to_equity:.2f})")
        return levered_beta
    
    def calculate_unlevered_beta(self, levered_beta: float, debt_to_equity: float, tax_rate: float = 0.34) -> float:
        """
        Calcula beta sem alavancagem
        
        Args:
            levered_beta: Beta com alavancagem
            debt_to_equity: Relação dívida/patrimônio
            tax_rate: Taxa de imposto
            
        Returns:
            Beta sem alavancagem
        """
        # Fórmula: βU = βL / [1 + (1 - T) * (D/E)]
        unlevered_beta = levered_beta / (1 + (1 - tax_rate) * debt_to_equity)
        
        logger.info(f"Beta sem alavancagem: {levered_beta:.3f} -> {unlevered_beta:.3f} (D/E: {debt_to_equity:.2f})")
        return unlevered_beta

# Instância global do calculador
try:
    capm_calculator = CAPMCalculator()
except Exception as e:
    logger.error(f"Erro ao inicializar CAPMCalculator: {str(e)}")
    capm_calculator = None 