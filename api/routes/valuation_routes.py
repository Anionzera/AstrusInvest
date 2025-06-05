#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
import logging
import traceback
from typing import Dict, List, Optional
import json
from datetime import datetime

# Importar o serviço de valuation
from services.valuation_engine import (
    ValuationEngine, 
    get_stock_valuation,
    DCFInputs
)

# Configuração de logging
logger = logging.getLogger('valuation-routes')
logger.setLevel(logging.INFO)

# Criar blueprint para as rotas de valuation
valuation_bp = Blueprint('valuation', __name__, url_prefix='/api/valuation')

@valuation_bp.route('/stock/<symbol>', methods=['GET'])
def get_stock_valuation_analysis(symbol: str):
    """
    Análise completa de valuation para uma ação específica
    
    Args:
        symbol: Código da ação (ex: PETR4, VALE3)
        
    Returns:
        JSON com análise completa de valuation
    """
    try:
        logger.info(f"Iniciando análise de valuation para {symbol}")
        
        # Validar símbolo
        if not symbol or len(symbol.strip()) == 0:
            return jsonify({
                "error": "Símbolo da ação não fornecido",
                "message": "É necessário fornecer um código de ação válido"
            }), 400
        
        # Obter análise de valuation
        valuation_result = get_stock_valuation(symbol.upper())
        
        if valuation_result is None:
            return jsonify({
                "error": "Análise não disponível",
                "message": f"Não foi possível realizar análise de valuation para {symbol.upper()}",
                "symbol": symbol.upper()
            }), 404
        
        # Adicionar metadados
        response_data = {
            "success": True,
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "Comprehensive Valuation",
            "valuation": valuation_result
        }
        
        logger.info(f"Análise de valuation concluída para {symbol}: {valuation_result['recommendation']}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na análise de valuation para {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e),
            "symbol": symbol
        }), 500

@valuation_bp.route('/stocks/multiple', methods=['POST'])
def get_multiple_stocks_valuation():
    """
    Análise de valuation para múltiplas ações
    
    Body:
        {
            "symbols": ["PETR4", "VALE3", "ITUB4"],
            "include_comparison": true  // opcional
        }
        
    Returns:
        JSON com análise de valuation de todas as ações
    """
    try:
        data = request.get_json()
        
        if not data or 'symbols' not in data:
            return jsonify({
                "error": "Dados inválidos",
                "message": "É necessário fornecer uma lista de símbolos no campo 'symbols'"
            }), 400
        
        symbols = data['symbols']
        include_comparison = data.get('include_comparison', False)
        
        if not isinstance(symbols, list) or len(symbols) == 0:
            return jsonify({
                "error": "Lista de símbolos inválida",
                "message": "O campo 'symbols' deve ser uma lista não vazia"
            }), 400
        
        # Limitar número de símbolos
        if len(symbols) > 20:
            return jsonify({
                "error": "Muitos símbolos",
                "message": "Máximo de 20 símbolos por requisição"
            }), 400
        
        logger.info(f"Analisando valuation para {len(symbols)} ações")
        
        # Obter análise para cada ação
        results = {}
        successful_analyses = []
        
        for symbol in symbols:
            try:
                valuation_result = get_stock_valuation(symbol.upper())
                if valuation_result:
                    results[symbol.upper()] = valuation_result
                    successful_analyses.append(valuation_result)
                else:
                    results[symbol.upper()] = None
            except Exception as e:
                logger.warning(f"Erro na análise de {symbol}: {str(e)}")
                results[symbol.upper()] = None
        
        # Análise comparativa se solicitada
        comparison = None
        if include_comparison and len(successful_analyses) > 1:
            comparison = _generate_comparative_analysis(successful_analyses)
        
        # Contar sucessos e falhas
        successful = sum(1 for result in results.values() if result is not None)
        failed = len(symbols) - successful
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "Multiple Stock Valuation",
            "summary": {
                "total_requested": len(symbols),
                "successful": successful,
                "failed": failed,
                "success_rate": f"{(successful/len(symbols)*100):.1f}%"
            },
            "valuations": results,
            "comparison": comparison
        }
        
        logger.info(f"Análise múltipla concluída: {successful} sucessos, {failed} falhas")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na análise múltipla de valuation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@valuation_bp.route('/ranking', methods=['GET'])
