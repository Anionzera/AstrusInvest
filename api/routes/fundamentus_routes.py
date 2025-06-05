#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
import logging
import traceback
from typing import Dict, List, Optional
import json
from datetime import datetime

# Importar o serviço do Fundamentus
from services.fundamentus_scraper import (
    FundamentusScraperFixed, 
    get_fundamentus_data_fixed, 
    get_multiple_fundamentus_data_fixed
)

# Configuração de logging
logger = logging.getLogger('fundamentus-routes')
logger.setLevel(logging.INFO)

# Criar blueprint para as rotas do Fundamentus
fundamentus_bp = Blueprint('fundamentus', __name__, url_prefix='/api/fundamentus')

@fundamentus_bp.route('/stock/<symbol>', methods=['GET'])
def get_stock_fundamentals(symbol: str):
    """
    Obtém dados fundamentalistas detalhados de uma ação específica
    
    Args:
        symbol: Código da ação (ex: PETR4, VALE3)
        
    Returns:
        JSON com todos os dados fundamentalistas da ação
    """
    try:
        logger.info(f"Buscando dados fundamentalistas para {symbol}")
        
        # Validar símbolo
        if not symbol or len(symbol.strip()) == 0:
            return jsonify({
                "error": "Símbolo da ação não fornecido",
                "message": "É necessário fornecer um código de ação válido"
            }), 400
        
        # Obter dados do Fundamentus
        fundamentus_data = get_fundamentus_data_fixed(symbol.upper())
        
        if fundamentus_data is None:
            return jsonify({
                "error": "Ação não encontrada",
                "message": f"Não foi possível encontrar dados para a ação {symbol.upper()}",
                "symbol": symbol.upper()
            }), 404
        
        # Adicionar metadados
        response_data = {
            "success": True,
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "data": fundamentus_data
        }
        
        logger.info(f"Dados fundamentalistas obtidos com sucesso para {symbol}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao obter dados fundamentalistas para {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e),
            "symbol": symbol
        }), 500

@fundamentus_bp.route('/stocks/multiple', methods=['POST'])
def get_multiple_stocks_fundamentals():
    """
    Obtém dados fundamentalistas para múltiplas ações
    
    Body:
        {
            "symbols": ["PETR4", "VALE3", "ITUB4"],
            "delay": 1.0  // opcional, delay entre requisições
        }
        
    Returns:
        JSON com dados de todas as ações solicitadas
    """
    try:
        data = request.get_json()
        
        if not data or 'symbols' not in data:
            return jsonify({
                "error": "Dados inválidos",
                "message": "É necessário fornecer uma lista de símbolos no campo 'symbols'"
            }), 400
        
        symbols = data['symbols']
        delay = data.get('delay', 1.0)
        
        if not isinstance(symbols, list) or len(symbols) == 0:
            return jsonify({
                "error": "Lista de símbolos inválida",
                "message": "O campo 'symbols' deve ser uma lista não vazia"
            }), 400
        
        # Limitar número de símbolos para evitar sobrecarga
        if len(symbols) > 50:
            return jsonify({
                "error": "Muitos símbolos",
                "message": "Máximo de 50 símbolos por requisição"
            }), 400
        
        logger.info(f"Buscando dados fundamentalistas para {len(symbols)} ações")
        
        # Obter dados para múltiplas ações
        results = get_multiple_fundamentus_data_fixed(symbols, delay)
        
        # Contar sucessos e falhas
        successful = sum(1 for result in results.values() if result is not None)
        failed = len(symbols) - successful
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "summary": {
                "total_requested": len(symbols),
                "successful": successful,
                "failed": failed,
                "success_rate": f"{(successful/len(symbols)*100):.1f}%"
            },
            "data": results
        }
        
        logger.info(f"Dados obtidos: {successful} sucessos, {failed} falhas")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao obter dados de múltiplas ações: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/stocks/all', methods=['GET'])
def get_all_stocks_summary():
    """
    Obtém resumo de todas as ações disponíveis no Fundamentus
    
    Query Parameters:
        format: 'json' ou 'csv' (padrão: json)
        
    Returns:
        JSON ou CSV com dados resumidos de todas as ações
    """
    try:
        format_type = request.args.get('format', 'json').lower()
        
        logger.info("Buscando resumo de todas as ações do Fundamentus")
        
        scraper = FundamentusScraperFixed()
        df = scraper.get_all_stocks_summary()
        
        if df is None or df.empty:
            return jsonify({
                "error": "Dados não disponíveis",
                "message": "Não foi possível obter dados do Fundamentus"
            }), 503
        
        if format_type == 'csv':
            # Retornar como CSV
            csv_data = df.to_csv(index=False)
            response = make_response(csv_data)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=fundamentus_all_stocks_{datetime.now().strftime("%Y%m%d")}.csv'
            return response
        else:
            # Retornar como JSON
            response_data = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "source": "Fundamentus",
                "total_stocks": len(df),
                "data": df.to_dict('records')
            }
            
            logger.info(f"Dados de {len(df)} ações obtidos com sucesso")
            return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao obter resumo de todas as ações: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/stocks/search', methods=['POST'])
