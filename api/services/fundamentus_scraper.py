#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import pandas as pd
import numpy as np
from bs4 import BeautifulSoup
import logging
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import urllib.parse
from dataclasses import dataclass
import json

# Configuração de logging
logger = logging.getLogger('fundamentus-scraper-fixed')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

@dataclass
class FundamentusData:
    """Classe para estruturar os dados fundamentalistas do Fundamentus"""
    papel: str
    tipo: str
    empresa: str
    setor: str
    subsetor: str
    
    # Cotação
    cotacao: float
    data_ult_cot: str
    min_52_sem: float
    max_52_sem: float
    vol_med_2m: int
    
    # Valor de mercado
    valor_mercado: int
    valor_firma: int
    ult_balanco: str
    nro_acoes: int
    
    # Oscilações
    dia: float
    mes: float
    dias_30: float
    meses_12: float
    ano_2025: float
    ano_2024: float
    ano_2023: float
    ano_2022: float
    ano_2021: float
    ano_2020: float
    
    # Indicadores fundamentalistas
    pl: float
    pvp: float
    pebit: float
    psr: float
    p_ativos: float
    p_cap_giro: float
    p_ativ_circ_liq: float
    div_yield: float
    ev_ebitda: float
    ev_ebit: float
    cres_rec_5a: float
    
    # Indicadores de eficiência
    lpa: float
    vpa: float
    marg_bruta: float
    marg_ebit: float
    marg_liquida: float
    ebit_ativo: float
    roic: float
    roe: float
    liquidez_corr: float
    div_br_patrim: float
    giro_ativos: float
    
    # Dados do balanço patrimonial
    ativo: int
    disponibilidades: int
    ativo_circulante: int
    div_bruta: int
    div_liquida: int
    patrim_liq: int
    
    # Dados demonstrativos de resultados (últimos 12 meses)
    receita_liquida: int
    ebit: int
    lucro_liquido: int
    
    # Dados demonstrativos de resultados (últimos 3 meses)
    receita_liquida_3m: int
    ebit_3m: int
    lucro_liquido_3m: int