def get_valuation_ranking():
    """
    Ranking de ações por potencial de valorização
    
    Query Parameters:
        symbols: Lista de símbolos separados por vírgula (ex: PETR4,VALE3,ITUB4)
        metric: Métrica para ranking (upside_potential, target_price, health_score)
        limit: Número máximo de resultados (padrão: 10)
        
    Returns:
        JSON com ranking das ações
    """
    try:
        symbols_param = request.args.get('symbols', '')
        metric = request.args.get('metric', 'upside_potential').lower()
        limit = min(int(request.args.get('limit', 10)), 50)
        
        if not symbols_param:
            return jsonify({
                "error": "Símbolos não fornecidos",
                "message": "É necessário fornecer símbolos no parâmetro 'symbols'"
            }), 400
        
        symbols = [s.strip().upper() for s in symbols_param.split(',') if s.strip()]
        
        if len(symbols) == 0:
            return jsonify({
                "error": "Lista de símbolos vazia",
                "message": "É necessário fornecer pelo menos um símbolo válido"
            }), 400
        
        # Métricas válidas
        valid_metrics = ['upside_potential', 'target_price', 'health_score', 'confidence_level']
        if metric not in valid_metrics:
            return jsonify({
                "error": "Métrica inválida",
                "message": f"Métricas disponíveis: {', '.join(valid_metrics)}"
            }), 400
        
        logger.info(f"Gerando ranking por {metric} para {len(symbols)} ações")
        
        # Obter análises de valuation
        valuations = []
        for symbol in symbols:
            try:
                valuation_result = get_stock_valuation(symbol)
                if valuation_result:
                    valuations.append(valuation_result)
            except Exception as e:
                logger.warning(f"Erro na análise de {symbol}: {str(e)}")
        
        if not valuations:
            return jsonify({
                "error": "Nenhuma análise disponível",
                "message": "Não foi possível obter análises para os símbolos fornecidos"
            }), 404
        
        # Ordenar por métrica
        if metric == 'upside_potential':
            valuations.sort(key=lambda x: x.get('upside_potential', -999), reverse=True)
        elif metric == 'target_price':
            valuations.sort(key=lambda x: x.get('target_price', 0), reverse=True)
        elif metric == 'health_score':
            valuations.sort(key=lambda x: x.get('financial_health', {}).get('health_score', 0), reverse=True)
        elif metric == 'confidence_level':
            confidence_order = {'Alta': 3, 'Média': 2, 'Baixa': 1}
            valuations.sort(key=lambda x: confidence_order.get(x.get('confidence_level', 'Baixa'), 0), reverse=True)
        
        # Limitar resultados
        ranking = valuations[:limit]
        
        # Preparar dados do ranking
        ranking_data = []
        for idx, valuation in enumerate(ranking, 1):
            ranking_data.append({
                "rank": idx,
                "symbol": valuation.get('symbol'),
                "current_price": valuation.get('current_price'),
                "target_price": valuation.get('target_price'),
                "upside_potential": valuation.get('upside_potential'),
                "recommendation": valuation.get('recommendation'),
                "confidence_level": valuation.get('confidence_level'),
                "health_score": valuation.get('financial_health', {}).get('health_score'),
                "metric_value": _get_metric_value(valuation, metric)
            })
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "Valuation Ranking",
            "ranking": {
                "metric": metric,
                "total_analyzed": len(valuations),
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

@valuation_bp.route('/dcf/custom', methods=['POST'])
def custom_dcf_analysis():
    """
    Análise DCF customizada com parâmetros específicos
    
    Body:
        {
            "symbol": "PETR4",
            "dcf_inputs": {
                "revenue_growth_rates": [0.05, 0.04, 0.03, 0.03, 0.02],
                "ebitda_margins": [0.25, 0.24, 0.23, 0.22, 0.21],
                "capex_as_revenue": [0.08, 0.07, 0.06, 0.06, 0.05],
                "working_capital_change": [0.02, 0.01, 0.01, 0.01, 0.01],
                "tax_rate": 0.34,
                "terminal_growth_rate": 0.03,
                "wacc": 0.12
            }
        }
        
    Returns:
        JSON com análise DCF detalhada
    """
    try:
        data = request.get_json()
        
        if not data or 'symbol' not in data or 'dcf_inputs' not in data:
            return jsonify({
                "error": "Dados incompletos",
                "message": "É necessário fornecer 'symbol' e 'dcf_inputs'"
            }), 400
        
        symbol = data['symbol'].upper()
        dcf_params = data['dcf_inputs']
        
        logger.info(f"Executando DCF customizado para {symbol}")
        
        # Validar parâmetros DCF
        required_params = [
            'revenue_growth_rates', 'ebitda_margins', 'capex_as_revenue',
            'working_capital_change', 'tax_rate', 'terminal_growth_rate', 'wacc'
        ]
        
        for param in required_params:
            if param not in dcf_params:
                return jsonify({
                    "error": f"Parâmetro ausente: {param}",
                    "message": f"É necessário fornecer todos os parâmetros DCF"
                }), 400
        
        # Executar DCF customizado
        engine = ValuationEngine()
        dcf_result = engine._custom_dcf_analysis(symbol, dcf_params)
        
        if dcf_result is None:
            return jsonify({
                "error": "Análise DCF não disponível",
                "message": f"Não foi possível executar DCF para {symbol}"
            }), 404
        
        response_data = {
            "success": True,
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "Custom DCF Analysis",
            "dcf_analysis": dcf_result
        }
        
        logger.info(f"DCF customizado concluído para {symbol}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro no DCF customizado: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@valuation_bp.route('/sensitivity', methods=['POST'])
def sensitivity_analysis():
    """
    Análise de sensibilidade do valuation
    
    Body:
        {
            "symbol": "PETR4",
            "parameters": {
                "wacc_range": [0.08, 0.10, 0.12, 0.14, 0.16],
                "growth_range": [0.01, 0.02, 0.03, 0.04, 0.05]
            }
        }
        
    Returns:
        JSON com análise de sensibilidade
    """
    try:
        data = request.get_json()
        
        if not data or 'symbol' not in data:
            return jsonify({
                "error": "Símbolo não fornecido",
                "message": "É necessário fornecer o símbolo da ação"
            }), 400
        
        symbol = data['symbol'].upper()
        parameters = data.get('parameters', {})
        
        logger.info(f"Executando análise de sensibilidade para {symbol}")
        
        # Parâmetros padrão se não fornecidos
        wacc_range = parameters.get('wacc_range', [0.08, 0.10, 0.12, 0.14, 0.16])
        growth_range = parameters.get('growth_range', [0.01, 0.02, 0.03, 0.04, 0.05])
        
        # Executar análise de sensibilidade
        engine = ValuationEngine()
        sensitivity_result = engine._sensitivity_analysis(symbol, wacc_range, growth_range)
        
        if sensitivity_result is None:
            return jsonify({
                "error": "Análise de sensibilidade não disponível",
                "message": f"Não foi possível executar análise para {symbol}"
            }), 404
        
        response_data = {
            "success": True,
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "Sensitivity Analysis",
            "sensitivity": sensitivity_result
        }
        
        logger.info(f"Análise de sensibilidade concluída para {symbol}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro na análise de sensibilidade: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@valuation_bp.route('/methods', methods=['GET'])
def get_valuation_methods():
    """
    Lista os métodos de valuation disponíveis
    
    Returns:
        JSON com descrição dos métodos
    """
    try:
        methods = {
            "P/E": {
                "name": "Price-to-Earnings Ratio",
                "description": "Valuation baseado no múltiplo P/L comparado ao setor",
                "formula": "Preço Alvo = LPA × P/L Setorial Ajustado",
                "best_for": "Empresas com lucros consistentes"
            },
            "P/B": {
                "name": "Price-to-Book Ratio",
                "description": "Valuation baseado no valor patrimonial",
                "formula": "Preço Alvo = VPA × P/B Setorial Ajustado",
                "best_for": "Empresas com ativos tangíveis significativos"
            },
            "EV/EBITDA": {
                "name": "Enterprise Value to EBITDA",
                "description": "Valuation baseado no valor da empresa vs EBITDA",
                "formula": "EV Alvo = EBITDA × EV/EBITDA Setorial",
                "best_for": "Comparação entre empresas com diferentes estruturas de capital"
            },
            "DDM": {
                "name": "Dividend Discount Model",
                "description": "Valor presente dos dividendos futuros",
                "formula": "Preço = Dividendo / (Taxa Desconto - Taxa Crescimento)",
                "best_for": "Empresas pagadoras de dividendos consistentes"
            },
            "Graham": {
                "name": "Benjamin Graham Formula",
                "description": "Fórmula clássica de value investing",
                "formula": "Valor = √(22.5 × LPA × VPA)",
                "best_for": "Screening inicial de value stocks"
            },
            "Asset-Based": {
                "name": "Asset-Based Valuation",
                "description": "Valuation baseado nos ativos da empresa",
                "formula": "Preço = VPA × Fator de Qualidade",
                "best_for": "Empresas com ativos tangíveis ou em liquidação"
            },
            "DCF": {
                "name": "Discounted Cash Flow",
                "description": "Valor presente dos fluxos de caixa futuros",
                "formula": "Valor = Σ(FCF / (1+WACC)^t) + Valor Terminal",
                "best_for": "Análise fundamental detalhada"
            }
        }
        
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "valuation_methods": methods,
            "total_methods": len(methods)
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao listar métodos: {str(e)}")
        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e)
        }), 500

