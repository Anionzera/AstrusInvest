#!/usr/bin/env python
# -*- coding: utf-8 -*-

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
import logging
from datetime import datetime, timedelta
from .fundamentus_scraper import FundamentusScraperFixed, get_fundamentus_data_fixed
from .macro_data_service import macro_service
from .capm_calculator import capm_calculator, CAPMResult

# Configuração de logging
logger = logging.getLogger('valuation-engine')
logger.setLevel(logging.INFO)

@dataclass
class ValuationResult:
    """Resultado de uma análise de valuation"""
    symbol: str
    current_price: float
    target_price: float
    upside_potential: float
    recommendation: str
    confidence_level: str
    valuation_methods: Dict[str, float]
    risk_metrics: Dict[str, float]
    financial_health: Dict[str, Union[float, str]]
    timestamp: str
    fundamentus_data: Optional[Dict] = None

@dataclass
class DCFInputs:
    """Inputs para o modelo DCF"""
    revenue_growth_rates: List[float]  # Taxa de crescimento da receita por ano
    ebitda_margins: List[float]        # Margem EBITDA por ano
    capex_as_revenue: List[float]      # CapEx como % da receita
    working_capital_change: List[float] # Mudança no capital de giro
    tax_rate: float                    # Taxa de imposto
    terminal_growth_rate: float        # Taxa de crescimento terminal
    wacc: float                       # Custo médio ponderado de capital