def search_stocks_by_criteria():
    """
    Busca ações baseado em critérios fundamentalistas
    
    Body:
        {
            "criteria": {
                "pl_max": 15,
                "roe_min": 15,
                "div_yield_min": 5,
                "pvp_max": 2,
                "roic_min": 10,
                "marg_liquida_min": 5,
                "ev_ebit_max": 10,
                "liquidez_min": 1000000
            }
        }
        
    Returns:
        JSON com lista de ações que atendem aos critérios
    """
    try:
        data = request.get_json()
        
        if not data or 'criteria' not in data:
            return jsonify({
                "error": "Critérios não fornecidos",
                "message": "É necessário fornecer critérios de busca no campo 'criteria'"
            }), 400
        
        criteria = data['criteria']
        
        if not isinstance(criteria, dict) or len(criteria) == 0:
            return jsonify({
                "error": "Critérios inválidos",
                "message": "Os critérios devem ser um objeto não vazio"
            }), 400
        
        logger.info(f"Buscando ações com critérios: {criteria}")
        
        scraper = FundamentusScraperFixed()
        matching_stocks = scraper.search_stocks(criteria)
        
        if matching_stocks is None:
            return jsonify({
                "error": "Erro na busca",
                "message": "Não foi possível realizar a busca com os critérios fornecidos"
            }), 503
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "criteria": criteria,
            "total_matches": len(matching_stocks),
            "stocks": matching_stocks
        }
        
        logger.info(f"Encontradas {len(matching_stocks)} ações que atendem aos critérios")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na busca por critérios: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/analysis/sector', methods=['GET'])
def get_sector_analysis():
    """
    Análise fundamentalista por setor
    
    Query Parameters:
        sector: Nome do setor (opcional, se não fornecido retorna todos os setores)
        
    Returns:
        JSON com análise estatística do setor
    """
    try:
        sector = request.args.get('sector', None)
        
        logger.info(f"Realizando análise setorial para: {sector or 'todos os setores'}")
        
        scraper = FundamentusScraperFixed()
        analysis = scraper.get_sector_analysis(sector)
        
        if analysis is None:
            return jsonify({
                "error": "Dados não disponíveis",
                "message": "Não foi possível obter dados para análise setorial"
            }), 503
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "sector": sector or "Todos os setores",
            "analysis": analysis
        }
        
        logger.info(f"Análise setorial concluída para {analysis.get('total_empresas', 0)} empresas")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na análise setorial: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/stocks/ranking', methods=['GET'])
def get_stocks_ranking():
    """
    Ranking de ações por indicador específico
    
    Query Parameters:
        indicator: Indicador para ranking (pl, roe, roic, div_yield, etc.)
        order: 'asc' ou 'desc' (padrão: desc para indicadores positivos, asc para negativos)
        limit: Número máximo de resultados (padrão: 50, máximo: 200)
        
    Returns:
        JSON com ranking das ações pelo indicador escolhido
    """
    try:
        indicator = request.args.get('indicator', 'roe').lower()
        order = request.args.get('order', 'auto').lower()
        limit = min(int(request.args.get('limit', 50)), 200)
        
        # Mapeamento de indicadores
        indicator_mapping = {
            'pl': 'P/L',
            'pvp': 'P/VP',
            'roe': 'ROE',
            'roic': 'ROIC',
            'div_yield': 'Div.Yield',
            'marg_liquida': 'Mrg. Líq.',
            'ev_ebit': 'EV/EBIT',
            'liquidez': 'Liq.2meses'
        }
        
        if indicator not in indicator_mapping:
            return jsonify({
                "error": "Indicador inválido",
                "message": f"Indicadores disponíveis: {', '.join(indicator_mapping.keys())}"
            }), 400
        
        column_name = indicator_mapping[indicator]
        
        # Determinar ordem automática
        if order == 'auto':
            # Para indicadores onde maior é melhor
            positive_indicators = ['roe', 'roic', 'div_yield', 'marg_liquida', 'liquidez']
            order = 'desc' if indicator in positive_indicators else 'asc'
        
        logger.info(f"Gerando ranking por {indicator} (ordem: {order}, limite: {limit})")
        
        scraper = FundamentusScraperFixed()
        df = scraper.get_all_stocks_summary()
        
        if df is None or df.empty:
            return jsonify({
                "error": "Dados não disponíveis",
                "message": "Não foi possível obter dados para gerar ranking"
            }), 503
        
        if column_name not in df.columns:
            return jsonify({
                "error": "Indicador não encontrado",
                "message": f"O indicador {indicator} não está disponível nos dados"
            }), 400
        
        # Filtrar valores válidos e ordenar
        df_filtered = df[df[column_name].notna()].copy()
        ascending = (order == 'asc')
        df_sorted = df_filtered.sort_values(by=column_name, ascending=ascending)
        
        # Limitar resultados
        df_top = df_sorted.head(limit)
        
        # Preparar dados para resposta
        ranking_data = []
        for idx, (_, row) in enumerate(df_top.iterrows(), 1):
            ranking_data.append({
                "rank": idx,
                "papel": row.get('Papel', ''),
                "empresa": row.get('Empresa', ''),
                "setor": row.get('Setor', ''),
                "valor_indicador": float(row[column_name]) if pd.notna(row[column_name]) else None,
                "cotacao": float(row.get('Cotação', 0)) if pd.notna(row.get('Cotação')) else None
            })
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "ranking": {
                "indicator": indicator,
                "indicator_name": column_name,
                "order": order,
                "total_results": len(ranking_data),
                "data": ranking_data
            }
        }
        
        logger.info(f"Ranking gerado com {len(ranking_data)} resultados")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao gerar ranking: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/stocks/compare', methods=['POST'])
