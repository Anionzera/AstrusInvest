from flask import Blueprint, request, jsonify
import logging
import pandas as pd
import json
from datetime import datetime, timedelta
import sys
import os

# Adicionar o diretório pai ao sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.arctic_service import ArcticDBService
from utils.data_migration import migrate_symbol_data

# Configuração de logging
logger = logging.getLogger('arctic-routes')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Criar blueprint para as rotas do ArcticDB
arctic_bp = Blueprint('arctic', __name__)

# Instância do serviço ArcticDB (singleton)
arctic_service = ArcticDBService()

@arctic_bp.route('/symbols', methods=['GET'])
def list_symbols():
    """Lista todos os símbolos disponíveis no ArcticDB"""
    try:
        # Obter parâmetros opcionais
        library = request.args.get('library', 'market_data')
        filter_tags = request.args.get('tags')
        
        # Converter tags para lista se fornecidas
        tag_list = None
        if filter_tags:
            tag_list = [tag.strip() for tag in filter_tags.split(',')]
        
        # Listar símbolos
        symbols = arctic_service.list_symbols(library=library, filter_tags=tag_list)
        
        # Adicionar metadados para cada símbolo (opcional)
        include_metadata = request.args.get('include_metadata') == 'true'
        if include_metadata:
            result = []
            for symbol in symbols:
                metadata = arctic_service.get_metadata(symbol, library=library)
                
                # Processar metadados para torná-los serializáveis
                processed_metadata = {}
                for key, value in metadata.items():
                    if isinstance(value, (datetime, pd.Timestamp)):
                        processed_metadata[key] = value.isoformat()
                    elif isinstance(value, (list, dict, str, int, float, bool)) or value is None:
                        processed_metadata[key] = value
                    else:
                        processed_metadata[key] = str(value)
                
                result.append({
                    'symbol': symbol,
                    'metadata': processed_metadata
                })
            return jsonify(result)
        else:
            return jsonify(symbols)
            
    except Exception as e:
        logger.error(f"Erro ao listar símbolos: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/market-data/<symbol>', methods=['GET'])
def get_market_data(symbol):
    """Obtém dados de mercado para um símbolo específico"""
    try:
        # Obter parâmetros
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        as_of_date = request.args.get('as_of')
        
        # Obter dados do ArcticDB
        data, metadata = arctic_service.read_market_data(
            symbol, 
            start_date=start_date, 
            end_date=end_date, 
            as_of_date=as_of_date
        )
        
        if data.empty:
            return jsonify({
                'symbol': symbol,
                'message': 'Nenhum dado encontrado',
                'data': {}
            }), 404
        
        # Processar metadados para torná-los serializáveis
        processed_metadata = {}
        for key, value in metadata.items():
            if isinstance(value, (datetime, pd.Timestamp)):
                processed_metadata[key] = value.isoformat()
            elif isinstance(value, (list, dict, str, int, float, bool)) or value is None:
                processed_metadata[key] = value
            else:
                processed_metadata[key] = str(value)
        
        # Converter o DataFrame para o formato apropriado
        data_format = request.args.get('format', 'records')
        if data_format == 'csv':
            return data.to_csv(), {'Content-Type': 'text/csv'}
        elif data_format == 'json':
            return jsonify({
                'symbol': symbol,
                'metadata': processed_metadata,
                'data': json.loads(data.to_json(orient='records', date_format='iso'))
            })
        else:  # default: records
            # Converter o índice para datas ISO formatadas
            data_dict = data.reset_index().to_dict(orient='records')
            
            return jsonify({
                'symbol': symbol,
                'metadata': processed_metadata,
                'data': data_dict
            })
            
    except Exception as e:
        logger.error(f"Erro ao obter dados para {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/market-data/<symbol>', methods=['POST'])
def update_market_data(symbol):
    """Atualiza ou cria dados de mercado para um símbolo"""
    try:
        # Verificar se os dados foram fornecidos
        if not request.is_json:
            return jsonify({'error': 'Payload deve ser JSON'}), 400
        
        payload = request.json
        
        # Verificar se é para buscar dados do Yahoo Finance
        if 'fetch_from_yahoo' in payload and payload['fetch_from_yahoo']:
            # Obter parâmetros para busca no Yahoo Finance
            period = payload.get('period', '1y')
            interval = payload.get('interval', '1d')
            
            # Migrar dados do Yahoo Finance
            success = migrate_symbol_data(
                symbol, 
                period=period, 
                interval=interval, 
                arctic_service=arctic_service
            )
            
            if success:
                return jsonify({
                    'success': True,
                    'message': f'Dados para {symbol} atualizados com sucesso do Yahoo Finance'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Falha ao obter dados para {symbol} do Yahoo Finance'
                }), 500
        
        # Caso contrário, atualizar com dados fornecidos
        else:
            # Verificar se dados foram fornecidos
            if 'data' not in payload:
                return jsonify({'error': 'Campo "data" é obrigatório'}), 400
            
            # Converter dados para DataFrame
            try:
                data = pd.DataFrame(payload['data'])
                
                # Verificar se há coluna de data
                date_col = None
                for col in ['date', 'Date', 'timestamp', 'Timestamp']:
                    if col in data.columns:
                        date_col = col
                        break
                
                if date_col:
                    data[date_col] = pd.to_datetime(data[date_col])
                    data = data.set_index(date_col)
                else:
                    return jsonify({'error': 'Dados devem conter uma coluna de data'}), 400
            except Exception as e:
                return jsonify({'error': f'Erro ao processar dados: {str(e)}'}), 400
            
            # Obter metadados e tags opcionais
            metadata = payload.get('metadata', {})
            tags = payload.get('tags', [])
            
            # Opção para apenas adicionar novos dados sem sobrescrever
            append_only = payload.get('append_only', False)
            
            # Atualizar dados no ArcticDB
            result = arctic_service.update_market_data(
                symbol, 
                data, 
                upsert=True, 
                append_only=append_only
            )
            
            if result:
                return jsonify({
                    'success': True,
                    'message': f'Dados para {symbol} atualizados com sucesso'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Falha ao atualizar dados para {symbol}'
                }), 500
            
    except Exception as e:
        logger.error(f"Erro ao atualizar dados para {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/market-data/<symbol>', methods=['DELETE'])
def delete_market_data(symbol):
    """Remove dados de mercado para um símbolo"""
    try:
        # Deletar o símbolo do ArcticDB
        result = arctic_service.delete_symbol(symbol)
        
        if result:
            return jsonify({
                'success': True,
                'message': f'Dados para {symbol} removidos com sucesso'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Falha ao remover dados para {symbol}'
            }), 500
            
    except Exception as e:
        logger.error(f"Erro ao remover dados para {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/market-data/<symbol>/versions', methods=['GET'])
def get_version_history(symbol):
    """Obtém histórico de versões para um símbolo"""
    try:
        # Obter histórico de versões
        versions = arctic_service.get_version_history(symbol)
        
        # Processar versões para torná-las serializáveis
        processed_versions = []
        for v in versions:
            processed_version = {}
            for key, value in v.items():
                if isinstance(value, (datetime, pd.Timestamp)):
                    processed_version[key] = value.isoformat()
                elif isinstance(value, (list, dict, str, int, float, bool)) or value is None:
                    processed_version[key] = value
                else:
                    processed_version[key] = str(value)
            processed_versions.append(processed_version)
        
        return jsonify({
            'symbol': symbol,
            'versions': processed_versions
        })
            
    except Exception as e:
        logger.error(f"Erro ao obter histórico de versões para {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/metadata/<symbol>', methods=['GET'])
def get_metadata(symbol):
    """Obtém metadados para um símbolo"""
    try:
        # Obter parâmetros
        library = request.args.get('library', 'market_data')
        
        # Obter metadados
        metadata = arctic_service.get_metadata(symbol, library=library)
        
        # Processar metadados para torná-los serializáveis
        processed_metadata = {}
        for key, value in metadata.items():
            if isinstance(value, (datetime, pd.Timestamp)):
                processed_metadata[key] = value.isoformat()
            elif isinstance(value, (list, dict, str, int, float, bool)) or value is None:
                processed_metadata[key] = value
            else:
                processed_metadata[key] = str(value)
        
        return jsonify({
            'symbol': symbol,
            'metadata': processed_metadata
        })
            
    except Exception as e:
        logger.error(f"Erro ao obter metadados para {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@arctic_bp.route('/needs-update', methods=['GET'])
def check_symbols_need_update():
    """Verifica quais símbolos precisam ser atualizados"""
    try:
        # Obter parâmetros
        max_age_days = int(request.args.get('max_age_days', 1))
        symbols = request.args.get('symbols')
        
        if symbols:
            # Lista específica de símbolos
            symbol_list = [s.strip() for s in symbols.split(',')]
        else:
            # Todos os símbolos
            symbol_list = arctic_service.list_symbols()
        
        # Verificar cada símbolo
        results = {}
        for symbol in symbol_list:
            results[symbol] = arctic_service.check_needs_update(symbol, max_age_days)
        
        # Filtrar apenas os que precisam de atualização
        needs_update = [sym for sym, needs in results.items() if needs]
        
        return jsonify({
            'symbols_needing_update': needs_update,
            'total_symbols': len(symbol_list),
            'symbols_to_update': len(needs_update)
        })
            
    except Exception as e:
        logger.error(f"Erro ao verificar símbolos para atualização: {str(e)}")
        return jsonify({'error': str(e)}), 500 