class ValuationEngine:
    """Engine completo de valuation com múltiplos métodos"""
    
    def __init__(self):
        self.fundamentus_scraper = FundamentusScraperFixed()
        self.macro_service = macro_service
        self.capm_calculator = capm_calculator
        
        # Múltiplos de mercado por setor (P/E médios baseados em dados históricos reais)
        self.sector_multiples = {
            'Bancos': {'pe': 5.9, 'pb': 1.16, 'ev_ebitda': 6.0},
            'Petróleo e Gás': {'pe': 19.2, 'pb': 1.26, 'ev_ebitda': 4.73},
            'Mineração': {'pe': 12.0, 'pb': 1.5, 'ev_ebitda': 5.5},
            'Siderurgia': {'pe': 8.0, 'pb': 1.1, 'ev_ebitda': 4.8},
            'Telecomunicações': {'pe': 15.0, 'pb': 2.0, 'ev_ebitda': 7.0},
            'Energia Elétrica': {'pe': 12.5, 'pb': 1.8, 'ev_ebitda': 8.0},
            'Varejo': {'pe': 18.0, 'pb': 2.5, 'ev_ebitda': 9.0},
            'Tecnologia': {'pe': 25.0, 'pb': 4.0, 'ev_ebitda': 15.0},
            'Construção': {'pe': 10.0, 'pb': 1.3, 'ev_ebitda': 6.5},
            'Papel e Celulose': {'pe': 14.0, 'pb': 1.6, 'ev_ebitda': 7.5},
            'Alimentos': {'pe': 20.0, 'pb': 2.8, 'ev_ebitda': 10.0},
            'Bebidas': {'pe': 22.0, 'pb': 3.2, 'ev_ebitda': 12.0},
            'Saúde': {'pe': 28.0, 'pb': 3.5, 'ev_ebitda': 14.0},
            'Educação': {'pe': 16.0, 'pb': 2.2, 'ev_ebitda': 8.5},
            'Logística': {'pe': 13.0, 'pb': 1.7, 'ev_ebitda': 7.0},
            'Default': {'pe': 15.0, 'pb': 2.0, 'ev_ebitda': 8.0}
        }
    
    def get_real_time_macro_data(self) -> Dict:
        """Obtém dados macroeconômicos em tempo real"""
        try:
            return {
                'risk_free_rate': self.macro_service.get_risk_free_rate(),
                'market_risk_premium': self.macro_service.get_market_risk_premium(),
                'inflation_rate': self.macro_service.get_inflation_rate(),
                'gdp_growth': self.macro_service.get_gdp_growth(),
                'exchange_rate': self.macro_service.get_exchange_rate(),
                'country_risk': self.macro_service.get_country_risk()
            }
        except Exception as e:
            logger.error(f"Erro ao obter dados macroeconômicos: {str(e)}")
            # Fallback para dados estáticos
            return {
                'risk_free_rate': 0.15,
                'market_risk_premium': 0.065,
                'inflation_rate': 0.052,
                'gdp_growth': 0.022,
                'exchange_rate': 5.46,
                'country_risk': 140
            }
    
    def get_comprehensive_valuation(self, symbol: str) -> Optional[ValuationResult]:
        """
        Análise completa de valuation usando múltiplos métodos
        
        Args:
            symbol: Código da ação (ex: PETR4)
            
        Returns:
            ValuationResult com análise completa
        """
        try:
            logger.info(f"Iniciando análise de valuation para {symbol}")
            
            # Obter dados fundamentalistas
            fundamentus_data = get_fundamentus_data_fixed(symbol)
            if not fundamentus_data:
                logger.error(f"Não foi possível obter dados fundamentalistas para {symbol}")
                return None
            
            # Obter dados de mercado do Fundamentus
            market_data = self._get_market_data_from_fundamentus(fundamentus_data)
            if not market_data:
                logger.error(f"Não foi possível obter dados de mercado para {symbol}")
                return None
            
            current_price = market_data.get('current_price', 0)
            
            # Aplicar diferentes métodos de valuation
            valuation_methods = {}
            
            # 1. Valuation por Múltiplos
            pe_valuation = self._pe_valuation(fundamentus_data, market_data)
            if pe_valuation:
                valuation_methods['P/E'] = pe_valuation
            
            pb_valuation = self._pb_valuation(fundamentus_data, market_data)
            if pb_valuation:
                valuation_methods['P/B'] = pb_valuation
            
            ev_ebitda_valuation = self._ev_ebitda_valuation(fundamentus_data, market_data)
            if ev_ebitda_valuation:
                valuation_methods['EV/EBITDA'] = ev_ebitda_valuation
            
            # 2. Dividend Discount Model
            ddm_valuation = self._dividend_discount_model(fundamentus_data, market_data)
            if ddm_valuation:
                valuation_methods['DDM'] = ddm_valuation
            
            # 3. Graham Formula
            graham_valuation = self._graham_formula(fundamentus_data)
            if graham_valuation:
                valuation_methods['Graham'] = graham_valuation
            
            # 4. Asset-based Valuation
            asset_valuation = self._asset_based_valuation(fundamentus_data)
            if asset_valuation:
                valuation_methods['Asset-Based'] = asset_valuation
            
            # 5. DCF Simplificado
            dcf_valuation = self._simplified_dcf(fundamentus_data, market_data)
            if dcf_valuation:
                valuation_methods['DCF'] = dcf_valuation
            
            if not valuation_methods:
                logger.error(f"Nenhum método de valuation foi aplicável para {symbol}")
                return None
            
            # Calcular preço-alvo ponderado
            target_price = self._calculate_weighted_target_price(valuation_methods)
            
            # Calcular potencial de alta
            upside_potential = ((target_price - current_price) / current_price) * 100 if current_price > 0 else 0
            
            # Gerar recomendação
            recommendation = self._generate_recommendation(upside_potential)
            
            # Calcular métricas de risco
            risk_metrics = self._calculate_risk_metrics(fundamentus_data, market_data)
            
            # Avaliar saúde financeira
            financial_health = self._assess_financial_health(fundamentus_data)
            
            # Determinar nível de confiança
            confidence_level = self._determine_confidence_level(valuation_methods, financial_health)
            
            result = ValuationResult(
                symbol=symbol,
                current_price=current_price,
                target_price=target_price,
                upside_potential=upside_potential,
                recommendation=recommendation,
                confidence_level=confidence_level,
                valuation_methods=valuation_methods,
                risk_metrics=risk_metrics,
                financial_health=financial_health,
                timestamp=datetime.now().isoformat(),
                fundamentus_data=fundamentus_data
            )
            
            logger.info(f"Valuation concluído para {symbol}: Preço atual R${current_price:.2f}, Preço-alvo R${target_price:.2f}, Potencial {upside_potential:.1f}%")
            
            return result
            
        except Exception as e:
            logger.error(f"Erro na análise de valuation para {symbol}: {str(e)}")
            return None
    
    def _get_market_data_from_fundamentus(self, fundamentus_data: Dict) -> Optional[Dict]:
        """Obtém dados de mercado a partir dos dados do Fundamentus com CAPM real"""
        try:
            # Extrair dados básicos
            cotacao = fundamentus_data.get('cotacao', 0)
            valor_mercado = fundamentus_data.get('valor_mercado', 0)
            valor_firma = fundamentus_data.get('valor_firma', 0)
            vol_med_2m = fundamentus_data.get('vol_med_2m', 0)
            setor = fundamentus_data.get('setor', 'Default')
            symbol = fundamentus_data.get('symbol', '')
            
            # Calcular CAPM real para a ação
            capm_result = None
            beta = 1.0
            expected_return = 0.12
            
            if symbol:
                try:
                    capm_result = self.capm_calculator.calculate_capm(symbol)
                    if capm_result:
                        beta = capm_result.beta
                        expected_return = capm_result.expected_return
                        logger.info(f"CAPM calculado para {symbol}: Beta={beta:.3f}, Retorno Esperado={expected_return:.4f}")
                    else:
                        # Usar beta setorial se CAPM falhar
                        beta = self.capm_calculator.get_sector_beta(setor)
                        logger.warning(f"CAPM falhou para {symbol}, usando beta setorial: {beta:.3f}")
                except Exception as e:
                    logger.error(f"Erro ao calcular CAPM para {symbol}: {str(e)}")
                    beta = self.capm_calculator.get_sector_beta(setor)
            else:
                # Usar beta setorial como fallback
                beta = self.capm_calculator.get_sector_beta(setor)
            
            # Calcular dividend yield
            div_yield = fundamentus_data.get('indicadores_fundamentalistas', {}).get('div_yield', 0)
            
            # Calcular volatilidade real baseada no CAPM
            if capm_result:
                price_volatility = capm_result.total_risk * 100  # Converter para percentual
                systematic_risk = capm_result.systematic_risk * 100
                unsystematic_risk = capm_result.unsystematic_risk * 100
            else:
                # Estimar volatilidade baseada no setor e características da empresa
                base_volatility = 30.0  # Volatilidade base do mercado brasileiro
                
                # Ajustar volatilidade baseado no volume
                if vol_med_2m > 10000000:  # Volume alto
                    volatility_factor = 0.8
                elif vol_med_2m > 1000000:  # Volume médio
                    volatility_factor = 1.0
                else:  # Volume baixo
                    volatility_factor = 1.3
            
                # Ajustar volatilidade baseado no setor
                sector_volatility_multiplier = {
                    'Bancos': 1.2,
                    'Petróleo e Gás': 6.13,
                    'Mineração': 1.3,
                    'Siderurgia': 1.2,
                    'Telecomunicações': 0.8,
                    'Energia Elétrica': 0.7,
                    'Varejo': 1.1,
                    'Tecnologia': 1.5
                }.get(setor, 1.0)
                
                price_volatility = base_volatility * volatility_factor * sector_volatility_multiplier
                systematic_risk = price_volatility * 0.7  # Aproximação
                unsystematic_risk = price_volatility * 0.3
            
            # Classificar risco de liquidez baseado no volume
            if vol_med_2m > 10000000:
                liquidity_risk = "Baixo"
            elif vol_med_2m > 1000000:
                liquidity_risk = "Médio"
            else:
                liquidity_risk = "Alto"
            
            # Obter dados macroeconômicos reais
            macro_data = self.get_real_time_macro_data()
            
            return {
                'current_price': cotacao,
                'market_cap': valor_mercado,
                'enterprise_value': valor_firma,
                'beta': beta,
                'expected_return': expected_return,
                'dividend_yield': div_yield,
                'price_volatility': price_volatility,
                'systematic_risk': systematic_risk,
                'unsystematic_risk': unsystematic_risk,
                'avg_volume': vol_med_2m,
                'liquidity_risk': liquidity_risk,
                'capm_result': capm_result,
                'macro_data': macro_data
            }
            
        except Exception as e:
            logger.warning(f"Erro ao extrair dados de mercado do Fundamentus: {str(e)}")
            return None
    
    def _pe_valuation(self, fundamentus_data: Dict, market_data: Dict) -> Optional[float]:
        """Valuation baseado em P/E"""
        try:
            lpa = fundamentus_data.get('indicadores_fundamentalistas', {}).get('lpa', 0)
            setor = fundamentus_data.get('setor', 'Default')
            
            if lpa <= 0:
                return None
            
            # Obter P/E médio do setor
            sector_pe = self.sector_multiples.get(setor, self.sector_multiples['Default'])['pe']
            
            # Ajustar P/E baseado na qualidade da empresa
            roe = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roe', 0)
            roic = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roic', 0)
            
            # Fator de qualidade (empresas com ROE e ROIC altos merecem P/E maior)
            quality_factor = 1.0
            if roe > 15 and roic > 12:
                quality_factor = 1.2
            elif roe > 10 and roic > 8:
                quality_factor = 1.1
            elif roe < 5 or roic < 3:
                quality_factor = 0.8
            
            adjusted_pe = sector_pe * quality_factor
            target_price = lpa * adjusted_pe
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro no valuation P/E: {str(e)}")
            return None
    
    def _pb_valuation(self, fundamentus_data: Dict, market_data: Dict) -> Optional[float]:
        """Valuation baseado em P/B"""
        try:
            vpa = fundamentus_data.get('indicadores_fundamentalistas', {}).get('vpa', 0)
            setor = fundamentus_data.get('setor', 'Default')
            
            if vpa <= 0:
                return None
            
            # Obter P/B médio do setor
            sector_pb = self.sector_multiples.get(setor, self.sector_multiples['Default'])['pb']
            
            # Ajustar P/B baseado no ROE
            roe = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roe', 0)
            
            # P/B justo = ROE / Custo de Capital Próprio usando dados reais
            macro_data = market_data.get('macro_data', self.get_real_time_macro_data())
            risk_free_rate = macro_data.get('risk_free_rate', 0.1075)
            market_risk_premium = macro_data.get('market_risk_premium', 0.06)
            cost_of_equity = risk_free_rate + market_data.get('beta', 1.0) * market_risk_premium
            
            if roe > 0 and cost_of_equity > 0:
                fair_pb = roe / 100 / cost_of_equity
                adjusted_pb = min(sector_pb, fair_pb * 1.2)  # Não exceder muito o P/B teórico
            else:
                adjusted_pb = sector_pb * 0.8  # Desconto para empresas sem ROE positivo
            
            target_price = vpa * adjusted_pb
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro no valuation P/B: {str(e)}")
            return None
    
    def _ev_ebitda_valuation(self, fundamentus_data: Dict, market_data: Dict) -> Optional[float]:
        """Valuation baseado em EV/EBITDA"""
        try:
            ebit = fundamentus_data.get('dados_demonstrativos_resultados', {}).get('ultimos_12_meses', {}).get('ebit', 0)
            nro_acoes = fundamentus_data.get('nro_acoes', 0)
            setor = fundamentus_data.get('setor', 'Default')
            
            if ebit <= 0 or nro_acoes <= 0:
                return None
            
            # Aproximar EBITDA como EBIT * 1.15 (assumindo D&A de ~15% do EBIT)
            ebitda = ebit * 1.15
            
            # Obter EV/EBITDA médio do setor
            sector_ev_ebitda = self.sector_multiples.get(setor, self.sector_multiples['Default'])['ev_ebitda']
            
            # Calcular Enterprise Value alvo
            target_ev = ebitda * sector_ev_ebitda
            
            # Converter para preço por ação (EV = Market Cap + Dívida Líquida)
            div_liquida = fundamentus_data.get('dados_balanco_patrimonial', {}).get('div_liquida', 0)
            target_market_cap = target_ev - div_liquida
            target_price = target_market_cap / nro_acoes if target_market_cap > 0 else 0
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro no valuation EV/EBITDA: {str(e)}")
            return None
    
    def _dividend_discount_model(self, fundamentus_data: Dict, market_data: Dict) -> Optional[float]:
        """Modelo de Desconto de Dividendos (DDM)"""
        try:
            div_yield = fundamentus_data.get('indicadores_fundamentalistas', {}).get('div_yield', 0)
            current_price = market_data.get('current_price', 0)
            
            if div_yield <= 0 or current_price <= 0:
                return None
            
            # Dividendo atual por ação
            current_dividend = (div_yield / 100) * current_price
            
            # Assumir crescimento de dividendos baseado no crescimento histórico
            # Para simplificar, usar crescimento conservador de 3-5%
            roe = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roe', 0)
            payout_ratio = (div_yield / roe * 100) if roe > 0 else 0.6  # Assumir 60% se não calculável
            
            # Taxa de crescimento sustentável = ROE * (1 - Payout Ratio)
            growth_rate = max(0, min(0.05, (roe / 100) * (1 - payout_ratio))) if roe > 0 else 0.03
            
            # Custo de capital próprio usando dados reais
            macro_data = market_data.get('macro_data', self.get_real_time_macro_data())
            risk_free_rate = macro_data.get('risk_free_rate', 0.1075)
            market_risk_premium = macro_data.get('market_risk_premium', 0.06)
            cost_of_equity = risk_free_rate + market_data.get('beta', 1.0) * market_risk_premium
            
            # DDM: P = D1 / (r - g)
            if cost_of_equity > growth_rate:
                next_dividend = current_dividend * (1 + growth_rate)
                target_price = next_dividend / (cost_of_equity - growth_rate)
                return target_price
            
            return None
            
        except Exception as e:
            logger.warning(f"Erro no DDM: {str(e)}")
            return None
    
    def _graham_formula(self, fundamentus_data: Dict) -> Optional[float]:
        """Fórmula de Benjamin Graham"""
        try:
            lpa = fundamentus_data.get('indicadores_fundamentalistas', {}).get('lpa', 0)
            vpa = fundamentus_data.get('indicadores_fundamentalistas', {}).get('vpa', 0)
            
            if lpa <= 0 or vpa <= 0:
                return None
            
            # Fórmula de Graham: V = √(22.5 × LPA × VPA)
            target_price = np.sqrt(22.5 * lpa * vpa)
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro na fórmula de Graham: {str(e)}")
            return None
    
    def _asset_based_valuation(self, fundamentus_data: Dict, market_data: Dict = None) -> Optional[float]:
        """Valuation baseado em ativos"""
        try:
            vpa = fundamentus_data.get('indicadores_fundamentalistas', {}).get('vpa', 0)
            
            if vpa <= 0:
                return None
            
            # Para empresas com ativos tangíveis, usar desconto sobre VPA
            # Para empresas de crescimento, usar prêmio
            roe = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roe', 0)
            
            if roe > 15:
                # Empresa de qualidade, prêmio sobre VPA
                target_price = vpa * 1.2
            elif roe > 10:
                # Empresa média, pequeno prêmio
                target_price = vpa * 1.1
            else:
                # Empresa com baixo retorno, desconto
                target_price = vpa * 0.8
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro no valuation baseado em ativos: {str(e)}")
            return None
    
    def _simplified_dcf(self, fundamentus_data: Dict, market_data: Dict) -> Optional[float]:
        """DCF Simplificado"""
        try:
            receita = fundamentus_data.get('dados_demonstrativos_resultados', {}).get('ultimos_12_meses', {}).get('receita_liquida', 0)
            ebit = fundamentus_data.get('dados_demonstrativos_resultados', {}).get('ultimos_12_meses', {}).get('ebit', 0)
            nro_acoes = fundamentus_data.get('nro_acoes', 0)
            
            if receita <= 0 or ebit <= 0 or nro_acoes <= 0:
                return None
            
            # Parâmetros conservadores
            growth_rate = 0.05  # 5% ao ano
            terminal_growth = 0.03  # 3% perpetuidade
            tax_rate = 0.34  # 34% IR+CSLL
            
            # WACC usando dados macroeconômicos reais
            macro_data = market_data.get('macro_data', self.get_real_time_macro_data())
            risk_free_rate = macro_data.get('risk_free_rate', 0.1075)
            market_risk_premium = macro_data.get('market_risk_premium', 0.06)
            
            beta = market_data.get('beta', 1.0)
            cost_of_equity = risk_free_rate + beta * market_risk_premium
            
            # Calcular WACC real usando dados da empresa
            div_br_patrim = fundamentus_data.get('indicadores_fundamentalistas', {}).get('div_br_patrim', 0.3)
            debt_to_equity = div_br_patrim
            
            # Calcular WACC usando a calculadora CAPM
            symbol = fundamentus_data.get('symbol', '')
            if symbol:
                try:
                    wacc = self.capm_calculator.calculate_wacc(symbol, debt_to_equity, tax_rate)
                    if wacc is None:
                        # Fallback para cálculo manual
                        cost_of_debt = risk_free_rate + 0.03  # Spread de 3%
                        weight_equity = 1 / (1 + debt_to_equity)
                        weight_debt = debt_to_equity / (1 + debt_to_equity)
                        wacc = (weight_equity * cost_of_equity) + (weight_debt * cost_of_debt * (1 - tax_rate))
                except Exception as e:
                    logger.warning(f"Erro ao calcular WACC para {symbol}: {str(e)}")
                    # Fallback para cálculo manual
                    cost_of_debt = risk_free_rate + 0.03
                    weight_equity = 1 / (1 + debt_to_equity)
                    weight_debt = debt_to_equity / (1 + debt_to_equity)
                    wacc = (weight_equity * cost_of_equity) + (weight_debt * cost_of_debt * (1 - tax_rate))
            else:
                # Fallback para cálculo manual
                cost_of_debt = risk_free_rate + 0.03
                weight_equity = 1 / (1 + debt_to_equity)
                weight_debt = debt_to_equity / (1 + debt_to_equity)
                wacc = (weight_equity * cost_of_equity) + (weight_debt * cost_of_debt * (1 - tax_rate))
            
            # Projetar fluxos de caixa para 5 anos
            fcf_projections = []
            current_ebit = ebit
            
            for year in range(1, 6):
                projected_ebit = current_ebit * (1 + growth_rate) ** year
                nopat = projected_ebit * (1 - tax_rate)
                # Assumir CapEx = Depreciação e mudança em capital de giro = 2% da receita
                fcf = nopat * 0.85  # Fator de conversão conservador
                fcf_projections.append(fcf)
            
            # Valor terminal
            terminal_fcf = fcf_projections[-1] * (1 + terminal_growth)
            terminal_value = terminal_fcf / (wacc - terminal_growth)
            
            # Valor presente
            pv_fcf = sum([fcf / (1 + wacc) ** (i + 1) for i, fcf in enumerate(fcf_projections)])
            pv_terminal = terminal_value / (1 + wacc) ** 5
            
            enterprise_value = pv_fcf + pv_terminal
            
            # Converter para valor por ação
            div_liquida = fundamentus_data.get('dados_balanco_patrimonial', {}).get('div_liquida', 0)
            equity_value = enterprise_value - div_liquida
            target_price = equity_value / nro_acoes if equity_value > 0 else 0
            
            return target_price
            
        except Exception as e:
            logger.warning(f"Erro no DCF simplificado: {str(e)}")
            return None
    
    def _calculate_weighted_target_price(self, valuation_methods: Dict[str, float]) -> float:
        """Calcula preço-alvo ponderado"""
        if not valuation_methods:
            return 0
        
        # Pesos para cada método (baseado na confiabilidade)
        weights = {
            'P/E': 0.25,
            'P/B': 0.15,
            'EV/EBITDA': 0.20,
            'DDM': 0.15,
            'Graham': 0.10,
            'Asset-Based': 0.05,
            'DCF': 0.30
        }
        
        weighted_sum = 0
        total_weight = 0
        
        for method, price in valuation_methods.items():
            if method in weights and price > 0:
                weighted_sum += price * weights[method]
                total_weight += weights[method]
        
        return weighted_sum / total_weight if total_weight > 0 else np.mean(list(valuation_methods.values()))
    
    def _generate_recommendation(self, upside_potential: float) -> str:
        """Gera recomendação baseada no potencial de alta"""
        if upside_potential >= 20:
            return "COMPRA FORTE"
        elif upside_potential >= 10:
            return "COMPRA"
        elif upside_potential >= -5:
            return "MANTER"
        elif upside_potential >= -15:
            return "VENDA"
        else:
            return "VENDA FORTE"
    
    def _calculate_risk_metrics(self, fundamentus_data: Dict, market_data: Dict) -> Dict[str, float]:
        """Calcula métricas de risco usando CAPM real"""
        try:
            # Obter dados CAPM reais
            capm_result = market_data.get('capm_result')
            
            if capm_result:
                beta = capm_result.beta
                total_risk = capm_result.total_risk * 100
                systematic_risk = capm_result.systematic_risk * 100
                unsystematic_risk = capm_result.unsystematic_risk * 100
                sharpe_ratio = capm_result.sharpe_ratio
                treynor_ratio = capm_result.treynor_ratio
                jensen_alpha = capm_result.jensen_alpha
            else:
                # Fallback para dados estimados
                beta = market_data.get('beta', 1.0)
                total_risk = market_data.get('price_volatility', 30.0)
                systematic_risk = market_data.get('systematic_risk', total_risk * 0.7)
                unsystematic_risk = market_data.get('unsystematic_risk', total_risk * 0.3)
                sharpe_ratio = 0.0
                treynor_ratio = 0.0
                jensen_alpha = 0.0
            
            liquidity_risk = market_data.get('liquidity_risk', 'Médio')
            
            # Risco financeiro baseado em alavancagem
            div_br_patrim = fundamentus_data.get('indicadores_fundamentalistas', {}).get('div_br_patrim', 0)
            if div_br_patrim > 2.0:
                financial_risk = "Alto"
                financial_risk_score = 3
            elif div_br_patrim > 1.0:
                financial_risk = "Médio"
                financial_risk_score = 2
            else:
                financial_risk = "Baixo"
                financial_risk_score = 1
            
            # Risco de liquidez numérico
            liquidity_risk_score = {"Alto": 3, "Médio": 2, "Baixo": 1}.get(liquidity_risk, 2)
            
            # Score de risco geral (1-10, onde 10 é mais arriscado)
            risk_score = (
                min(10, beta * 2) * 0.3 +  # Risco sistemático
                min(10, total_risk / 10) * 0.3 +  # Volatilidade total
                financial_risk_score * 2 * 0.25 +  # Risco financeiro
                liquidity_risk_score * 2 * 0.15  # Risco de liquidez
            )
            
            return {
                'beta': beta,
                'total_risk': total_risk,
                'systematic_risk': systematic_risk,
                'unsystematic_risk': unsystematic_risk,
                'sharpe_ratio': sharpe_ratio,
                'treynor_ratio': treynor_ratio,
                'jensen_alpha': jensen_alpha,
                'liquidity_risk': liquidity_risk,
                'liquidity_risk_score': liquidity_risk_score,
                'financial_risk': financial_risk,
                'financial_risk_score': financial_risk_score,
                'debt_to_equity': div_br_patrim,
                'overall_risk_score': risk_score
            }
            
        except Exception as e:
            logger.warning(f"Erro no cálculo de métricas de risco: {str(e)}")
            return {
                'beta': 1.0,
                'total_risk': 30.0,
                'systematic_risk': 21.0,
                'unsystematic_risk': 9.0,
                'overall_risk_score': 5.0
            }
    
    def _assess_financial_health(self, fundamentus_data: Dict) -> Dict[str, Union[float, str]]:
        """Avalia saúde financeira da empresa"""
        try:
            # Indicadores de rentabilidade
            roe = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roe', 0)
            roic = fundamentus_data.get('indicadores_fundamentalistas', {}).get('roic', 0)
            marg_liquida = fundamentus_data.get('indicadores_fundamentalistas', {}).get('marg_liquida', 0)
            
            # Indicadores de endividamento
            div_br_patrim = fundamentus_data.get('indicadores_fundamentalistas', {}).get('div_br_patrim', 0)
            liquidez_corr = fundamentus_data.get('indicadores_fundamentalistas', {}).get('liquidez_corr', 0)
            
            # Score de saúde financeira (0-100)
            health_score = 0
            
            # Rentabilidade (40 pontos)
            if roe >= 15:
                health_score += 15
            elif roe >= 10:
                health_score += 10
            elif roe >= 5:
                health_score += 5
            
            if roic >= 12:
                health_score += 15
            elif roic >= 8:
                health_score += 10
            elif roic >= 4:
                health_score += 5
            
            if marg_liquida >= 10:
                health_score += 10
            elif marg_liquida >= 5:
                health_score += 7
            elif marg_liquida >= 2:
                health_score += 3
            
            # Solidez financeira (30 pontos)
            if div_br_patrim <= 0.5:
                health_score += 15
            elif div_br_patrim <= 1.0:
                health_score += 10
            elif div_br_patrim <= 2.0:
                health_score += 5
            
            if liquidez_corr >= 1.5:
                health_score += 15
            elif liquidez_corr >= 1.2:
                health_score += 10
            elif liquidez_corr >= 1.0:
                health_score += 5
            
            # Eficiência (30 pontos)
            giro_ativos = fundamentus_data.get('indicadores_fundamentalistas', {}).get('giro_ativos', 0)
            if giro_ativos >= 1.0:
                health_score += 15
            elif giro_ativos >= 0.5:
                health_score += 10
            elif giro_ativos >= 0.3:
                health_score += 5
            
            # Crescimento (baseado em dados históricos - simplificado)
            health_score += 15  # Assumir crescimento médio
            
            # Classificação
            if health_score >= 80:
                classification = "Excelente"
            elif health_score >= 60:
                classification = "Boa"
            elif health_score >= 40:
                classification = "Regular"
            else:
                classification = "Ruim"
            
            return {
                'health_score': health_score,
                'classification': classification,
                'roe': roe,
                'roic': roic,
                'debt_to_equity': div_br_patrim,
                'current_ratio': liquidez_corr,
                'net_margin': marg_liquida
            }
            
        except Exception as e:
            logger.warning(f"Erro na avaliação de saúde financeira: {str(e)}")
            return {'health_score': 50, 'classification': 'Indeterminado'}
    
    def _determine_confidence_level(self, valuation_methods: Dict, financial_health: Dict) -> str:
        """Determina nível de confiança da análise"""
        try:
            # Fatores que aumentam confiança
            num_methods = len(valuation_methods)
            health_score = financial_health.get('health_score', 50)
            
            # Calcular dispersão dos métodos de valuation
            prices = list(valuation_methods.values())
            if len(prices) > 1:
                cv = np.std(prices) / np.mean(prices)  # Coeficiente de variação
            else:
                cv = 0.5  # Média confiança se só um método
            
            confidence_score = 0
            
            # Número de métodos (30 pontos)
            if num_methods >= 5:
                confidence_score += 30
            elif num_methods >= 3:
                confidence_score += 20
            elif num_methods >= 2:
                confidence_score += 10
            
            # Saúde financeira (40 pontos)
            confidence_score += (health_score / 100) * 40
            
            # Convergência dos métodos (30 pontos)
            if cv <= 0.15:  # Baixa dispersão
                confidence_score += 30
            elif cv <= 0.25:
                confidence_score += 20
            elif cv <= 0.35:
                confidence_score += 10
            
            if confidence_score >= 70:
                return "Alta"
            elif confidence_score >= 50:
                return "Média"
            else:
                return "Baixa"
                
        except Exception as e:
            logger.warning(f"Erro na determinação do nível de confiança: {str(e)}")
            return "Média"

