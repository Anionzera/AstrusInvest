import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import pymongo
import arcticdb as adb

# Configuração de logging
logger = logging.getLogger('arctic-service')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class ArcticDBService:
    """Serviço para gerenciar dados financeiros temporais usando ArcticDB"""
    
    def __init__(self, connection_string='lmdb://astrus_db', arctic_lib='astrus_market_data'):
        """
        Inicializa o serviço ArcticDB
        
        Args:
            connection_string: String de conexão para o ArcticDB (lmdb://, s3://, etc)
            arctic_lib: Nome da library ArcticDB principal
        """
        try:
            # Conectar ao ArcticDB
            self.store = adb.Arctic(connection_string)
            
            # Criar libraries se não existirem
            self._initialize_libraries(arctic_lib)
            
            # Obter referências às libraries
            self.market_data = self.store.get_library(f'{arctic_lib}_market_data')
            self.technical_indicators = self.store.get_library(f'{arctic_lib}_technical')
            self.fundamentals = self.store.get_library(f'{arctic_lib}_fundamentals')
            self.economic_data = self.store.get_library(f'{arctic_lib}_economic')
            self.portfolios = self.store.get_library(f'{arctic_lib}_portfolios')
            
            logger.info(f"ArcticDB inicializado com sucesso - Base: {arctic_lib}")
        except Exception as e:
            logger.error(f"Erro ao inicializar ArcticDB: {str(e)}")
            raise
    
    def _initialize_libraries(self, base_name):
        """
        Inicializa as libraries necessárias
        
        Args:
            base_name: Nome base para as libraries
        """
        libraries = [
            f'{base_name}_market_data',
            f'{base_name}_technical',
            f'{base_name}_fundamentals',
            f'{base_name}_economic',
            f'{base_name}_portfolios',
        ]
        
        existing_libs = self.store.list_libraries()
        
        for lib_name in libraries:
            if lib_name not in existing_libs:
                self.store.create_library(lib_name)
                logger.info(f"Library {lib_name} criada")
            else:
                logger.info(f"Library {lib_name} já existe")
    
    def write_market_data(self, symbol, data, metadata=None, tags=None):
        """
        Salva dados de mercado para um símbolo específico
        
        Args:
            symbol: Símbolo do ativo (ticker)
            data: DataFrame pandas com dados do ativo
            metadata: Dicionário com metadados (opcional)
            tags: Lista de tags para categorizar os dados
        
        Returns:
            bool: True se salvou com sucesso
        """
        try:
            # Tratar MultiIndex nas colunas (comum em dados do yfinance)
            if isinstance(data.columns, pd.MultiIndex):
                logger.info(f"Convertendo MultiIndex para colunas simples para {symbol}")
                # Criar novas colunas combinando os níveis do MultiIndex
                new_columns = []
                for col in data.columns:
                    if isinstance(col, tuple):
                        # Juntar apenas valores não vazios
                        col_parts = [str(part) for part in col if part]
                        new_col = '_'.join(col_parts)
                        new_columns.append(new_col)
                    else:
                        new_columns.append(str(col))
                
                # Criar uma cópia do DataFrame com as novas colunas
                data = data.copy()
                data.columns = new_columns
            
            # Garantir que o índice é datetime
            if not isinstance(data.index, pd.DatetimeIndex):
                if 'date' in data.columns:
                    data = data.set_index('date')
                    data.index = pd.to_datetime(data.index)
                elif 'Date' in data.columns:
                    data = data.set_index('Date')
                    data.index = pd.to_datetime(data.index)
                else:
                    logger.error(f"DataFrame para {symbol} não possui coluna de data ou DatetimeIndex")
                    return False
            
            # Garantir que o índice está ordenado
            data = data.sort_index()
            
            # Adicionar metadados padrão se não fornecidos
            if metadata is None:
                metadata = {}
            
            metadata.update({
                'symbol': symbol,
                'last_updated': datetime.now(),
                'rows': len(data),
                'start_date': data.index[0].strftime('%Y-%m-%d'),
                'end_date': data.index[-1].strftime('%Y-%m-%d'),
                'columns': list(data.columns),
                'source': metadata.get('source', 'unknown')
            })
            
            # Adicionar tags se fornecidas
            if tags:
                metadata['tags'] = tags
            
            # Salvar no ArcticDB com versionamento
            version_item = self.market_data.write(symbol, data, metadata=metadata)
            logger.info(f"Dados para {symbol} salvos com sucesso: {len(data)} registros (versão {version_item.version})")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao salvar dados para {symbol}: {str(e)}")
            return False
    
    def read_market_data(self, symbol, start_date=None, end_date=None, as_of_date=None):
        """
        Lê dados de mercado para um símbolo específico
        
        Args:
            symbol: Símbolo do ativo (ticker)
            start_date: Data inicial (opcional)
            end_date: Data final (opcional)
            as_of_date: Data para versão histórica dos dados (opcional)
        
        Returns:
            tuple: (DataFrame com dados, dicionário de metadados)
        """
        try:
            # Configurar datas se fornecidas
            date_range = None
            if start_date or end_date:
                start = pd.Timestamp(start_date) if start_date else None
                end = pd.Timestamp(end_date) if end_date else None
                date_range = (start, end)
            
            # Ler do ArcticDB, com versão específica se solicitado
            if as_of_date:
                # Buscar como era em uma data específica
                as_of = pd.Timestamp(as_of_date)
                item = self.market_data.read(symbol, as_of=as_of, date_range=date_range)
            else:
                # Buscar versão mais recente
                item = self.market_data.read(symbol, date_range=date_range)
            
            data = item.data
            metadata = item.metadata
            
            logger.info(f"Dados para {symbol} lidos com sucesso: {len(data)} registros")
            return data, metadata
            
        except Exception as e:
            logger.error(f"Erro ao ler dados para {symbol}: {str(e)}")
            return pd.DataFrame(), {}
    
    def update_market_data(self, symbol, new_data, upsert=True, append_only=False):
        """
        Atualiza dados existentes com novos dados
        
        Args:
            symbol: Símbolo do ativo
            new_data: DataFrame com novos dados
            upsert: Se True, cria o registro se não existir
            append_only: Se True, apenas adiciona novos dados sem sobrescrever existentes
        
        Returns:
            bool: True se atualizou com sucesso
        """
        try:
            # Verificar se já existem dados
            try:
                existing_data, metadata = self.read_market_data(symbol)
                has_data = not existing_data.empty
            except:
                has_data = False
                metadata = {}
            
            # Se não há dados e upsert é False, retornar
            if not has_data and not upsert:
                logger.warning(f"Dados para {symbol} não existem e upsert=False")
                return False
            
            # Se não há dados mas upsert é True, criar novo
            if not has_data:
                return self.write_market_data(symbol, new_data, metadata)
            
            # Tratar MultiIndex nas colunas (comum em dados do yfinance)
            if isinstance(new_data.columns, pd.MultiIndex):
                logger.info(f"Convertendo MultiIndex para colunas simples para {symbol}")
                # Criar novas colunas combinando os níveis do MultiIndex
                new_columns = []
                for col in new_data.columns:
                    if isinstance(col, tuple):
                        # Juntar apenas valores não vazios
                        col_parts = [str(part) for part in col if part]
                        new_col = '_'.join(col_parts)
                        new_columns.append(new_col)
                    else:
                        new_columns.append(str(col))
                
                # Criar uma cópia do DataFrame com as novas colunas
                new_data = new_data.copy()
                new_data.columns = new_columns
            
            # Garantir que os novos dados têm o formato correto
            if not isinstance(new_data.index, pd.DatetimeIndex):
                if 'date' in new_data.columns:
                    new_data = new_data.set_index('date')
                elif 'Date' in new_data.columns:
                    new_data = new_data.set_index('Date')
                else:
                    logger.error(f"DataFrame para {symbol} não possui coluna de data adequada")
                    return False
                
                new_data.index = pd.to_datetime(new_data.index)
            
            if append_only:
                # No ArcticDB podemos usar o método append diretamente
                try:
                    self.market_data.append(symbol, new_data)
                    logger.info(f"Dados para {symbol} atualizados com sucesso (append)")
                    return True
                except Exception as e:
                    logger.error(f"Erro ao fazer append para {symbol}: {str(e)}")
                    # Fallback para o método tradicional
            
            # Caso não seja append_only ou o append falhe
            # Atualizar usando o update do ArcticDB
            try:
                self.market_data.update(symbol, new_data)
                logger.info(f"Dados para {symbol} atualizados com sucesso (update)")
                return True
            except Exception as e:
                logger.error(f"Erro ao fazer update para {symbol}: {str(e)}")
                
                # Combinar dados manualmente e fazer write
                combined_data = pd.concat([existing_data, new_data])
                combined_data = combined_data[~combined_data.index.duplicated(keep='last')]
                combined_data = combined_data.sort_index()
                
                # Atualizar metadados
                metadata.update({
                    'last_updated': datetime.now(),
                    'rows': len(combined_data),
                    'start_date': combined_data.index[0].strftime('%Y-%m-%d'),
                    'end_date': combined_data.index[-1].strftime('%Y-%m-%d'),
                    'columns': list(combined_data.columns)
                })
                
                # Salvar dados atualizados
                version_item = self.market_data.write(symbol, combined_data, metadata=metadata)
                logger.info(f"Dados para {symbol} atualizados com sucesso: {len(combined_data)} registros (versão {version_item.version})")
                return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar dados para {symbol}: {str(e)}")
            return False
    
    def list_symbols(self, library_name='market_data', filter_tags=None):
        """
        Lista todos os símbolos disponíveis em uma library
        
        Args:
            library_name: Nome da library (market_data, technical, fundamentals, etc)
            filter_tags: Lista de tags para filtrar os símbolos (opcional)
        
        Returns:
            list: Lista de símbolos
        """
        try:
            # No ArcticDB, precisamos converter o nome da library para a estrutura correta
            lib_name = f"astrus_market_data_{library_name}"
            lib = self.store.get_library(lib_name)
            
            # Obter todos os símbolos
            symbols = lib.list_symbols()
            
            # Filtragem por tags não é suportada nativamente, precisamos implementar manualmente
            if filter_tags and len(filter_tags) > 0:
                filtered_symbols = []
                for symbol in symbols:
                    try:
                        metadata = lib.read(symbol).metadata
                        if metadata and 'tags' in metadata:
                            symbol_tags = metadata['tags']
                            if any(tag in symbol_tags for tag in filter_tags):
                                filtered_symbols.append(symbol)
                    except Exception as e:
                        logger.warning(f"Erro ao obter metadados para {symbol}: {str(e)}")
                symbols = filtered_symbols
                
            logger.info(f"Símbolos encontrados em {lib_name}: {len(symbols)}")
            return symbols
            
        except Exception as e:
            logger.error(f"Erro ao listar símbolos de {library_name}: {str(e)}")
            return []
    
    def get_metadata(self, symbol, library='market_data'):
        """
        Obtém metadados para um símbolo específico
        
        Args:
            symbol: Símbolo para buscar metadados
            library: Nome da library (market_data, technical, fundamentals, etc)
        
        Returns:
            dict: Dicionário de metadados
        """
        try:
            lib_name = f"astrus_market_data_{library}"
            lib = self.store.get_library(lib_name)
            item = lib.read(symbol)
            return item.metadata
        except Exception as e:
            logger.error(f"Erro ao obter metadados para {symbol}: {str(e)}")
            return {}
    
    def get_version_history(self, symbol, library='market_data'):
        """
        Obtém histórico de versões para um símbolo
        
        Args:
            symbol: Símbolo para buscar versões
            library: Nome da library (market_data, technical, etc)
        
        Returns:
            list: Lista de versões
        """
        try:
            lib_name = f"astrus_market_data_{library}"
            lib = self.store.get_library(lib_name)
            history = lib.version_history(symbol)
            return history
        except Exception as e:
            logger.error(f"Erro ao obter histórico de versões para {symbol}: {str(e)}")
            return []
    
    def delete_symbol(self, symbol, library='market_data'):
        """
        Remove um símbolo de uma library
        
        Args:
            symbol: Símbolo para remover
            library: Nome da library (market_data, technical, etc)
        
        Returns:
            bool: True se removido com sucesso
        """
        try:
            lib_name = f"astrus_market_data_{library}"
            lib = self.store.get_library(lib_name)
            lib.delete(symbol)
            logger.info(f"Símbolo {symbol} removido com sucesso de {lib_name}")
            return True
        except Exception as e:
            logger.error(f"Erro ao remover símbolo {symbol}: {str(e)}")
            return False
    
    def store_technical_indicators(self, symbol, indicators_data, metadata=None):
        """
        Armazena indicadores técnicos para um símbolo
        
        Args:
            symbol: Símbolo do ativo
            indicators_data: DataFrame com indicadores
            metadata: Metadados adicionais (opcional)
        
        Returns:
            bool: True se salvo com sucesso
        """
        try:
            if metadata is None:
                metadata = {}
                
            metadata['indicator_type'] = metadata.get('indicator_type', 'generic')
            metadata['created_at'] = datetime.now()
            
            version_item = self.technical_indicators.write(symbol, indicators_data, metadata=metadata)
            logger.info(f"Indicadores para {symbol} salvos com sucesso (versão {version_item.version})")
            return True
        except Exception as e:
            logger.error(f"Erro ao salvar indicadores para {symbol}: {str(e)}")
            return False
    
    def store_portfolio(self, portfolio_id, portfolio_data, metadata=None):
        """
        Armazena dados de um portfólio
        
        Args:
            portfolio_id: Identificador do portfólio
            portfolio_data: DataFrame com dados do portfólio
            metadata: Metadados adicionais (opcional)
        
        Returns:
            bool: True se salvo com sucesso
        """
        try:
            if metadata is None:
                metadata = {}
                
            metadata['portfolio_name'] = metadata.get('portfolio_name', 'Unnamed Portfolio')
            metadata['created_at'] = datetime.now()
            metadata['description'] = metadata.get('description', '')
            
            version_item = self.portfolios.write(portfolio_id, portfolio_data, metadata=metadata)
            logger.info(f"Portfólio {portfolio_id} salvo com sucesso (versão {version_item.version})")
            return True
        except Exception as e:
            logger.error(f"Erro ao salvar portfólio {portfolio_id}: {str(e)}")
            return False
    
    def check_needs_update(self, symbol, max_age_days=1):
        """
        Verifica se um símbolo precisa ser atualizado no ArcticDB com base na data da última atualização
        
        Args:
            symbol: Símbolo a verificar
            max_age_days: Idade máxima dos dados em dias
            
        Returns:
            bool: True se precisar atualizar, False caso contrário
        """
        try:
            # Determinar a biblioteca correta com base no símbolo
            library = self.market_data
            
            # Verificar se o símbolo existe
            if symbol not in library.list_symbols():
                logger.info(f"Símbolo {symbol} não existe no ArcticDB, atualizando")
                return True
            
            # Obter metadados
            try:
                metadata = library.read_metadata(symbol)
                
                # Verificar se tem timestamp de atualização
                if 'last_updated' not in metadata:
                    logger.info(f"Símbolo {symbol} não tem timestamp de atualização, atualizando")
                    return True
                
                # Verificar idade dos dados
                last_updated = metadata['last_updated']
                if isinstance(last_updated, str):
                    last_updated = datetime.strptime(last_updated, '%Y-%m-%d %H:%M:%S.%f')
                
                age = datetime.now() - last_updated
                if age.days > max_age_days:
                    logger.info(f"Dados de {symbol} estão desatualizados (idade: {age.days} dias), atualizando")
                    return True
                    
                # Verificar se tem dados recentes (se a data final é recente)
                if 'end_date' in metadata:
                    end_date = metadata['end_date']
                    if isinstance(end_date, str):
                        end_date = datetime.strptime(end_date, '%Y-%m-%d')
                    
                    end_age = datetime.now().date() - end_date.date() if hasattr(end_date, 'date') else datetime.now().date() - end_date
                    if end_age.days > max_age_days:
                        logger.info(f"Último ponto de dados de {symbol} é de {end_age.days} dias atrás, atualizando")
                        return True
                
                logger.info(f"Dados de {symbol} estão atualizados")
                return False
                
            except Exception as e:
                logger.warning(f"Erro ao verificar metadados de {symbol}: {str(e)}, atualizando")
                return True
        
        except Exception as e:
            logger.error(f"Erro ao verificar se {symbol} precisa atualizar: {str(e)}")
            # Em caso de erro, é mais seguro tentar atualizar
            return True 

# Instância global do serviço
_arctic_service_instance = None

def get_arctic_service():
    """Retorna instância global do serviço ArcticDB"""
    global _arctic_service_instance
    if _arctic_service_instance is None:
        _arctic_service_instance = ArcticDBService()
    return _arctic_service_instance 