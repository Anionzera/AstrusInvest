#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import logging
from typing import Dict, Optional
from datetime import datetime
import json

# Configuração de logging
logger = logging.getLogger('macro-data-service')
logger.setLevel(logging.INFO)

class MacroDataService:
    """Serviço para obter dados macroeconômicos reais da API existente"""
    
    def __init__(self, api_base_url: str = "http://localhost:5000"):
        self.api_base_url = api_base_url
        self._cached_data = None
        self._cache_timestamp = None
        self._cache_duration = 300  # 5 minutos
    
    def get_macro_data(self, force_refresh: bool = False) -> Optional[Dict]:
        """
        Obtém dados macroeconômicos da API existente
        
        Args:
            force_refresh: Força atualização dos dados ignorando cache
            
        Returns:
            Dicionário com dados macroeconômicos ou None se erro
        """
        try:
            # Verificar cache
            if not force_refresh and self._is_cache_valid():
                logger.info("Usando dados macroeconômicos do cache")
                return self._cached_data
            
            logger.info("Buscando dados macroeconômicos da API")
            
            # Fazer requisição para a API existente
            url = f"{self.api_base_url}/api/market-data/macroeconomic"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Atualizar cache
                self._cached_data = data
                self._cache_timestamp = datetime.now()
                
                logger.info("Dados macroeconômicos obtidos com sucesso")
                return data
            else:
                logger.error(f"Erro ao obter dados macroeconômicos: HTTP {response.status_code}")
                return self._get_fallback_data()
                
        except requests.RequestException as e:
            logger.error(f"Erro de rede ao obter dados macroeconômicos: {str(e)}")
            return self._get_fallback_data()
        except Exception as e:
            logger.error(f"Erro inesperado ao obter dados macroeconômicos: {str(e)}")
            return self._get_fallback_data()
    
    def get_selic_rate(self) -> float:
        """Obtém a taxa SELIC atual"""
        try:
            data = self.get_macro_data()
            if not data:
                return 10.75  # Fallback
            
            # Buscar SELIC nos indicadores do Brasil
            brasil_indicadores = data.get('brasil', {}).get('indicadores', [])
            
            for indicador in brasil_indicadores:
                nome = indicador.get('nome', '').lower()
                if 'selic' in nome or 'taxa selic' in nome:
                    valor_str = indicador.get('valor', '10.75%')
                    # Extrair valor numérico
                    valor = float(valor_str.replace('%', '').replace(',', '.'))
                    logger.info(f"Taxa SELIC obtida: {valor}%")
                    return valor / 100  # Converter para decimal
            
            # Se não encontrou, tentar nas projeções
            projecoes = data.get('projecoes', [])
            for projecao in projecoes:
                nome = projecao.get('nome', '').lower()
                if 'selic' in nome:
                    valor_str = projecao.get('valor', '10.75%')
                    valor = float(valor_str.replace('%', '').replace(',', '.'))
                    logger.info(f"Taxa SELIC (projeção) obtida: {valor}%")
                    return valor / 100
            
            logger.warning("Taxa SELIC não encontrada, usando fallback")
            return 0.1075  # 10.75%
            
        except Exception as e:
            logger.error(f"Erro ao obter taxa SELIC: {str(e)}")
            return 0.1075
    
    def get_ipca_rate(self) -> float:
        """Obtém a taxa IPCA acumulada 12 meses"""
        try:
            data = self.get_macro_data()
            if not data:
                return 4.5  # Fallback
            
            brasil_indicadores = data.get('brasil', {}).get('indicadores', [])
            
            for indicador in brasil_indicadores:
                nome = indicador.get('nome', '').lower()
                if 'ipca' in nome and ('anual' in nome or '12' in nome):
                    valor_str = indicador.get('valor', '4.5%')
                    valor = float(valor_str.replace('%', '').replace(',', '.'))
                    logger.info(f"Taxa IPCA obtida: {valor}%")
                    return valor / 100
            
            logger.warning("Taxa IPCA não encontrada, usando fallback")
            return 0.045
            
        except Exception as e:
            logger.error(f"Erro ao obter taxa IPCA: {str(e)}")
            return 0.045
    
    def get_risk_free_rate(self) -> float:
        """Obtém a taxa livre de risco (SELIC)"""
        return self.get_selic_rate()
    
    def get_market_risk_premium(self) -> float:
        """
        Calcula o prêmio de risco de mercado baseado em dados reais
        
        Returns:
            Prêmio de risco de mercado em decimal
        """
        try:
            data = self.get_macro_data()
            if not data:
                return 0.06  # Fallback histórico
            
            # Obter risco país
            risco_pais = self._get_country_risk(data)
            
            # Obter volatilidade do mercado (baseada no Ibovespa)
            market_volatility = self._get_market_volatility(data)
            
            # Calcular prêmio de risco baseado em múltiplos fatores
            base_premium = 0.055  # Prêmio base histórico do mercado brasileiro
            
            # Ajustar pelo risco país (em pontos base)
            country_risk_adjustment = risco_pais / 10000  # Converter de pontos base
            
            # Ajustar pela volatilidade
            volatility_adjustment = max(0, (market_volatility - 20) / 100)  # Acima de 20% adiciona risco
            
            # Prêmio final
            market_risk_premium = base_premium + country_risk_adjustment + volatility_adjustment
            
            # Limitar entre 4% e 12%
            market_risk_premium = max(0.04, min(0.12, market_risk_premium))
            
            logger.info(f"Prêmio de risco de mercado calculado: {market_risk_premium:.4f}")
            return market_risk_premium
            
        except Exception as e:
            logger.error(f"Erro ao calcular prêmio de risco de mercado: {str(e)}")
            return 0.06
    
    def get_country_risk(self) -> float:
        """Obtém o risco país em pontos base"""
        try:
            data = self.get_macro_data()
            if not data:
                return 250  # Fallback
            
            return self._get_country_risk(data)
            
        except Exception as e:
            logger.error(f"Erro ao obter risco país: {str(e)}")
            return 250
    
    def get_inflation_rate(self) -> float:
        """Obtém a taxa de inflação (IPCA)"""
        return self.get_ipca_rate()
    
    def get_gdp_growth(self) -> float:
        """Obtém a taxa de crescimento do PIB"""
        try:
            data = self.get_macro_data()
            if not data:
                return 0.025  # Fallback
            
            brasil_indicadores = data.get('brasil', {}).get('indicadores', [])
            
            for indicador in brasil_indicadores:
                nome = indicador.get('nome', '').lower()
                if 'pib' in nome:
                    valor_str = indicador.get('valor', '2.5%')
                    valor = float(valor_str.replace('%', '').replace(',', '.'))
                    logger.info(f"Crescimento PIB obtido: {valor}%")
                    return valor / 100
            
            # Tentar nas projeções
            projecoes = data.get('projecoes', [])
            for projecao in projecoes:
                nome = projecao.get('nome', '').lower()
                if 'pib' in nome:
                    valor_str = projecao.get('valor', '2.5%')
                    valor = float(valor_str.replace('%', '').replace(',', '.'))
                    logger.info(f"Crescimento PIB (projeção) obtido: {valor}%")
                    return valor / 100
            
            return 0.025
            
        except Exception as e:
            logger.error(f"Erro ao obter crescimento do PIB: {str(e)}")
            return 0.025
    
    def get_exchange_rate(self) -> float:
        """Obtém a taxa de câmbio USD/BRL"""
        try:
            data = self.get_macro_data()
            if not data:
                return 5.0  # Fallback
            
            # Buscar nos indicadores dinâmicos
            dinamicos = data.get('brasil', {}).get('indicadoresDinamicos', [])
            
            for indicador in dinamicos:
                nome = indicador.get('nome', '').lower()
                if 'dólar' in nome or 'real/dólar' in nome or 'usd' in nome:
                    valor_str = indicador.get('valor', 'R$ 5,00')
                    # Extrair valor numérico
                    valor = float(valor_str.replace('R$', '').replace(',', '.').strip())
                    logger.info(f"Taxa de câmbio obtida: {valor}")
                    return valor
            
            return 5.0
            
        except Exception as e:
            logger.error(f"Erro ao obter taxa de câmbio: {str(e)}")
            return 5.0
    
    def _get_country_risk(self, data: Dict) -> float:
        """Extrai risco país dos dados"""
        try:
            brasil_indicadores = data.get('brasil', {}).get('indicadores', [])
            
            for indicador in brasil_indicadores:
                nome = indicador.get('nome', '').lower()
                if 'risco' in nome and 'brasil' in nome:
                    valor_str = indicador.get('valor', '250')
                    valor = float(valor_str.replace('pb', '').replace('pontos', '').strip())
                    return valor
            
            return 250  # Fallback
            
        except Exception:
            return 250
    
    def _get_market_volatility(self, data: Dict) -> float:
        """Estima volatilidade do mercado baseada nos dados disponíveis"""
        try:
            # Buscar variação do Ibovespa
            dinamicos = data.get('brasil', {}).get('indicadoresDinamicos', [])
            
            for indicador in dinamicos:
                nome = indicador.get('nome', '').lower()
                if 'ibovespa' in nome or 'bovespa' in nome:
                    variacao_str = indicador.get('variacaoPercentual', '0%')
                    variacao = abs(float(variacao_str.replace('%', '').replace(',', '.')))
                    # Estimar volatilidade anual baseada na variação diária
                    estimated_volatility = variacao * 16  # Aproximação: sqrt(252) ≈ 16
                    return min(50, max(15, estimated_volatility))  # Limitar entre 15% e 50%
            
            return 25  # Fallback
            
        except Exception:
            return 25
    
    def _is_cache_valid(self) -> bool:
        """Verifica se o cache ainda é válido"""
        if not self._cached_data or not self._cache_timestamp:
            return False
        
        elapsed = (datetime.now() - self._cache_timestamp).total_seconds()
        return elapsed < self._cache_duration
    
    def _get_fallback_data(self) -> Dict:
        """Retorna dados de fallback em caso de erro"""
        logger.warning("Usando dados macroeconômicos de fallback")
        
        return {
            'brasil': {
                'indicadores': [
                    {
                        'nome': 'Taxa Selic',
                        'valor': '10,75%',
                        'fonte': 'Banco Central do Brasil'
                    },
                    {
                        'nome': 'IPCA (Anual)',
                        'valor': '4,50%',
                        'fonte': 'IBGE'
                    },
                    {
                        'nome': 'PIB',
                        'valor': '2,50%',
                        'fonte': 'IBGE'
                    }
                ],
                'indicadoresDinamicos': [
                    {
                        'nome': 'Real/Dólar',
                        'valor': 'R$ 5,00',
                        'variacaoPercentual': '0,50%'
                    }
                ]
            },
            'projecoes': [
                {
                    'nome': 'Selic (fim de período)',
                    'valor': '10,50%',
                    'fonte': 'Focus'
                }
            ]
        }

        # Instância global do serviço
try:
    macro_service = MacroDataService()
except Exception as e:
    logger.error(f"Erro ao inicializar MacroDataService: {str(e)}")
    macro_service = None 