# Função de conveniência
def get_stock_valuation(symbol: str) -> Optional[Dict]:
    """
    Função de conveniência para obter valuation de uma ação
    
    Args:
        symbol: Código da ação
        
    Returns:
        Dicionário com resultado do valuation
    """
    engine = ValuationEngine()
    result = engine.get_comprehensive_valuation(symbol)
    
    if result:
        # Mapear métodos de valuation para o formato esperado pelo frontend
        valuation_methods_mapped = {
            'dcf': result.valuation_methods.get('DCF', 0),
            'multiples': (
                result.valuation_methods.get('P/E', 0) + 
                result.valuation_methods.get('P/B', 0) + 
                result.valuation_methods.get('EV/EBITDA', 0)
            ) / 3 if any(result.valuation_methods.get(k, 0) for k in ['P/E', 'P/B', 'EV/EBITDA']) else 0,
            'asset_based': result.valuation_methods.get('Asset-Based', 0)
        }
        
        # Extrair dados fundamentalistas do resultado
        fundamentals_data = {}
        if hasattr(result, 'fundamentus_data') and result.fundamentus_data:
            fund_indicators = result.fundamentus_data.get('indicadores_fundamentalistas', {})
            fundamentals_data = {
                'pe_ratio': fund_indicators.get('pl', 0),
                'pb_ratio': fund_indicators.get('pvp', 0),
                'roe': fund_indicators.get('roe', 0),
                'roic': fund_indicators.get('roic', 0),
                'debt_to_equity': fund_indicators.get('div_br_patrim', 0),
                'current_ratio': fund_indicators.get('liquidez_corr', 0)
            }
        else:
            # Usar dados da saúde financeira se disponível
            fundamentals_data = {
                'pe_ratio': 0,
                'pb_ratio': 0,
                'roe': result.financial_health.get('roe', 0),
                'roic': result.financial_health.get('roic', 0),
                'debt_to_equity': result.financial_health.get('debt_to_equity', 0),
                'current_ratio': result.financial_health.get('current_ratio', 0)
            }
        
        # Extrair dados de mercado do Fundamentus
        market_data = {
            'market_cap': result.fundamentus_data.get('valor_mercado', 0) if result.fundamentus_data else 0,
            'volume': result.fundamentus_data.get('vol_med_2m', 0) if result.fundamentus_data else 0,
            'avg_volume': result.fundamentus_data.get('vol_med_2m', 0) if result.fundamentus_data else 0,
            'week_52_high': result.fundamentus_data.get('max_52_sem', 0) if result.fundamentus_data else 0,
            'week_52_low': result.fundamentus_data.get('min_52_sem', 0) if result.fundamentus_data else 0
        }
        
        # Mapear métricas de risco
        risk_metrics_mapped = {
            'volatility': result.risk_metrics.get('total_risk', 0) / 100,  # Converter para decimal
            'beta': result.risk_metrics.get('beta', 1.0),
            'sharpe_ratio': result.risk_metrics.get('sharpe_ratio', 0)
        }
        
        return {
            'symbol': result.symbol,
            'current_price': result.current_price,
            'target_price': result.target_price,
            'upside_potential': result.upside_potential,
            'recommendation': result.recommendation,
            'confidence_level': result.confidence_level,
            'valuation_methods': valuation_methods_mapped,
            'risk_metrics': risk_metrics_mapped,
            'fundamentals': fundamentals_data,
            'market_data': market_data,
            'financial_health': result.financial_health,
            'timestamp': result.timestamp
        }
    
    return None 