class FundamentusScraperFixed:
    """Scraper corrigido para extrair dados fundamentalistas do site Fundamentus"""
    
    BASE_URL = "https://www.fundamentus.com.br"
    DETALHES_URL = f"{BASE_URL}/detalhes.php"
    RESULTADO_URL = f"{BASE_URL}/resultado.php"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        })
        
    def _clean_numeric_value(self, value: str) -> Union[float, int, None]:
        """Limpa e converte valores numéricos do Fundamentus"""
        if not value or value == '-' or value == '' or value.lower() == 'n/a':
            return None
            
        try:
            original_value = str(value).strip()
            
            # Verificar se é um valor em milhões/bilhões
            multiplier = 1
            if 'B' in original_value.upper() or 'BI' in original_value.upper():
                multiplier = 1_000_000_000
            elif 'M' in original_value.upper() or 'MI' in original_value.upper():
                multiplier = 1_000_000
            elif 'K' in original_value.upper():
                multiplier = 1_000
            
            # Remover caracteres não numéricos exceto vírgula, ponto e sinal de menos
            cleaned = re.sub(r'[^\d,.\-]', '', original_value)
            
            if not cleaned or cleaned == '-':
                return None
            
            # Tratar formato brasileiro: 1.234.567,89
            # Se tem vírgula e pontos, assumir que pontos são separadores de milhares
            if ',' in cleaned and '.' in cleaned:
                # Remover pontos (separadores de milhares) e trocar vírgula por ponto
                parts = cleaned.split(',')
                if len(parts) == 2:
                    integer_part = parts[0].replace('.', '')
                    decimal_part = parts[1]
                    cleaned = f"{integer_part}.{decimal_part}"
                else:
                    cleaned = cleaned.replace('.', '').replace(',', '.')
            elif ',' in cleaned:
                # Apenas vírgula - trocar por ponto
                cleaned = cleaned.replace(',', '.')
            elif '.' in cleaned:
                # Verificar se é separador decimal ou de milhares
                parts = cleaned.split('.')
                if len(parts) > 2:
                    # Múltiplos pontos = separadores de milhares
                    cleaned = cleaned.replace('.', '')
                elif len(parts) == 2 and len(parts[1]) > 2:
                    # Ponto com mais de 2 dígitos = separador de milhares
                    cleaned = cleaned.replace('.', '')
                # Senão, manter como separador decimal
                
            result = float(cleaned) * multiplier
            
            # Retornar como int se for um número inteiro grande
            if result.is_integer() and (multiplier > 1 or result > 1000):
                return int(result)
            
            return result
            
        except (ValueError, AttributeError) as e:
            logger.debug(f"Não foi possível converter valor '{value}': {str(e)}")
            return None
    
    def _clean_percentage_value(self, value: str) -> Optional[float]:
        """Limpa e converte valores percentuais"""
        if not value or value == '-' or value == '' or value.lower() == 'n/a':
            return None
            
        try:
            # Remover % e converter (vírgula para ponto)
            cleaned = value.replace('%', '').replace(',', '.').strip()
            return float(cleaned)
        except (ValueError, AttributeError):
            return None
    
    def _clean_date_value(self, value: str) -> Optional[str]:
        """Limpa e formata datas"""
        if not value or value == '-' or value == '' or value.lower() == 'n/a':
            return None
            
        # Formato esperado: DD/MM/AAAA
        date_pattern = r'(\d{2})/(\d{2})/(\d{4})'
        match = re.search(date_pattern, value)
        
        if match:
            return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
        
        return value
    
    def get_stock_details(self, symbol: str) -> Optional[FundamentusData]:
        """
        Obtém dados detalhados de uma ação específica
        
        Args:
            symbol: Código da ação (ex: PETR4, VALE3)
            
        Returns:
            FundamentusData com todos os dados da ação ou None se não encontrado
        """
        try:
            # Remover .SA se presente
            clean_symbol = symbol.replace('.SA', '').upper()
            
            logger.info(f"Buscando dados fundamentalistas para {clean_symbol}")
            
            # Fazer requisição para a página de detalhes
            params = {'papel': clean_symbol}
            response = self.session.get(self.DETALHES_URL, params=params, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Verificar se a ação foi encontrada
            if "não encontrado" in response.text.lower() or "erro" in response.text.lower():
                logger.warning(f"Ação {clean_symbol} não encontrada no Fundamentus")
                return None
            
            # Extrair dados usando a estrutura correta (classes label e data)
            data_dict = self._extract_data_from_classes(soup, clean_symbol)
            
            if not data_dict:
                logger.error(f"Não foi possível extrair dados para {clean_symbol}")
                return None
            
            # Converter para objeto FundamentusData
            fundamentus_data = self._create_fundamentus_data(data_dict)
            
            logger.info(f"Dados extraídos com sucesso para {clean_symbol}")
            return fundamentus_data
            
        except requests.RequestException as e:
            logger.error(f"Erro de rede ao buscar dados para {symbol}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Erro inesperado ao buscar dados para {symbol}: {str(e)}")
            return None
    
    def _extract_data_from_classes(self, soup: BeautifulSoup, symbol: str) -> Optional[Dict]:
        """Extrai os dados usando as classes 'label' e 'data' do Fundamentus"""
        try:
            data = {'papel': symbol}
            
            # Encontrar todos os elementos com classes 'label' e 'data'
            label_elements = soup.find_all(class_='label')
            data_elements = soup.find_all(class_='data')
            
            if len(label_elements) != len(data_elements):
                logger.warning(f"Número de labels ({len(label_elements)}) != número de dados ({len(data_elements)})")
            
            # Mapear labels para campos conhecidos
            field_mapping = {
                '?Papel': 'papel',
                '?Tipo': 'tipo',
                '?Empresa': 'empresa',
                '?Setor': 'setor',
                '?Subsetor': 'subsetor',
                '?Cotação': 'cotacao',
                '?Data últ cot': 'data_ult_cot',
                '?Min 52 sem': 'min_52_sem',
                '?Max 52 sem': 'max_52_sem',
                '?Vol $ méd (2m)': 'vol_med_2m',
                '?Valor de mercado': 'valor_mercado',
                '?Valor da firma': 'valor_firma',
                '?Últ balanço processado': 'ult_balanco',
                '?Nro. Ações': 'nro_acoes',
                'Dia': 'dia',
                'Mês': 'mes',
                '30 dias': 'dias_30',
                '12 meses': 'meses_12',
                '2025': 'ano_2025',
                '2024': 'ano_2024',
                '2023': 'ano_2023',
                '2022': 'ano_2022',
                '2021': 'ano_2021',
                '2020': 'ano_2020',
                '?P/L': 'pl',
                '?P/VP': 'pvp',
                '?P/EBIT': 'pebit',
                '?PSR': 'psr',
                '?P/Ativos': 'p_ativos',
                '?P/Cap. Giro': 'p_cap_giro',
                '?P/Ativ Circ Liq': 'p_ativ_circ_liq',
                '?Div. Yield': 'div_yield',
                '?EV/EBITDA': 'ev_ebitda',
                '?EV / EBITDA': 'ev_ebitda',
                '?EV/EBIT': 'ev_ebit',
                '?EV / EBIT': 'ev_ebit',
                '?Cres. Rec (5a)': 'cres_rec_5a',
                '?LPA': 'lpa',
                '?VPA': 'vpa',
                '?Marg. Bruta': 'marg_bruta',
                '?Marg. EBIT': 'marg_ebit',
                '?Marg. Líquida': 'marg_liquida',
                '?EBIT / Ativo': 'ebit_ativo',
                '?ROIC': 'roic',
                '?ROE': 'roe',
                '?Liquidez Corr': 'liquidez_corr',
                '?Div Br/ Patrim': 'div_br_patrim',
                '?Giro Ativos': 'giro_ativos',
                '?Ativo': 'ativo',
                '?Disponibilidades': 'disponibilidades',
                '?Ativo Circulante': 'ativo_circulante',
                '?Dív. Bruta': 'div_bruta',
                '?Dív. Líquida': 'div_liquida',
                '?Patrim. Líq': 'patrim_liq',
                '?Receita Líquida': 'receita_liquida',
                '?EBIT': 'ebit',
                '?Lucro Líquido': 'lucro_liquido'
            }
            
            # Extrair dados dos pares label-data
            for i in range(min(len(label_elements), len(data_elements))):
                label = label_elements[i].get_text(strip=True)
                value = data_elements[i].get_text(strip=True)
                
                if label in field_mapping:
                    field_name = field_mapping[label]
                    data[field_name] = value
                    logger.debug(f"Extraído: {label} = {value}")
            
            # Buscar dados específicos dos últimos 3 meses se disponível
            self._extract_quarterly_data(soup, data)
            
            logger.info(f"Total de campos extraídos: {len(data)}")
            return data
            
        except Exception as e:
            logger.error(f"Erro ao extrair dados da página: {str(e)}")
            return None
    
    def _extract_quarterly_data(self, soup: BeautifulSoup, data: Dict):
        """Extrai dados financeiros (12 meses e 3 meses) se disponíveis"""
        try:
            # Procurar por tabelas com dados demonstrativos
            tables = soup.find_all('table')
            
            for table in tables:
                # Procurar por cabeçalhos que indiquem dados financeiros
                headers = table.find_all(['th', 'td'])
                header_texts = [h.get_text(strip=True) for h in headers]
                
                # Verificar se é a tabela de dados demonstrativos
                if any('12 meses' in text or 'Últimos 12 meses' in text for text in header_texts):
                    logger.debug("Encontrada tabela de dados demonstrativos")
                    
                    rows = table.find_all('tr')
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 3:  # Label + 12m + 3m
                            label = cells[0].get_text(strip=True)
                            value_12m = cells[1].get_text(strip=True) if len(cells) > 1 else ''
                            value_3m = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                            
                            # Mapear dados de 12 meses
                            if 'Receita Líquida' in label:
                                if value_12m and value_12m != '-':
                                    data['receita_liquida'] = value_12m
                                if value_3m and value_3m != '-':
                                    data['receita_liquida_3m'] = value_3m
                            elif 'EBIT' in label and 'EBITDA' not in label:
                                if value_12m and value_12m != '-':
                                    data['ebit'] = value_12m
                                if value_3m and value_3m != '-':
                                    data['ebit_3m'] = value_3m
                            elif 'Lucro Líquido' in label:
                                if value_12m and value_12m != '-':
                                    data['lucro_liquido'] = value_12m
                                if value_3m and value_3m != '-':
                                    data['lucro_liquido_3m'] = value_3m
                                        
        except Exception as e:
            logger.warning(f"Erro ao extrair dados financeiros: {str(e)}")
    
    def _create_fundamentus_data(self, data_dict: Dict) -> FundamentusData:
        """Cria objeto FundamentusData a partir do dicionário extraído"""
        try:
            return FundamentusData(
                papel=data_dict.get('papel', ''),
                tipo=data_dict.get('tipo', ''),
                empresa=data_dict.get('empresa', ''),
                setor=data_dict.get('setor', ''),
                subsetor=data_dict.get('subsetor', ''),
                
                cotacao=self._clean_numeric_value(data_dict.get('cotacao', 0)) or 0.0,
                data_ult_cot=self._clean_date_value(data_dict.get('data_ult_cot', '')),
                min_52_sem=self._clean_numeric_value(data_dict.get('min_52_sem', 0)) or 0.0,
                max_52_sem=self._clean_numeric_value(data_dict.get('max_52_sem', 0)) or 0.0,
                vol_med_2m=int(self._clean_numeric_value(data_dict.get('vol_med_2m', 0)) or 0),
                
                valor_mercado=int(self._clean_numeric_value(data_dict.get('valor_mercado', 0)) or 0),
                valor_firma=int(self._clean_numeric_value(data_dict.get('valor_firma', 0)) or 0),
                ult_balanco=self._clean_date_value(data_dict.get('ult_balanco', '')),
                nro_acoes=int(self._clean_numeric_value(data_dict.get('nro_acoes', 0)) or 0),
                
                dia=self._clean_percentage_value(data_dict.get('dia', '0')) or 0.0,
                mes=self._clean_percentage_value(data_dict.get('mes', '0')) or 0.0,
                dias_30=self._clean_percentage_value(data_dict.get('dias_30', '0')) or 0.0,
                meses_12=self._clean_percentage_value(data_dict.get('meses_12', '0')) or 0.0,
                ano_2025=self._clean_percentage_value(data_dict.get('ano_2025', '0')) or 0.0,
                ano_2024=self._clean_percentage_value(data_dict.get('ano_2024', '0')) or 0.0,
                ano_2023=self._clean_percentage_value(data_dict.get('ano_2023', '0')) or 0.0,
                ano_2022=self._clean_percentage_value(data_dict.get('ano_2022', '0')) or 0.0,
                ano_2021=self._clean_percentage_value(data_dict.get('ano_2021', '0')) or 0.0,
                ano_2020=self._clean_percentage_value(data_dict.get('ano_2020', '0')) or 0.0,
                
                pl=self._clean_numeric_value(data_dict.get('pl', 0)) or 0.0,
                pvp=self._clean_numeric_value(data_dict.get('pvp', 0)) or 0.0,
                pebit=self._clean_numeric_value(data_dict.get('pebit', 0)) or 0.0,
                psr=self._clean_numeric_value(data_dict.get('psr', 0)) or 0.0,
                p_ativos=self._clean_numeric_value(data_dict.get('p_ativos', 0)) or 0.0,
                p_cap_giro=self._clean_numeric_value(data_dict.get('p_cap_giro', 0)) or 0.0,
                p_ativ_circ_liq=self._clean_numeric_value(data_dict.get('p_ativ_circ_liq', 0)) or 0.0,
                div_yield=self._clean_percentage_value(data_dict.get('div_yield', '0')) or 0.0,
                ev_ebitda=self._clean_numeric_value(data_dict.get('ev_ebitda', 0)) or 0.0,
                ev_ebit=self._clean_numeric_value(data_dict.get('ev_ebit', 0)) or 0.0,
                cres_rec_5a=self._clean_percentage_value(data_dict.get('cres_rec_5a', '0')) or 0.0,
                
                lpa=self._clean_numeric_value(data_dict.get('lpa', 0)) or 0.0,
                vpa=self._clean_numeric_value(data_dict.get('vpa', 0)) or 0.0,
                marg_bruta=self._clean_percentage_value(data_dict.get('marg_bruta', '0')) or 0.0,
                marg_ebit=self._clean_percentage_value(data_dict.get('marg_ebit', '0')) or 0.0,
                marg_liquida=self._clean_percentage_value(data_dict.get('marg_liquida', '0')) or 0.0,
                ebit_ativo=self._clean_percentage_value(data_dict.get('ebit_ativo', '0')) or 0.0,
                roic=self._clean_percentage_value(data_dict.get('roic', '0')) or 0.0,
                roe=self._clean_percentage_value(data_dict.get('roe', '0')) or 0.0,
                liquidez_corr=self._clean_numeric_value(data_dict.get('liquidez_corr', 0)) or 0.0,
                div_br_patrim=self._clean_numeric_value(data_dict.get('div_br_patrim', 0)) or 0.0,
                giro_ativos=self._clean_numeric_value(data_dict.get('giro_ativos', 0)) or 0.0,
                
                ativo=int(self._clean_numeric_value(data_dict.get('ativo', 0)) or 0),
                disponibilidades=int(self._clean_numeric_value(data_dict.get('disponibilidades', 0)) or 0),
                ativo_circulante=int(self._clean_numeric_value(data_dict.get('ativo_circulante', 0)) or 0),
                div_bruta=int(self._clean_numeric_value(data_dict.get('div_bruta', 0)) or 0),
                div_liquida=int(self._clean_numeric_value(data_dict.get('div_liquida', 0)) or 0),
                patrim_liq=int(self._clean_numeric_value(data_dict.get('patrim_liq', 0)) or 0),
                
                receita_liquida=int(self._clean_numeric_value(data_dict.get('receita_liquida', 0)) or 0),
                ebit=int(self._clean_numeric_value(data_dict.get('ebit', 0)) or 0),
                lucro_liquido=int(self._clean_numeric_value(data_dict.get('lucro_liquido', 0)) or 0),
                
                receita_liquida_3m=int(self._clean_numeric_value(data_dict.get('receita_liquida_3m', 0)) or 0),
                ebit_3m=int(self._clean_numeric_value(data_dict.get('ebit_3m', 0)) or 0),
                lucro_liquido_3m=int(self._clean_numeric_value(data_dict.get('lucro_liquido_3m', 0)) or 0),
            )
            
        except Exception as e:
            logger.error(f"Erro ao criar objeto FundamentusData: {str(e)}")
            raise
    
    def to_dict(self, fundamentus_data: FundamentusData) -> Dict:
        """Converte FundamentusData para dicionário"""
        return {
            'papel': fundamentus_data.papel,
            'tipo': fundamentus_data.tipo,
            'empresa': fundamentus_data.empresa,
            'setor': fundamentus_data.setor,
            'subsetor': fundamentus_data.subsetor,
            'cotacao': fundamentus_data.cotacao,
            'data_ult_cot': fundamentus_data.data_ult_cot,
            'min_52_sem': fundamentus_data.min_52_sem,
            'max_52_sem': fundamentus_data.max_52_sem,
            'vol_med_2m': fundamentus_data.vol_med_2m,
            'valor_mercado': fundamentus_data.valor_mercado,
            'valor_firma': fundamentus_data.valor_firma,
            'ult_balanco': fundamentus_data.ult_balanco,
            'nro_acoes': fundamentus_data.nro_acoes,
            
            'oscilacoes': {
                'dia': fundamentus_data.dia,
                'mes': fundamentus_data.mes,
                'dias_30': fundamentus_data.dias_30,
                'meses_12': fundamentus_data.meses_12,
                'ano_2025': fundamentus_data.ano_2025,
                'ano_2024': fundamentus_data.ano_2024,
                'ano_2023': fundamentus_data.ano_2023,
                'ano_2022': fundamentus_data.ano_2022,
                'ano_2021': fundamentus_data.ano_2021,
                'ano_2020': fundamentus_data.ano_2020,
            },
            
            'indicadores_fundamentalistas': {
                'pl': fundamentus_data.pl,
                'pvp': fundamentus_data.pvp,
                'pebit': fundamentus_data.pebit,
                'psr': fundamentus_data.psr,
                'p_ativos': fundamentus_data.p_ativos,
                'p_cap_giro': fundamentus_data.p_cap_giro,
                'p_ativ_circ_liq': fundamentus_data.p_ativ_circ_liq,
                'div_yield': fundamentus_data.div_yield,
                'ev_ebitda': fundamentus_data.ev_ebitda,
                'ev_ebit': fundamentus_data.ev_ebit,
                'cres_rec_5a': fundamentus_data.cres_rec_5a,
                'lpa': fundamentus_data.lpa,
                'vpa': fundamentus_data.vpa,
                'marg_bruta': fundamentus_data.marg_bruta,
                'marg_ebit': fundamentus_data.marg_ebit,
                'marg_liquida': fundamentus_data.marg_liquida,
                'ebit_ativo': fundamentus_data.ebit_ativo,
                'roic': fundamentus_data.roic,
                'roe': fundamentus_data.roe,
                'liquidez_corr': fundamentus_data.liquidez_corr,
                'div_br_patrim': fundamentus_data.div_br_patrim,
                'giro_ativos': fundamentus_data.giro_ativos,
            },
            
            'dados_balanco_patrimonial': {
                'ativo': fundamentus_data.ativo,
                'disponibilidades': fundamentus_data.disponibilidades,
                'ativo_circulante': fundamentus_data.ativo_circulante,
                'div_bruta': fundamentus_data.div_bruta,
                'div_liquida': fundamentus_data.div_liquida,
                'patrim_liq': fundamentus_data.patrim_liq,
            },
            
            'dados_demonstrativos_resultados': {
                'ultimos_12_meses': {
                    'receita_liquida': fundamentus_data.receita_liquida,
                    'ebit': fundamentus_data.ebit,
                    'lucro_liquido': fundamentus_data.lucro_liquido,
                },
                'ultimos_3_meses': {
                    'receita_liquida': fundamentus_data.receita_liquida_3m,
                    'ebit': fundamentus_data.ebit_3m,
                    'lucro_liquido': fundamentus_data.lucro_liquido_3m,
                }
            }
        }

# Funções de conveniência para uso direto
def get_fundamentus_data_fixed(symbol: str) -> Optional[Dict]:
    """
    Função de conveniência para obter dados do Fundamentus (versão corrigida)
    
    Args:
        symbol: Código da ação
        
    Returns:
        Dicionário com dados fundamentalistas ou None
    """
    scraper = FundamentusScraperFixed()
    data = scraper.get_stock_details(symbol)
    
    if data:
        return scraper.to_dict(data)
    
    return None

def get_multiple_fundamentus_data_fixed(symbols: List[str], delay: float = 1.0) -> Dict[str, Dict]:
    """
    Obtém dados do Fundamentus para múltiplas ações (versão corrigida)
    
    Args:
        symbols: Lista de códigos de ações
        delay: Delay entre requisições em segundos
        
    Returns:
        Dicionário com dados de cada ação
    """
    scraper = FundamentusScraperFixed()
    results = {}
    
    for symbol in symbols:
        try:
            data = scraper.get_stock_details(symbol)
            if data:
                results[symbol] = scraper.to_dict(data)
            else:
                results[symbol] = None
                
            # Delay para evitar sobrecarga do servidor
            if delay > 0:
                time.sleep(delay)
                
        except Exception as e:
            logger.error(f"Erro ao obter dados para {symbol}: {str(e)}")
            results[symbol] = None
    
    return results 