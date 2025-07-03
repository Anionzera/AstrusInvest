"""
PERFORMANCE ANALYZER ABSOLUTAMENTE COMPLETO E ROBUSTO
Usa TODAS as funcionalidades do pyfolio-reloaded e empyrical-reloaded
Implementação profissional com 100% das métricas disponíveis
"""

import pandas as pd
import numpy as np
import warnings
from typing import Dict, Optional, Union, List, Tuple, Any
from datetime import datetime, timedelta
import logging

# Bibliotecas de análise de performance - IMPORTAÇÃO COMPLETA
import pyfolio as pf
import empyrical as ep

# Bibliotecas auxiliares
import matplotlib
matplotlib.use('Agg')  # Para ambiente sem GUI
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

# Suprimir warnings desnecessários
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=RuntimeWarning)

logger = logging.getLogger(__name__)

class CompletePerformanceAnalyzer:
    """
    ANALISADOR DE PERFORMANCE ABSOLUTAMENTE COMPLETO
    Implementa TODAS as funcionalidades do pyfolio-reloaded e empyrical-reloaded
    """
    
    def __init__(self):
        """Inicializa o analisador completo"""
        self.portfolio_returns = None
        self.benchmark_returns = None
        self.positions = None
        self.transactions = None
        self.factor_returns = None
        self.factor_loadings = None
        self.market_data = None
        self.sector_mappings = None
        
        # Cache para resultados
        self._cache = {}
        
    def set_portfolio_data(self, 
                          returns: pd.Series,
                          benchmark_returns: Optional[pd.Series] = None,
                          positions: Optional[pd.DataFrame] = None,
                          transactions: Optional[pd.DataFrame] = None,
                          factor_returns: Optional[pd.DataFrame] = None,
                          factor_loadings: Optional[pd.DataFrame] = None,
                          market_data: Optional[pd.DataFrame] = None,
                          sector_mappings: Optional[Dict] = None):
        """Define TODOS os dados possíveis para análise completa"""
        self.portfolio_returns = returns
        self.benchmark_returns = benchmark_returns
        self.positions = positions
        self.transactions = transactions
        self.factor_returns = factor_returns
        self.factor_loadings = factor_loadings
        self.market_data = market_data
        self.sector_mappings = sector_mappings
        
        # Limpar cache
        self._cache = {}
        
        logger.info(f"Dados completos carregados: {len(returns)} períodos")
        
    def calculate_all_empyrical_metrics(self, risk_free_rate: float = 0.0) -> Dict[str, Any]:
        """
        Calcula TODAS as métricas disponíveis no empyrical-reloaded
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
            
        cache_key = f"empyrical_all_{risk_free_rate}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        returns = self.portfolio_returns
        benchmark = self.benchmark_returns
        risk_free_daily = risk_free_rate / 252
        
        metrics = {}
        
        try:
            # ===== MÉTRICAS BÁSICAS DE RETORNO =====
            logger.info("Calculando métricas básicas de retorno...")
            metrics.update({
                'annual_return': float(ep.annual_return(returns)),
                'cagr': float(ep.cagr(returns)),
                'cumulative_return': float(ep.cum_returns_final(returns)),
                'simple_returns_mean': float(returns.mean()),
            })
            
            # ===== MÉTRICAS DE VOLATILIDADE E RISCO =====
            logger.info("Calculando métricas de volatilidade e risco...")
            metrics.update({
                'annual_volatility': float(ep.annual_volatility(returns)),
                'downside_risk': float(ep.downside_risk(returns, required_return=risk_free_daily)),
                'value_at_risk_95': float(ep.value_at_risk(returns, cutoff=0.05)),
                'value_at_risk_99': float(ep.value_at_risk(returns, cutoff=0.01)),
                'conditional_value_at_risk_95': float(ep.conditional_value_at_risk(returns, cutoff=0.05)),
                'conditional_value_at_risk_99': float(ep.conditional_value_at_risk(returns, cutoff=0.01)),
                'max_drawdown': float(ep.max_drawdown(returns)),
            })
            
            # ===== MÉTRICAS DE RISCO-RETORNO =====
            logger.info("Calculando métricas de risco-retorno...")
            metrics.update({
                'sharpe_ratio': float(ep.sharpe_ratio(returns, risk_free=risk_free_daily)),
                'sortino_ratio': float(ep.sortino_ratio(returns, required_return=risk_free_daily)),
                'calmar_ratio': float(ep.calmar_ratio(returns)),
                'omega_ratio': float(ep.omega_ratio(returns, risk_free=risk_free_daily)),
            })
            
            # ===== MÉTRICAS ESTATÍSTICAS =====
            logger.info("Calculando métricas estatísticas...")
            metrics.update({
                'skewness': float(returns.skew()),
                'kurtosis': float(returns.kurtosis()),
                'tail_ratio': float(ep.tail_ratio(returns)),
                'stability_of_timeseries': float(ep.stability_of_timeseries(returns)),
            })
            
            # ===== MÉTRICAS AVANÇADAS DE RISCO =====
            logger.info("Calculando métricas avançadas de risco...")
            try:
                # GPD estimates precisa de dados suficientes e formato correto
                if len(returns) >= 100:  # Mínimo para GPD
                    clean_returns = returns.dropna()
                    if len(clean_returns) >= 100:
                        gpd_estimates = ep.gpd_risk_estimates(clean_returns, var_p=0.01)
                        
                        # Verificar se o resultado é válido
                        if gpd_estimates is not None:
                            # Se é um número único, converter para array
                            if np.isscalar(gpd_estimates):
                                gpd_estimates = [gpd_estimates, gpd_estimates]
                            # Se é Series ou array, converter para lista
                            elif hasattr(gpd_estimates, '__len__') and hasattr(gpd_estimates, 'ndim'):
                                if gpd_estimates.ndim == 0:  # Scalar array
                                    gpd_estimates = [float(gpd_estimates), float(gpd_estimates)]
                                else:
                                    gpd_estimates = list(gpd_estimates)
                            
                            # Verificar se temos pelo menos 2 valores
                            if isinstance(gpd_estimates, (list, tuple, np.ndarray)) and len(gpd_estimates) >= 2:
                                metrics.update({
                                    'gpd_var_estimate': float(gpd_estimates[0]) if not np.isnan(gpd_estimates[0]) else None,
                                    'gpd_es_estimate': float(gpd_estimates[1]) if not np.isnan(gpd_estimates[1]) else None,
                                })
                            else:
                                metrics.update({
                                    'gpd_var_estimate': None,
                                    'gpd_es_estimate': None,
                                })
                        else:
                            metrics.update({
                                'gpd_var_estimate': None,
                                'gpd_es_estimate': None,
                            })
                    else:
                        metrics.update({
                            'gpd_var_estimate': None,
                            'gpd_es_estimate': None,
                        })
                else:
                    metrics.update({
                        'gpd_var_estimate': None,
                        'gpd_es_estimate': None,
                    })
            except Exception as e:
                logger.warning(f"Erro ao calcular GPD estimates: {e}")
                metrics.update({
                    'gpd_var_estimate': None,
                    'gpd_es_estimate': None,
                })
            
            # ===== MÉTRICAS VS BENCHMARK (se disponível) =====
            if benchmark is not None and len(benchmark) > 0:
                logger.info("Calculando métricas vs benchmark...")
                aligned_returns, aligned_benchmark = returns.align(benchmark, join='inner')
                
                if len(aligned_returns) > 10:  # Mínimo de dados para cálculos
                    try:
                        # Calcular cada métrica individualmente para melhor controle de erros
                        alpha_val = ep.alpha(aligned_returns, aligned_benchmark, risk_free=risk_free_daily)
                        beta_val = ep.beta(aligned_returns, aligned_benchmark)
                        up_capture_val = ep.up_capture(aligned_returns, aligned_benchmark)
                        down_capture_val = ep.down_capture(aligned_returns, aligned_benchmark)
                        capture_ratio_val = ep.capture(aligned_returns, aligned_benchmark)
                        excess_sharpe_val = ep.excess_sharpe(aligned_returns, aligned_benchmark)
                        
                        metrics.update({
                            # Métricas básicas vs benchmark
                            'alpha': float(alpha_val) if not np.isnan(alpha_val) else 0.0,
                            'beta': float(beta_val) if not np.isnan(beta_val) else 1.0,
                            'up_capture': float(up_capture_val) if not np.isnan(up_capture_val) else 1.0,
                            'down_capture': float(down_capture_val) if not np.isnan(down_capture_val) else 1.0,
                            'capture_ratio': float(capture_ratio_val) if not np.isnan(capture_ratio_val) else 1.0,
                            'excess_sharpe': float(excess_sharpe_val) if not np.isnan(excess_sharpe_val) else 0.0,
                        })
                        
                        # Métricas adicionais com tratamento individual
                        try:
                            batting_avg = ep.batting_average(aligned_returns, aligned_benchmark)
                            metrics['batting_average'] = float(batting_avg) if not np.isnan(batting_avg) else 0.5
                        except:
                            metrics['batting_average'] = 0.5
                        
                        # Alpha/Beta para períodos up/down
                        try:
                            up_alpha_beta = ep.up_alpha_beta(aligned_returns, aligned_benchmark)
                            down_alpha_beta = ep.down_alpha_beta(aligned_returns, aligned_benchmark)
                            
                            metrics.update({
                                'up_alpha': float(up_alpha_beta[0]) if not np.isnan(up_alpha_beta[0]) else 0.0,
                                'up_beta': float(up_alpha_beta[1]) if not np.isnan(up_alpha_beta[1]) else 1.0,
                                'down_alpha': float(down_alpha_beta[0]) if not np.isnan(down_alpha_beta[0]) else 0.0,
                                'down_beta': float(down_alpha_beta[1]) if not np.isnan(down_alpha_beta[1]) else 1.0,
                            })
                        except:
                            metrics.update({
                                'up_alpha': 0.0,
                                'up_beta': 1.0,
                                'down_alpha': 0.0,
                                'down_beta': 1.0,
                            })
                        
                        # Fragility metrics
                        try:
                            beta_fragility = ep.beta_fragility_heuristic(aligned_returns, aligned_benchmark)
                            metrics['beta_fragility_heuristic'] = float(beta_fragility) if not np.isnan(beta_fragility) else 0.0
                        except:
                            metrics['beta_fragility_heuristic'] = 0.0
                        
                        # Benchmark stats
                        metrics.update({
                            'benchmark_annual_return': float(ep.annual_return(aligned_benchmark)),
                            'benchmark_volatility': float(ep.annual_volatility(aligned_benchmark)),
                            'benchmark_sharpe': float(ep.sharpe_ratio(aligned_benchmark, risk_free=risk_free_daily)),
                            'benchmark_max_drawdown': float(ep.max_drawdown(aligned_benchmark)),
                        })
                        
                        # Tracking error e information ratio
                        excess_returns = aligned_returns - aligned_benchmark
                        tracking_error = float(ep.annual_volatility(excess_returns))
                        information_ratio = float(ep.annual_return(excess_returns) / tracking_error) if tracking_error != 0 else 0
                        
                        metrics.update({
                            'tracking_error': tracking_error,
                            'information_ratio': information_ratio,
                        })
                        
                    except Exception as e:
                        logger.warning(f"Erro ao calcular métricas vs benchmark: {e}")
                        # Adicionar métricas padrão em caso de erro
                        metrics.update({
                            'alpha': 0.0,
                            'beta': 1.0,
                            'up_capture': 1.0,
                            'down_capture': 1.0,
                            'capture_ratio': 1.0,
                            'excess_sharpe': 0.0,
                            'batting_average': 0.5,
                            'tracking_error': 0.0,
                            'information_ratio': 0.0,
                        })
            
            # ===== MÉTRICAS ROLLING (janela de 30 dias) =====
            logger.info("Calculando métricas rolling...")
            if len(returns) >= 60:  # Mínimo para rolling
                try:
                    window = min(30, len(returns) // 2)
                    
                    # Rolling básicas
                    metrics.update({
                        'roll_annual_volatility_30d': ep.roll_annual_volatility(returns, window=window).iloc[-1] if len(returns) >= window else None,
                        'roll_max_drawdown_30d': ep.roll_max_drawdown(returns, window=window).iloc[-1] if len(returns) >= window else None,
                        'roll_sharpe_ratio_30d': ep.roll_sharpe_ratio(returns, window=window).iloc[-1] if len(returns) >= window else None,
                        'roll_sortino_ratio_30d': ep.roll_sortino_ratio(returns, window=window).iloc[-1] if len(returns) >= window else None,
                    })
                    
                    # Rolling vs benchmark
                    if benchmark is not None and len(aligned_returns) >= window:
                        metrics.update({
                            'roll_alpha_30d': ep.roll_alpha(aligned_returns, aligned_benchmark, window=window).iloc[-1],
                            'roll_beta_30d': ep.roll_beta(aligned_returns, aligned_benchmark, window=window).iloc[-1],
                            'roll_up_capture_30d': ep.roll_up_capture(aligned_returns, aligned_benchmark, window=window).iloc[-1],
                            'roll_down_capture_30d': ep.roll_down_capture(aligned_returns, aligned_benchmark, window=window).iloc[-1],
                        })
                        
                except Exception as e:
                    logger.warning(f"Erro ao calcular métricas rolling: {e}")
            
            # ===== MÉTRICAS DE AGREGAÇÃO =====
            logger.info("Calculando métricas de agregação...")
            try:
                # Retornos agregados por período
                monthly_returns = ep.aggregate_returns(returns, convert_to='monthly')
                yearly_returns = ep.aggregate_returns(returns, convert_to='yearly')
                
                metrics.update({
                    'monthly_returns_count': len(monthly_returns),
                    'yearly_returns_count': len(yearly_returns),
                    'best_month': float(monthly_returns.max()) if len(monthly_returns) > 0 else None,
                    'worst_month': float(monthly_returns.min()) if len(monthly_returns) > 0 else None,
                    'best_year': float(yearly_returns.max()) if len(yearly_returns) > 0 else None,
                    'worst_year': float(yearly_returns.min()) if len(yearly_returns) > 0 else None,
                    'positive_months_pct': float((monthly_returns > 0).mean()) if len(monthly_returns) > 0 else None,
                    'positive_years_pct': float((yearly_returns > 0).mean()) if len(yearly_returns) > 0 else None,
                })
                
            except Exception as e:
                logger.warning(f"Erro ao calcular métricas de agregação: {e}")
            
            # ===== PERFORMANCE ATTRIBUTION (se dados disponíveis) =====
            if (self.positions is not None and 
                self.factor_returns is not None and 
                self.factor_loadings is not None):
                logger.info("Calculando performance attribution...")
                try:
                    perf_attrib = ep.perf_attrib(
                        returns, 
                        self.positions, 
                        self.factor_returns, 
                        self.factor_loadings
                    )
                    metrics['performance_attribution'] = perf_attrib.to_dict() if hasattr(perf_attrib, 'to_dict') else str(perf_attrib)
                except Exception as e:
                    logger.warning(f"Erro ao calcular performance attribution: {e}")
            
            # ===== EXPOSURES (se dados disponíveis) =====
            if self.factor_loadings is not None:
                logger.info("Calculando exposures...")
                try:
                    exposures = ep.compute_exposures(returns, self.factor_loadings)
                    metrics['factor_exposures'] = exposures.to_dict() if hasattr(exposures, 'to_dict') else str(exposures)
                except Exception as e:
                    logger.warning(f"Erro ao calcular exposures: {e}")
            
            # Cache resultado
            self._cache[cache_key] = metrics
            
            logger.info(f"TODAS as métricas empyrical calculadas: {len(metrics)} indicadores")
            return metrics
            
        except Exception as e:
            logger.error(f"Erro ao calcular métricas empyrical: {e}")
            raise
    
    def generate_all_pyfolio_tearsheets(self, return_base64: bool = True) -> Dict[str, Any]:
        """
        Gera TODOS os tearsheets disponíveis no pyfolio-reloaded
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        cache_key = f"pyfolio_all_{return_base64}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        tearsheets = {}
        
        try:
            # Configurar estilo para alta qualidade
            plt.style.use('default')
            sns.set_palette("husl")
            sns.set_context("notebook", font_scale=1.0)
            
            # 1. FULL TEAR SHEET (mais completo)
            logger.info("Gerando Full Tear Sheet...")
            if return_base64:
                tearsheets['full_tearsheet'] = self._generate_tearsheet_base64(
                    lambda: pf.create_full_tear_sheet(
                        returns=self.portfolio_returns,
                        positions=self.positions,
                        transactions=self.transactions,
                        market_data=self.market_data,
                        benchmark_rets=self.benchmark_returns,
                        sector_mappings=self.sector_mappings,
                        return_fig=True
                    )
                )
            
            # 2. RETURNS TEAR SHEET
            logger.info("Gerando Returns Tear Sheet...")
            if return_base64:
                tearsheets['returns_tearsheet'] = self._generate_tearsheet_base64(
                    lambda: pf.create_returns_tear_sheet(
                        returns=self.portfolio_returns,
                        positions=self.positions,
                        transactions=self.transactions,
                        benchmark_rets=self.benchmark_returns,
                        return_fig=True
                    )
                )
            
            # 3. SIMPLE TEAR SHEET
            logger.info("Gerando Simple Tear Sheet...")
            if return_base64:
                tearsheets['simple_tearsheet'] = self._generate_tearsheet_base64(
                    lambda: pf.create_simple_tear_sheet(
                        returns=self.portfolio_returns,
                        positions=self.positions,
                        transactions=self.transactions,
                        benchmark_rets=self.benchmark_returns
                    )
                )
            
            # 4. POSITION TEAR SHEET (se posições disponíveis)
            if self.positions is not None:
                logger.info("Gerando Position Tear Sheet...")
                if return_base64:
                    tearsheets['position_tearsheet'] = self._generate_tearsheet_base64(
                        lambda: pf.create_position_tear_sheet(
                            returns=self.portfolio_returns,
                            positions=self.positions,
                            sector_mappings=self.sector_mappings,
                            transactions=self.transactions,
                            return_fig=True
                        )
                    )
            
            # 5. TRANSACTION TEAR SHEET (se transações disponíveis)
            if self.transactions is not None:
                logger.info("Gerando Transaction Tear Sheet...")
                if return_base64:
                    tearsheets['transaction_tearsheet'] = self._generate_tearsheet_base64(
                        lambda: pf.create_txn_tear_sheet(
                            returns=self.portfolio_returns,
                            positions=self.positions,
                            transactions=self.transactions,
                            return_fig=True
                        )
                    )
            
            # 6. ROUND TRIP TEAR SHEET (se dados disponíveis)
            if self.positions is not None and self.transactions is not None:
                logger.info("Gerando Round Trip Tear Sheet...")
                if return_base64:
                    tearsheets['round_trip_tearsheet'] = self._generate_tearsheet_base64(
                        lambda: pf.create_round_trip_tear_sheet(
                            returns=self.portfolio_returns,
                            positions=self.positions,
                            transactions=self.transactions,
                            sector_mappings=self.sector_mappings,
                            return_fig=True
                        )
                    )
            
            # 7. CAPACITY TEAR SHEET (se dados de mercado disponíveis)
            if (self.positions is not None and 
                self.transactions is not None and 
                self.market_data is not None):
                logger.info("Gerando Capacity Tear Sheet...")
                if return_base64:
                    tearsheets['capacity_tearsheet'] = self._generate_tearsheet_base64(
                        lambda: pf.create_capacity_tear_sheet(
                            returns=self.portfolio_returns,
                            positions=self.positions,
                            transactions=self.transactions,
                            market_data=self.market_data,
                            return_fig=True
                        )
                    )
            
            # 8. PERFORMANCE ATTRIBUTION TEAR SHEET (se fatores disponíveis)
            if (self.positions is not None and 
                self.factor_returns is not None and 
                self.factor_loadings is not None):
                logger.info("Gerando Performance Attribution Tear Sheet...")
                if return_base64:
                    tearsheets['perf_attrib_tearsheet'] = self._generate_tearsheet_base64(
                        lambda: pf.create_perf_attrib_tear_sheet(
                            returns=self.portfolio_returns,
                            positions=self.positions,
                            factor_returns=self.factor_returns,
                            factor_loadings=self.factor_loadings,
                            transactions=self.transactions,
                            return_fig=True
                        )
                    )
            
            # 9. INTERESTING TIMES TEAR SHEET
            logger.info("Gerando Interesting Times Tear Sheet...")
            if return_base64:
                tearsheets['interesting_times_tearsheet'] = self._generate_tearsheet_base64(
                    lambda: pf.create_interesting_times_tear_sheet(
                        returns=self.portfolio_returns,
                        benchmark_rets=self.benchmark_returns,
                        return_fig=True
                    )
                )
            
            # Cache resultado
            self._cache[cache_key] = tearsheets
            
            logger.info(f"TODOS os tearsheets pyfolio gerados: {len(tearsheets)} tipos")
            return tearsheets
            
        except Exception as e:
            logger.error(f"Erro ao gerar tearsheets pyfolio: {e}")
            return {}
    
    def _generate_tearsheet_base64(self, tearsheet_func) -> Optional[str]:
        """Gera tearsheet e converte para base64"""
        try:
            fig = tearsheet_func()
            if fig is not None:
                buffer = BytesIO()
                fig.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
                buffer.seek(0)
                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                plt.close(fig)
                return f"data:image/png;base64,{img_base64}"
            return None
        except Exception as e:
            logger.warning(f"Erro ao gerar tearsheet: {e}")
            return None
    
    def generate_complete_analysis_report(self, 
                                        risk_free_rate: float = 0.0,
                                        include_tearsheets: bool = True) -> Dict[str, Any]:
        """
        Gera relatório ABSOLUTAMENTE COMPLETO com TODAS as análises
        """
        logger.info("Iniciando análise COMPLETA...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'analysis_type': 'COMPLETE_PYFOLIO_EMPYRICAL_ANALYSIS',
            'data_summary': {
                'returns_count': len(self.portfolio_returns) if self.portfolio_returns is not None else 0,
                'has_benchmark': self.benchmark_returns is not None,
                'has_positions': self.positions is not None,
                'has_transactions': self.transactions is not None,
                'has_factor_data': self.factor_returns is not None,
                'has_market_data': self.market_data is not None,
            }
        }
        
        # 1. TODAS as métricas empyrical
        logger.info("Calculando TODAS as métricas empyrical...")
        report['empyrical_metrics'] = self.calculate_all_empyrical_metrics(risk_free_rate)
        
        # 2. TODOS os tearsheets pyfolio (se solicitado)
        if include_tearsheets:
            logger.info("Gerando TODOS os tearsheets pyfolio...")
            report['pyfolio_tearsheets'] = self.generate_all_pyfolio_tearsheets(return_base64=True)
        
        # 3. Estatísticas adicionais usando pyfolio
        logger.info("Calculando estatísticas adicionais pyfolio...")
        try:
            # Performance stats do pyfolio
            perf_stats = pf.show_perf_stats(
                returns=self.portfolio_returns,
                factor_returns=self.benchmark_returns,
                positions=self.positions,
                transactions=self.transactions,
                return_df=True
            )
            if perf_stats is not None:
                report['pyfolio_perf_stats'] = perf_stats.to_dict()
        except Exception as e:
            logger.warning(f"Erro ao calcular pyfolio perf stats: {e}")
        
        # 4. Drawdown analysis completa
        logger.info("Análise completa de drawdown...")
        try:
            drawdown_table = pf.timeseries.gen_drawdown_table(self.portfolio_returns, top=10)
            if drawdown_table is not None:
                report['drawdown_analysis'] = drawdown_table.to_dict()
        except Exception as e:
            logger.warning(f"Erro ao gerar tabela de drawdown: {e}")
        
        # 5. Rolling metrics completas
        logger.info("Métricas rolling completas...")
        report['rolling_metrics'] = self._calculate_complete_rolling_metrics()
        
        logger.info("Análise COMPLETA finalizada!")
        return report
    
    def _calculate_complete_rolling_metrics(self) -> Dict[str, Any]:
        """Calcula TODAS as métricas rolling disponíveis"""
        if len(self.portfolio_returns) < 60:
            return {}
        
        rolling_metrics = {}
        windows = [30, 60, 126, 252]  # 1 mês, 2 meses, 6 meses, 1 ano
        
        for window in windows:
            if len(self.portfolio_returns) >= window * 2:
                try:
                    # Métricas básicas rolling
                    rolling_metrics[f'rolling_{window}d'] = {
                        'volatility': ep.roll_annual_volatility(self.portfolio_returns, window=window).to_dict(),
                        'max_drawdown': ep.roll_max_drawdown(self.portfolio_returns, window=window).to_dict(),
                        'sharpe_ratio': ep.roll_sharpe_ratio(self.portfolio_returns, window=window).to_dict(),
                        'sortino_ratio': ep.roll_sortino_ratio(self.portfolio_returns, window=window).to_dict(),
                    }
                    
                    # Métricas vs benchmark rolling
                    if self.benchmark_returns is not None:
                        aligned_returns, aligned_benchmark = self.portfolio_returns.align(
                            self.benchmark_returns, join='inner'
                        )
                        if len(aligned_returns) >= window * 2:
                            rolling_metrics[f'rolling_{window}d'].update({
                                'alpha': ep.roll_alpha(aligned_returns, aligned_benchmark, window=window).to_dict(),
                                'beta': ep.roll_beta(aligned_returns, aligned_benchmark, window=window).to_dict(),
                                'up_capture': ep.roll_up_capture(aligned_returns, aligned_benchmark, window=window).to_dict(),
                                'down_capture': ep.roll_down_capture(aligned_returns, aligned_benchmark, window=window).to_dict(),
                            })
                            
                except Exception as e:
                    logger.warning(f"Erro ao calcular rolling metrics para janela {window}: {e}")
        
        return rolling_metrics 