@valuation_bp.route('/health', methods=['GET'])
def health_check():
    """
    Verifica se o serviço de valuation está funcionando
    
    Returns:
        JSON com status do serviço
    """
    try:
        # Testar componentes básicos
        engine = ValuationEngine()
        
        # Verificar se consegue inicializar
        if engine.fundamentus_scraper and engine.sector_multiples:
            status = "healthy"
            message = "Serviço de valuation está funcionando normalmente"
        else:
            status = "degraded"
            message = "Alguns componentes podem estar indisponíveis"
        
        return jsonify({
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "service": "Valuation Engine",
            "components": {
                "fundamentus_scraper": "ok",
                "sector_multiples": "ok",
                "valuation_methods": len(engine.sector_multiples)
            }
        })
        
    except Exception as e:
        logger.error(f"Erro no health check: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "message": str(e),
            "timestamp": datetime.now().isoformat(),
            "service": "Valuation Engine"
        }), 503

# Funções auxiliares
def _generate_comparative_analysis(valuations: List[Dict]) -> Dict:
    """Gera análise comparativa entre múltiplas ações"""
    try:
        if len(valuations) < 2:
            return None
        
        # Estatísticas gerais
        upside_potentials = [v.get('upside_potential', 0) for v in valuations]
        target_prices = [v.get('target_price', 0) for v in valuations]
        health_scores = [v.get('financial_health', {}).get('health_score', 0) for v in valuations]
        
        # Recomendações
        recommendations = {}
        for v in valuations:
            rec = v.get('recommendation', 'MANTER')
            recommendations[rec] = recommendations.get(rec, 0) + 1
        
        # Melhores oportunidades
        best_upside = max(valuations, key=lambda x: x.get('upside_potential', -999))
        best_health = max(valuations, key=lambda x: x.get('financial_health', {}).get('health_score', 0))
        
        return {
            "statistics": {
                "avg_upside_potential": sum(upside_potentials) / len(upside_potentials),
                "max_upside_potential": max(upside_potentials),
                "min_upside_potential": min(upside_potentials),
                "avg_health_score": sum(health_scores) / len(health_scores),
                "avg_target_price": sum(target_prices) / len(target_prices)
            },
            "recommendations_distribution": recommendations,
            "best_opportunities": {
                "highest_upside": {
                    "symbol": best_upside.get('symbol'),
                    "upside_potential": best_upside.get('upside_potential')
                },
                "best_health": {
                    "symbol": best_health.get('symbol'),
                    "health_score": best_health.get('financial_health', {}).get('health_score')
                }
            }
        }
        
    except Exception as e:
        logger.warning(f"Erro na análise comparativa: {str(e)}")
        return None

def _get_metric_value(valuation: Dict, metric: str):
    """Obtém valor da métrica específica"""
    if metric == 'upside_potential':
        return valuation.get('upside_potential')
    elif metric == 'target_price':
        return valuation.get('target_price')
    elif metric == 'health_score':
        return valuation.get('financial_health', {}).get('health_score')
    elif metric == 'confidence_level':
        return valuation.get('confidence_level')
    return None

# Registrar blueprint (será feito no app.py)
def register_valuation_routes(app):
    """Registra as rotas de valuation na aplicação Flask"""
    app.register_blueprint(valuation_bp)
    logger.info("Rotas de valuation registradas com sucesso") 