def compare_stocks():
    """
    Compara indicadores fundamentalistas entre múltiplas ações
    
    Body:
        {
            "symbols": ["PETR4", "VALE3", "ITUB4"],
            "indicators": ["pl", "roe", "roic", "div_yield"]  // opcional
        }
        
    Returns:
        JSON com comparação dos indicadores entre as ações
    """
    try:
        data = request.get_json()
        
        if not data or 'symbols' not in data:
            return jsonify({
                "error": "Símbolos não fornecidos",
                "message": "É necessário fornecer uma lista de símbolos no campo 'symbols'"
            }), 400
        
        symbols = data['symbols']
        requested_indicators = data.get('indicators', ['pl', 'pvp', 'roe', 'roic', 'div_yield'])
        
        if not isinstance(symbols, list) or len(symbols) < 2:
            return jsonify({
                "error": "Lista de símbolos inválida",
                "message": "É necessário fornecer pelo menos 2 símbolos para comparação"
            }), 400
        
        if len(symbols) > 10:
            return jsonify({
                "error": "Muitos símbolos",
                "message": "Máximo de 10 símbolos para comparação"
            }), 400
        
        logger.info(f"Comparando {len(symbols)} ações: {symbols}")
        
        # Obter dados de cada ação
        comparison_data = {}
        scraper = FundamentusScraperFixed()
        
        for symbol in symbols:
            stock_data = scraper.get_stock_details(symbol.upper())
            if stock_data:
                comparison_data[symbol.upper()] = scraper.to_dict(stock_data)
            else:
                comparison_data[symbol.upper()] = None
        
        # Preparar dados de comparação
        comparison_table = []
        
        for indicator in requested_indicators:
            row = {"indicator": indicator, "values": {}}
            
            for symbol, data in comparison_data.items():
                if data and 'indicadores_fundamentalistas' in data:
                    value = data['indicadores_fundamentalistas'].get(indicator)
                    row['values'][symbol] = value
                else:
                    row['values'][symbol] = None
            
            comparison_table.append(row)
        
        # Calcular estatísticas básicas
        stats = {}
        for indicator in requested_indicators:
            values = []
            for symbol, data in comparison_data.items():
                if data and 'indicadores_fundamentalistas' in data:
                    value = data['indicadores_fundamentalistas'].get(indicator)
                    if value is not None:
                        values.append(value)
            
            if values:
                stats[indicator] = {
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / len(values),
                    "count": len(values)
                }
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "source": "Fundamentus",
            "comparison": {
                "symbols": symbols,
                "indicators": requested_indicators,
                "data": comparison_data,
                "comparison_table": comparison_table,
                "statistics": stats
            }
        }
        
        logger.info(f"Comparação concluída para {len(symbols)} ações")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na comparação de ações: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@fundamentus_bp.route('/health', methods=['GET'])
def health_check():
    """
    Verifica se o serviço do Fundamentus está funcionando
    
    Returns:
        JSON com status do serviço
    """
    try:
        # Testar conexão básica com o Fundamentus
        scraper = FundamentusScraperFixed()
        test_response = scraper.session.get(scraper.BASE_URL, timeout=10)
        
        if test_response.status_code == 200:
            status = "healthy"
            message = "Serviço do Fundamentus está funcionando normalmente"
        else:
            status = "degraded"
            message = f"Fundamentus retornou status {test_response.status_code}"
        
        return jsonify({
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "service": "Fundamentus Scraper"
        })
        
    except Exception as e:
        logger.error(f"Erro no health check: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "message": str(e),
            "timestamp": datetime.now().isoformat(),
            "service": "Fundamentus Scraper"
        }), 503

# Importar make_response para CSV
from flask import make_response
import pandas as pd

# Registrar blueprint (será feito no app.py)
def register_fundamentus_routes(app):
    """Registra as rotas do Fundamentus na aplicação Flask"""
    app.register_blueprint(fundamentus_bp)
    logger.info("Rotas do Fundamentus registradas com sucesso") 