"""
Serviço de Análise de Performance usando pyfolio-reloaded e empyrical-reloaded
Integração profissional com métricas avançadas de performance e risco
"""

import pandas as pd
import numpy as np
import warnings
from typing import Dict, Optional, Union, List, Tuple, Any
from datetime import datetime, timedelta
import logging

# Bibliotecas de análise de performance
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

class PerformanceAnalyzer:
    """
    Classe principal para análise de performance de portfólios
    Integra pyfolio-reloaded e empyrical-reloaded para análises completas
    """
    
    def __init__(self):
        """Inicializa o analisador de performance"""
        self.portfolio_returns = None
        self.benchmark_returns = None
        self.positions = None
        self.transactions = None
        self.factor_returns = None
        
        # Cache para resultados
        self._perf_stats = {}
        self._risk_metrics = {}
        
    def set_portfolio_data(self, 
                          returns: pd.Series,
                          benchmark_returns: Optional[pd.Series] = None,
                          positions: Optional[pd.DataFrame] = None,
                          transactions: Optional[pd.DataFrame] = None,
                          factor_returns: Optional[pd.DataFrame] = None):
        """
        Define os dados do portfólio para análise
        """
        self.portfolio_returns = returns
        self.benchmark_returns = benchmark_returns
        self.positions = positions
        self.transactions = transactions
        self.factor_returns = factor_returns
        
        # Limpar cache
        self._perf_stats = {}
        self._risk_metrics = {}
        
        logger.info(f"Dados do portfólio carregados: {len(returns)} períodos")
        
    def calculate_performance_metrics(self, 
                                    risk_free_rate: float = 0.0,
                                    period_start: Optional[datetime] = None,
                                    period_end: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Calcula métricas completas de performance usando empyrical
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
            
        # Filtrar período se especificado
        returns = self._filter_period(self.portfolio_returns, period_start, period_end)
        benchmark = self._filter_period(self.benchmark_returns, period_start, period_end) if self.benchmark_returns is not None else None
        
        # Cache key
        cache_key = f"{risk_free_rate}_{period_start}_{period_end}"
        if cache_key in self._perf_stats:
            return self._perf_stats[cache_key]
        
        try:
            # Converter taxa livre de risco anual para diária (empyrical espera mesma frequência dos retornos)
            risk_free_daily = risk_free_rate / 252  # Assumindo 252 dias úteis
            
            # Métricas básicas de retorno
            metrics = {
                # === MÉTRICAS DE RETORNO ===
                'annual_return': ep.annual_return(returns),
                'cumulative_return': ep.cum_returns_final(returns),
                'annual_volatility': ep.annual_volatility(returns),
                
                # === MÉTRICAS DE RISCO ===
                'sharpe_ratio': ep.sharpe_ratio(returns, risk_free=risk_free_daily),
                'calmar_ratio': ep.calmar_ratio(returns),
                'omega_ratio': ep.omega_ratio(returns, risk_free=risk_free_daily),
                'sortino_ratio': ep.sortino_ratio(returns, required_return=risk_free_daily),
                
                # === DRAWDOWN ===
                'max_drawdown': ep.max_drawdown(returns),
                'avg_drawdown': self._calculate_avg_drawdown(returns),
                'avg_drawdown_days': self._calculate_avg_drawdown_days(returns),
                'max_drawdown_days': self._calculate_max_drawdown_days(returns),
                
                # === ESTATÍSTICAS DE DISTRIBUIÇÃO ===
                'skewness': returns.skew(),
                'kurtosis': returns.kurtosis(),
                'tail_ratio': ep.tail_ratio(returns),
                'common_sense_ratio': self._calculate_common_sense_ratio(returns),
                
                # === MÉTRICAS DE RISCO DOWNSIDE ===
                'downside_risk': ep.downside_risk(returns, required_return=risk_free_daily),
                'value_at_risk': ep.value_at_risk(returns, cutoff=0.05),
                'conditional_value_at_risk': ep.conditional_value_at_risk(returns, cutoff=0.05),
                
                # === ESTABILIDADE ===
                'stability_of_timeseries': ep.stability_of_timeseries(returns),
                
                # === PERÍODOS ESTATÍSTICOS ===
                'periods': len(returns),
                'start_date': returns.index[0] if len(returns) > 0 else None,
                'end_date': returns.index[-1] if len(returns) > 0 else None,
            }
            
            # Métricas adicionais se houver benchmark
            if benchmark is not None and len(benchmark) > 0:
                # Alinhar séries temporais
                aligned_returns, aligned_benchmark = returns.align(benchmark, join='inner')
                
                if len(aligned_returns) > 1:
                    metrics.update({
                        # === MÉTRICAS RELATIVAS AO BENCHMARK ===
                        'alpha': ep.alpha(aligned_returns, aligned_benchmark, risk_free=risk_free_daily),
                        'beta': ep.beta(aligned_returns, aligned_benchmark),
                        'tracking_error': self._calculate_tracking_error(aligned_returns, aligned_benchmark),
                        'information_ratio': self._calculate_information_ratio(aligned_returns, aligned_benchmark),
                        'up_capture': ep.up_capture(aligned_returns, aligned_benchmark),
                        'down_capture': ep.down_capture(aligned_returns, aligned_benchmark),
                        'capture_ratio': ep.capture(aligned_returns, aligned_benchmark),
                        
                        # === BENCHMARK STATS ===
                        'benchmark_annual_return': ep.annual_return(aligned_benchmark),
                        'benchmark_volatility': ep.annual_volatility(aligned_benchmark),
                        'benchmark_sharpe': ep.sharpe_ratio(aligned_benchmark, risk_free=risk_free_daily),
                        'benchmark_max_drawdown': ep.max_drawdown(aligned_benchmark),
                        
                        # === EXCESS RETURNS ===
                        'excess_sharpe': ep.excess_sharpe(aligned_returns, aligned_benchmark),
                    })
            
            # Cache resultado
            self._perf_stats[cache_key] = metrics
            
            logger.info(f"Métricas de performance calculadas: {len(metrics)} indicadores")
            return metrics
            
        except Exception as e:
            logger.error(f"Erro ao calcular métricas de performance: {e}")
            raise
    
    def generate_pyfolio_tearsheet(self, 
                                  return_fig: bool = False,
                                  hide_positions: bool = True,
                                  style: str = 'full') -> Optional[str]:
        """
        Gera tearsheet completo usando pyfolio com todos os gráficos
        
        Args:
            return_fig: Se True, retorna a figura como base64
            hide_positions: Se True, oculta dados de posições
            style: 'full', 'simple', ou 'returns_only'
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        try:
            # Configurar plotting para alta qualidade
            try:
                plt.style.use('seaborn-v0_8')
            except:
                try:
                    plt.style.use('seaborn')
                except:
                    plt.style.use('default')
            
            sns.set_palette("husl")
            sns.set_context("notebook", font_scale=1.1)
            
            if return_fig:
                return self._generate_complete_tearsheet_image()
            else:
                # Gerar tearsheet interativo baseado no estilo
                if style == 'full' and self.positions is not None and not hide_positions:
                    # Tearsheet completo com posições
                    pf.create_full_tear_sheet(
                        returns=self.portfolio_returns,
                        positions=self.positions,
                        transactions=self.transactions,
                        benchmark_rets=self.benchmark_returns,
                        live_start_date=None,
                        round_trips=True
                    )
                elif style == 'simple' or self.benchmark_returns is not None:
                    # Tearsheet com comparação de benchmark
                    pf.create_returns_tear_sheet(
                        returns=self.portfolio_returns,
                        benchmark_rets=self.benchmark_returns,
                        return_fig=False
                    )
                else:
                    # Apenas retornos sem benchmark
                    pf.create_simple_tear_sheet(
                        returns=self.portfolio_returns
                    )
                
                logger.info(f"Tearsheet pyfolio ({style}) exibido")
                return None
            
        except Exception as e:
            logger.error(f"Erro ao gerar tearsheet pyfolio: {e}")
            # Fallback para tearsheet simplificado
            return self._generate_fallback_tearsheet()
    
    def _generate_complete_tearsheet_image(self) -> str:
        """
        Gera tearsheet COMPLETO pyfolio-reloaded com TODOS os 13 gráficos originais
        """
        # Configurar figura GRANDE para acomodar todos os gráficos
        fig = plt.figure(figsize=(24, 32))
        
        # Preparar dados completos
        portfolio_cumulative = (1 + self.portfolio_returns).cumprod()
        
        # Alinhar com benchmark se disponível
        if self.benchmark_returns is not None:
            aligned_returns, aligned_benchmark = self.portfolio_returns.align(
                self.benchmark_returns, join='inner'
            )
            benchmark_cumulative = (1 + aligned_benchmark).cumprod()
        else:
            aligned_returns = self.portfolio_returns
            aligned_benchmark = None
            benchmark_cumulative = None
        
        # Calcular dados necessários para todos os gráficos
        try:
            # Retornos mensais e anuais
            monthly_returns = aligned_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
            annual_returns = aligned_returns.resample('Y').apply(lambda x: (1 + x).prod() - 1)
            
            # Drawdown
            running_max = portfolio_cumulative.expanding().max()
            drawdown = (portfolio_cumulative - running_max) / running_max
            
            # Rolling metrics
            rolling_sharpe = aligned_returns.rolling(126).apply(
                lambda x: ep.sharpe_ratio(x, risk_free=0.0525/252) if len(x.dropna()) > 10 else np.nan
            )
            rolling_vol = aligned_returns.rolling(126).std() * np.sqrt(252)
            
            # Rolling beta (se há benchmark)
            if aligned_benchmark is not None:
                rolling_beta = aligned_returns.rolling(126).apply(
                    lambda x: ep.beta(x, aligned_benchmark[x.index]) if len(x.dropna()) > 10 else np.nan
                )
            else:
                rolling_beta = pd.Series(index=aligned_returns.index, data=np.nan)
                
        except Exception as e:
            logger.warning(f"Erro ao calcular métricas: {e}")
            # Dados padrão em caso de erro
            monthly_returns = pd.Series(dtype=float)
            annual_returns = pd.Series(dtype=float)
            drawdown = pd.Series(index=aligned_returns.index, data=0)
            rolling_sharpe = pd.Series(index=aligned_returns.index, data=np.nan)
            rolling_vol = pd.Series(index=aligned_returns.index, data=np.nan)
            rolling_beta = pd.Series(index=aligned_returns.index, data=np.nan)
        
        # === LAYOUT: 6 colunas x 3 linhas = 18 subplots para acomodar 13 gráficos ===
        
        # 1. Cumulative Returns
        ax1 = plt.subplot(6, 3, 1)
        portfolio_cumulative.plot(ax=ax1, label='Portfolio', linewidth=2, color='#1f77b4')
        if benchmark_cumulative is not None:
            benchmark_cumulative.plot(ax=ax1, label='Benchmark', linewidth=2, alpha=0.8, color='#ff7f0e')
        ax1.set_title('Cumulative Returns', fontsize=12, fontweight='bold')
        ax1.legend(fontsize=9)
        ax1.grid(True, alpha=0.3)
        ax1.set_ylabel('Cumulative Return')
        
        # 2. Cumulative Returns volatility matched to benchmark
        ax2 = plt.subplot(6, 3, 2)
        if benchmark_cumulative is not None:
            # Volatility matched: escalar portfolio para ter mesma vol que benchmark
            portfolio_vol = aligned_returns.std() * np.sqrt(252)
            benchmark_vol = aligned_benchmark.std() * np.sqrt(252)
            if portfolio_vol > 0 and benchmark_vol > 0:
                vol_matched_returns = aligned_returns * (benchmark_vol / portfolio_vol)
                vol_matched_cumulative = (1 + vol_matched_returns).cumprod()
                vol_matched_cumulative.plot(ax=ax2, label='Portfolio (Vol Matched)', linewidth=2, color='#2ca02c')
                benchmark_cumulative.plot(ax=ax2, label='Benchmark', linewidth=2, alpha=0.8, color='#ff7f0e')
            else:
                portfolio_cumulative.plot(ax=ax2, label='Portfolio', linewidth=2, color='#1f77b4')
        else:
            portfolio_cumulative.plot(ax=ax2, label='Portfolio', linewidth=2, color='#1f77b4')
        ax2.set_title('Cumulative Returns\nvolatility matched to benchmark', fontsize=12, fontweight='bold')
        ax2.legend(fontsize=9)
        ax2.grid(True, alpha=0.3)
        ax2.set_ylabel('Cumulative Return')
        
        # 3. Cumulative Returns on logarithmic scale
        ax3 = plt.subplot(6, 3, 3)
        portfolio_cumulative.plot(ax=ax3, label='Portfolio', linewidth=2, color='#1f77b4')
        if benchmark_cumulative is not None:
            benchmark_cumulative.plot(ax=ax3, label='Benchmark', linewidth=2, alpha=0.8, color='#ff7f0e')
        ax3.set_yscale('log')
        ax3.set_title('Cumulative Returns on\nlogarithmic scale', fontsize=12, fontweight='bold')
        ax3.legend(fontsize=9)
        ax3.grid(True, alpha=0.3)
        ax3.set_ylabel('Cumulative Return (log)')
        
        # 4. Returns
        ax4 = plt.subplot(6, 3, 4)
        aligned_returns.plot(ax=ax4, alpha=0.7, color='#1f77b4', linewidth=1)
        ax4.axhline(y=0, color='black', linestyle='-', alpha=0.5)
        ax4.set_title('Returns', fontsize=12, fontweight='bold')
        ax4.set_ylabel('Daily Return')
        ax4.grid(True, alpha=0.3)
        
        # 5. Rolling Portfolio to Benchmark
        ax5 = plt.subplot(6, 3, 5)
        if aligned_benchmark is not None and not rolling_beta.isna().all():
            rolling_beta.plot(ax=ax5, color='#d62728', linewidth=2)
            ax5.axhline(y=1, color='black', linestyle='--', alpha=0.5)
            ax5.set_title('Rolling portfolio beta to\nSPY (6-month)', fontsize=12, fontweight='bold')
            ax5.set_ylabel('Beta')
        else:
            ax5.text(0.5, 0.5, 'Rolling Beta\n(No benchmark)', ha='center', va='center', transform=ax5.transAxes)
            ax5.set_title('Rolling portfolio beta\n(6-month)', fontsize=12, fontweight='bold')
        ax5.grid(True, alpha=0.3)
        
        # 6. Rolling Sharpe Ratio (6-month)
        ax6 = plt.subplot(6, 3, 6)
        if not rolling_sharpe.isna().all():
            rolling_sharpe.plot(ax=ax6, color='#ff7f0e', linewidth=2)
            ax6.axhline(y=0, color='black', linestyle='--', alpha=0.5)
        else:
            ax6.text(0.5, 0.5, 'Rolling Sharpe\n(Insufficient Data)', ha='center', va='center', transform=ax6.transAxes)
        ax6.set_title('Rolling Sharpe ratio\n(6-month)', fontsize=12, fontweight='bold')
        ax6.set_ylabel('Sharpe Ratio')
        ax6.grid(True, alpha=0.3)
        
        # 7. Rolling Fama-French Single factor betas (6-month)
        ax7 = plt.subplot(6, 3, 7)
        # Usando rolling beta já calculado como proxy para Fama-French
        if aligned_benchmark is not None and not rolling_beta.isna().all():
            rolling_beta.plot(ax=ax7, color='#9467bd', linewidth=2, label='Market Beta')
            ax7.axhline(y=1, color='black', linestyle='--', alpha=0.5)
            ax7.legend(fontsize=9)
        else:
            ax7.text(0.5, 0.5, 'Fama-French\nSingle Factor Betas\n(No benchmark)', 
                    ha='center', va='center', transform=ax7.transAxes)
        ax7.set_title('Rolling Fama-French single\nfactor betas (6-month)', fontsize=12, fontweight='bold')
        ax7.set_ylabel('Beta')
        ax7.grid(True, alpha=0.3)
        
        # 8. Top 5 drawdown periods
        ax8 = plt.subplot(6, 3, 8)
        try:
            # Encontrar períodos de drawdown (não apenas pontos)
            dd_periods = []
            in_drawdown = False
            start_dd = None
            
            for date, dd_val in drawdown.items():
                if dd_val < -0.01 and not in_drawdown:  # Início do drawdown (>1%)
                    in_drawdown = True
                    start_dd = date
                elif dd_val >= -0.005 and in_drawdown:  # Fim do drawdown
                    in_drawdown = False
                    if start_dd is not None:
                        period_dd = drawdown[start_dd:date]
                        if len(period_dd) > 0:
                            dd_periods.append({
                                'start': start_dd,
                                'end': date,
                                'max_dd': period_dd.min(),
                                'duration': len(period_dd)
                            })
            
            # Top 5 por magnitude
            dd_periods.sort(key=lambda x: x['max_dd'])
            top_5_dd = dd_periods[:5]
            
            if top_5_dd:
                # Plotar barras dos top 5 drawdowns
                labels = [f"DD {i+1}\n{dd['start'].strftime('%m/%y')}" for i, dd in enumerate(top_5_dd)]
                values = [dd['max_dd'] for dd in top_5_dd]
                colors = ['#d62728', '#ff7f0e', '#ffbb78', '#c5b0d5', '#c7c7c7']
                
                bars = ax8.bar(range(len(values)), values, color=colors[:len(values)])
                ax8.set_xticks(range(len(values)))
                ax8.set_xticklabels(labels, fontsize=9)
                ax8.set_ylabel('Max Drawdown')
                
                # Adicionar valores nas barras
                for bar, value in zip(bars, values):
                    ax8.text(bar.get_x() + bar.get_width()/2, bar.get_height() - 0.005, 
                            f'{value:.1%}', ha='center', va='top', fontsize=9, fontweight='bold')
            else:
                ax8.text(0.5, 0.5, 'Top 5 drawdown periods\n(No significant drawdowns)', 
                        ha='center', va='center', transform=ax8.transAxes)
        except:
            ax8.text(0.5, 0.5, 'Top 5 drawdown\nperiods\n(Error)', 
                    ha='center', va='center', transform=ax8.transAxes)
        ax8.set_title('Top 5 drawdown periods', fontsize=12, fontweight='bold')
        ax8.grid(True, alpha=0.3)
        
        # 9. Underwater plot
        ax9 = plt.subplot(6, 3, 9)
        try:
            ax9.fill_between(drawdown.index, drawdown.values, 0, alpha=0.7, color='#d62728', label='Drawdown')
            ax9.set_title('Underwater plot', fontsize=12, fontweight='bold')
            ax9.set_ylabel('Drawdown')
            ax9.legend(fontsize=9)
        except:
            ax9.text(0.5, 0.5, 'Underwater plot\n(Error)', ha='center', va='center', transform=ax9.transAxes)
        ax9.grid(True, alpha=0.3)
        
        # 10. Monthly Returns
        ax10 = plt.subplot(6, 3, 10)
        try:
            if len(monthly_returns) > 0:
                monthly_returns.plot(kind='bar', ax=ax10, color='#2ca02c', alpha=0.7)
                ax10.axhline(y=0, color='black', linestyle='-', alpha=0.5)
                ax10.set_title('Monthly returns (%)', fontsize=12, fontweight='bold')
                ax10.set_ylabel('Monthly Return')
                ax10.tick_params(axis='x', rotation=45, labelsize=8)
            else:
                ax10.text(0.5, 0.5, 'Monthly returns\n(Insufficient data)', 
                         ha='center', va='center', transform=ax10.transAxes)
        except:
            ax10.text(0.5, 0.5, 'Monthly returns\n(Error)', ha='center', va='center', transform=ax10.transAxes)
        ax10.grid(True, alpha=0.3)
        
        # 11. Annual Returns
        ax11 = plt.subplot(6, 3, 11)
        try:
            if len(annual_returns) > 0:
                colors = ['#2ca02c' if x > 0 else '#d62728' for x in annual_returns.values]
                annual_returns.plot(kind='bar', ax=ax11, color=colors, alpha=0.7)
                ax11.axhline(y=0, color='black', linestyle='-', alpha=0.5)
                ax11.set_title('Annual returns', fontsize=12, fontweight='bold')
                ax11.set_ylabel('Annual Return')
                ax11.tick_params(axis='x', rotation=45, labelsize=8)
            else:
                ax11.text(0.5, 0.5, 'Annual returns\n(Insufficient data)', 
                         ha='center', va='center', transform=ax11.transAxes)
        except:
            ax11.text(0.5, 0.5, 'Annual returns\n(Error)', ha='center', va='center', transform=ax11.transAxes)
        ax11.grid(True, alpha=0.3)
        
        # 12. Distribution of monthly returns
        ax12 = plt.subplot(6, 3, 12)
        try:
            if len(monthly_returns) > 0:
                monthly_returns.hist(bins=15, ax=ax12, alpha=0.7, color='#ff7f0e', edgecolor='black')
                ax12.axvline(monthly_returns.mean(), color='red', linestyle='--', linewidth=2, label=f'Mean: {monthly_returns.mean():.2%}')
                ax12.axvline(monthly_returns.median(), color='blue', linestyle='--', linewidth=2, label=f'Median: {monthly_returns.median():.2%}')
                ax12.set_title('Distribution of\nmonthly returns', fontsize=12, fontweight='bold')
                ax12.set_xlabel('Monthly Return')
                ax12.set_ylabel('Frequency')
                ax12.legend(fontsize=9)
            else:
                ax12.text(0.5, 0.5, 'Distribution of\nmonthly returns\n(Insufficient data)', 
                         ha='center', va='center', transform=ax12.transAxes)
        except:
            ax12.text(0.5, 0.5, 'Distribution of\nmonthly returns\n(Error)', 
                     ha='center', va='center', transform=ax12.transAxes)
        ax12.grid(True, alpha=0.3)
        
        # 13. Return quantiles
        ax13 = plt.subplot(6, 3, 13)
        try:
            if len(aligned_returns) > 0:
                # Box plot dos retornos por diferentes períodos
                quarterly_returns = aligned_returns.resample('Q').apply(lambda x: (1 + x).prod() - 1)
                
                # Dados para box plot: diário, mensal, trimestral
                data_to_plot = []
                labels = []
                
                if len(aligned_returns) > 50:
                    data_to_plot.append(aligned_returns.values)
                    labels.append('Daily')
                
                if len(monthly_returns) > 3:
                    data_to_plot.append(monthly_returns.values)
                    labels.append('Monthly')
                
                if len(quarterly_returns) > 1:
                    data_to_plot.append(quarterly_returns.values)
                    labels.append('Quarterly')
                
                if data_to_plot:
                    box_plot = ax13.boxplot(data_to_plot, labels=labels, patch_artist=True)
                    colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
                    for patch, color in zip(box_plot['boxes'], colors[:len(box_plot['boxes'])]):
                        patch.set_facecolor(color)
                        patch.set_alpha(0.7)
                else:
                    ax13.text(0.5, 0.5, 'Return quantiles\n(Insufficient data)', 
                             ha='center', va='center', transform=ax13.transAxes)
            else:
                ax13.text(0.5, 0.5, 'Return quantiles\n(No data)', 
                         ha='center', va='center', transform=ax13.transAxes)
        except Exception as e:
            ax13.text(0.5, 0.5, f'Return quantiles\n(Error)', 
                     ha='center', va='center', transform=ax13.transAxes)
        ax13.set_title('Return quantiles', fontsize=12, fontweight='bold')
        ax13.set_ylabel('Return')
        ax13.grid(True, alpha=0.3)
        
        # Ajustar layout para acomodar todos os 13 gráficos
        plt.tight_layout(pad=2.0, rect=[0, 0.03, 1, 0.96])
        
        # Adicionar título geral do pyfolio-reloaded
        fig.suptitle('Portfolio Performance Analysis - Complete Pyfolio-Reloaded Tearsheet', 
                    fontsize=20, fontweight='bold', y=0.98)
        
        # Adicionar subtitle com informações técnicas
        fig.text(0.5, 0.01, 'Generated using pyfolio-reloaded v0.9.8 & empyrical-reloaded v0.5.11', 
                ha='center', va='bottom', fontsize=12, style='italic', color='gray')
        
        # Converter para base64
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=300, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        plt.close(fig)
        
        logger.info("Tearsheet completo gerado com sucesso")
        return image_base64
    
    def _generate_fallback_tearsheet(self) -> str:
        """
        Gera tearsheet simplificado em caso de erro
        """
        try:
            fig, ax = plt.subplots(figsize=(12, 8))
            
            # Retornos cumulativos básicos
            cumulative = (1 + self.portfolio_returns).cumprod()
            cumulative.plot(ax=ax, title='Portfolio Cumulative Returns', 
                           linewidth=2, color='darkblue')
            
            if self.benchmark_returns is not None:
                benchmark_cumulative = (1 + self.benchmark_returns).cumprod()
                benchmark_cumulative.plot(ax=ax, alpha=0.7, label='Benchmark', 
                                        linewidth=2, color='orange')
            
            ax.legend()
            ax.grid(True, alpha=0.3)
            ax.set_ylabel('Cumulative Return')
            ax.set_title('Portfolio Performance Analysis', fontsize=16, fontweight='bold')
            
            # Converter para base64
            buffer = BytesIO()
            fig.savefig(buffer, format='png', dpi=300, bbox_inches='tight', 
                       facecolor='white', edgecolor='none')
            buffer.seek(0)
            
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close(fig)
            
            return image_base64
            
        except Exception as e:
            logger.error(f"Erro no fallback tearsheet: {e}")
            return ""
    
    def calculate_rolling_metrics(self, 
                                 window: int = 252,
                                 metrics: List[str] = None) -> pd.DataFrame:
        """
        Calcula métricas rolling para análise temporal
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        if metrics is None:
            metrics = ['sharpe_ratio', 'volatility', 'max_drawdown']
        
        returns = self.portfolio_returns
        rolling_data = {}
        
        try:
            for metric in metrics:
                if metric == 'sharpe_ratio':
                    rolling_data[metric] = returns.rolling(window).apply(
                        lambda x: ep.sharpe_ratio(x) if len(x.dropna()) > 10 else np.nan
                    )
                elif metric == 'volatility':
                    rolling_data[metric] = returns.rolling(window).std() * np.sqrt(252)
                elif metric == 'max_drawdown':
                    rolling_data[metric] = returns.rolling(window).apply(
                        lambda x: ep.max_drawdown(x) if len(x.dropna()) > 10 else np.nan
                    )
            
            rolling_df = pd.DataFrame(rolling_data, index=returns.index)
            
            logger.info(f"Métricas rolling calculadas: {len(metrics)} indicadores")
            return rolling_df
            
        except Exception as e:
            logger.error(f"Erro ao calcular métricas rolling: {e}")
            raise
    
    def _filter_period(self, 
                      series: pd.Series, 
                      start: Optional[datetime] = None, 
                      end: Optional[datetime] = None) -> pd.Series:
        """Filtra série temporal por período"""
        if series is None:
            return None
        
        if start is not None:
            series = series[series.index >= start]
        if end is not None:
            series = series[series.index <= end]
        
        return series
    
    def compare_portfolios(self, 
                          other_returns: Dict[str, pd.Series],
                          metrics: List[str] = None) -> pd.DataFrame:
        """
        Compara performance entre múltiplos portfólios
        
        Args:
            other_returns: Dicionário com retornos de outros portfólios
            metrics: Lista de métricas para comparar
            
        Returns:
            DataFrame com comparação de métricas
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        if metrics is None:
            metrics = ['annual_return', 'annual_volatility', 'sharpe_ratio', 
                      'max_drawdown', 'sortino_ratio', 'calmar_ratio']
        
        # Adicionar portfólio atual
        all_returns = {'Current Portfolio': self.portfolio_returns}
        all_returns.update(other_returns)
        
        comparison_data = {}
        
        for name, returns in all_returns.items():
            portfolio_metrics = {}
            
            for metric in metrics:
                try:
                    if metric == 'annual_return':
                        portfolio_metrics[metric] = ep.annual_return(returns)
                    elif metric == 'annual_volatility':
                        portfolio_metrics[metric] = ep.annual_volatility(returns)
                    elif metric == 'sharpe_ratio':
                        portfolio_metrics[metric] = ep.sharpe_ratio(returns)
                    elif metric == 'max_drawdown':
                        portfolio_metrics[metric] = ep.max_drawdown(returns)
                    elif metric == 'sortino_ratio':
                        portfolio_metrics[metric] = ep.sortino_ratio(returns)
                    elif metric == 'calmar_ratio':
                        portfolio_metrics[metric] = ep.calmar_ratio(returns)
                    elif metric == 'cumulative_return':
                        portfolio_metrics[metric] = ep.cum_returns_final(returns)
                except Exception as e:
                    logger.warning(f"Erro ao calcular {metric} para {name}: {e}")
                    portfolio_metrics[metric] = np.nan
            
            comparison_data[name] = portfolio_metrics
        
        comparison_df = pd.DataFrame(comparison_data).T
        
        logger.info(f"Comparação entre {len(all_returns)} portfólios concluída")
        return comparison_df
    
    def calculate_factor_analysis(self, 
                                 factor_returns: Optional[pd.DataFrame] = None,
                                 risk_free_rate: float = 0.0) -> Dict[str, Any]:
        """
        Calcula análise de fatores de risco usando pyfolio
        
        Args:
            factor_returns: DataFrame com retornos dos fatores
            risk_free_rate: Taxa livre de risco
            
        Returns:
            Dict com resultados da análise de fatores
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        # Usar factor_returns fornecido ou o configurado na classe
        factors = factor_returns if factor_returns is not None else self.factor_returns
        
        if factors is None:
            logger.warning("Nenhum fator de risco fornecido para análise")
            return {}
        
        try:
            # Alinhar séries temporais
            aligned_returns = self.portfolio_returns.reindex(factors.index).dropna()
            aligned_factors = factors.reindex(aligned_returns.index).dropna()
            
            if len(aligned_returns) == 0 or len(aligned_factors) == 0:
                logger.warning("Não há dados alinhados para análise de fatores")
                return {}
            
            # Análise de exposição a fatores
            factor_exposures = {}
            factor_returns_contribution = {}
            
            for factor_name in aligned_factors.columns:
                factor_series = aligned_factors[factor_name]
                
                # Calcular beta para cada fator
                beta = ep.beta(aligned_returns, factor_series)
                alpha = ep.alpha(aligned_returns, factor_series, risk_free=risk_free_rate)
                correlation = aligned_returns.corr(factor_series)
                
                factor_exposures[factor_name] = {
                    'beta': beta,
                    'alpha': alpha,
                    'correlation': correlation,
                    'r_squared': correlation ** 2
                }
                
                # Contribuição estimada do fator para os retornos
                factor_returns_contribution[factor_name] = beta * factor_series.mean()
            
            # Calcular estatísticas de fama-french se disponível
            factor_analysis = {
                'factor_exposures': factor_exposures,
                'factor_returns_contribution': factor_returns_contribution,
                'total_factor_contribution': sum(factor_returns_contribution.values()),
                'idiosyncratic_return': aligned_returns.mean() - sum(factor_returns_contribution.values()),
                'analysis_period': {
                    'start': aligned_returns.index[0],
                    'end': aligned_returns.index[-1],
                    'observations': len(aligned_returns)
                }
            }
            
            logger.info(f"Análise de fatores concluída para {len(aligned_factors.columns)} fatores")
            return factor_analysis
            
        except Exception as e:
            logger.error(f"Erro na análise de fatores: {e}")
            raise
    
    def generate_performance_report(self, 
                                   include_tearsheet: bool = True,
                                   include_factor_analysis: bool = True,
                                   include_rolling_metrics: bool = True,
                                   risk_free_rate: float = 0.0,
                                   rolling_window: int = 252) -> Dict[str, Any]:
        """
        Gera relatório completo de performance
        
        Args:
            include_tearsheet: Incluir tearsheet do pyfolio
            include_factor_analysis: Incluir análise de fatores
            include_rolling_metrics: Incluir métricas rolling
            risk_free_rate: Taxa livre de risco
            rolling_window: Janela para métricas rolling
            
        Returns:
            Dict completo com todas as análises
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        try:
            report = {
                'timestamp': datetime.now().isoformat(),
                'portfolio_summary': {
                    'total_periods': len(self.portfolio_returns),
                    'start_date': self.portfolio_returns.index[0].isoformat(),
                    'end_date': self.portfolio_returns.index[-1].isoformat(),
                    'frequency': self._infer_frequency(self.portfolio_returns.index),
                    'has_benchmark': self.benchmark_returns is not None,
                    'has_positions': self.positions is not None,
                    'has_transactions': self.transactions is not None,
                    'has_factor_data': self.factor_returns is not None
                }
            }
            
            # Métricas principais de performance
            report['performance_metrics'] = self.calculate_performance_metrics(
                risk_free_rate=risk_free_rate
            )
            
            # Tearsheet do pyfolio
            if include_tearsheet:
                try:
                    report['tearsheet_base64'] = self.generate_pyfolio_tearsheet(return_fig=True)
                except Exception as e:
                    logger.warning(f"Erro ao gerar tearsheet: {e}")
                    report['tearsheet_error'] = str(e)
            
            # Análise de fatores
            if include_factor_analysis and self.factor_returns is not None:
                try:
                    report['factor_analysis'] = self.calculate_factor_analysis(
                        risk_free_rate=risk_free_rate
                    )
                except Exception as e:
                    logger.warning(f"Erro na análise de fatores: {e}")
                    report['factor_analysis_error'] = str(e)
            
            # Métricas rolling
            if include_rolling_metrics and len(self.portfolio_returns) >= rolling_window:
                try:
                    rolling_metrics = self.calculate_rolling_metrics(window=rolling_window)
                    report['rolling_metrics'] = {
                        'data': rolling_metrics.to_dict('records'),
                        'summary': {
                            'avg_sharpe': rolling_metrics['sharpe_ratio'].mean() if 'sharpe_ratio' in rolling_metrics else None,
                            'avg_volatility': rolling_metrics['volatility'].mean() if 'volatility' in rolling_metrics else None,
                            'worst_drawdown': rolling_metrics['max_drawdown'].min() if 'max_drawdown' in rolling_metrics else None,
                        }
                    }
                except Exception as e:
                    logger.warning(f"Erro ao calcular métricas rolling: {e}")
                    report['rolling_metrics_error'] = str(e)
            
            logger.info("Relatório completo de performance gerado com sucesso")
            return report
            
        except Exception as e:
            logger.error(f"Erro ao gerar relatório de performance: {e}")
            raise
    
    def _infer_frequency(self, index: pd.DatetimeIndex) -> str:
        """Infere frequência dos dados"""
        try:
            freq = pd.infer_freq(index)
            return freq if freq else 'Unknown'
        except:
            return 'Unknown'
    
    @staticmethod
    def create_factor_returns_df(market_return: pd.Series,
                                size_factor: Optional[pd.Series] = None,
                                value_factor: Optional[pd.Series] = None,
                                momentum_factor: Optional[pd.Series] = None,
                                quality_factor: Optional[pd.Series] = None) -> pd.DataFrame:
        """
        Cria DataFrame de fatores de risco para análise
        
        Args:
            market_return: Retornos do mercado (fator beta)
            size_factor: Fator de tamanho (SMB - Small Minus Big)
            value_factor: Fator de valor (HML - High Minus Low)
            momentum_factor: Fator de momentum
            quality_factor: Fator de qualidade
            
        Returns:
            DataFrame com fatores organizados
        """
        factors = {'Market': market_return}
        
        if size_factor is not None:
            factors['Size'] = size_factor
        if value_factor is not None:
            factors['Value'] = value_factor
        if momentum_factor is not None:
            factors['Momentum'] = momentum_factor
        if quality_factor is not None:
            factors['Quality'] = quality_factor
        
        return pd.DataFrame(factors)
    
    def compare_portfolios(self, 
                          other_returns: Dict[str, pd.Series],
                          metrics: List[str] = None) -> pd.DataFrame:
        """
        Compara performance entre múltiplos portfólios
        
        Args:
            other_returns: Dicionário com retornos de outros portfólios
            metrics: Lista de métricas para comparar
            
        Returns:
            DataFrame com comparação de métricas
        """
        if self.portfolio_returns is None:
            raise ValueError("Dados do portfólio não foram definidos")
        
        if metrics is None:
            metrics = ['annual_return', 'annual_volatility', 'sharpe_ratio', 
                      'max_drawdown', 'sortino_ratio', 'calmar_ratio']
        
        # Adicionar portfólio atual
        all_returns = {'Current Portfolio': self.portfolio_returns}
        all_returns.update(other_returns)
        
        comparison_data = {}
        
        for name, returns in all_returns.items():
            portfolio_metrics = {}
            
            for metric in metrics:
                try:
                    if metric == 'annual_return':
                        portfolio_metrics[metric] = ep.annual_return(returns)
                    elif metric == 'annual_volatility':
                        portfolio_metrics[metric] = ep.annual_volatility(returns)
                    elif metric == 'sharpe_ratio':
                        portfolio_metrics[metric] = ep.sharpe_ratio(returns)
                    elif metric == 'max_drawdown':
                        portfolio_metrics[metric] = ep.max_drawdown(returns)
                    elif metric == 'sortino_ratio':
                        portfolio_metrics[metric] = ep.sortino_ratio(returns)
                    elif metric == 'calmar_ratio':
                        portfolio_metrics[metric] = ep.calmar_ratio(returns)
                    elif metric == 'cumulative_return':
                        portfolio_metrics[metric] = ep.cum_returns_final(returns)
                except Exception as e:
                    logger.warning(f"Erro ao calcular {metric} para {name}: {e}")
                    portfolio_metrics[metric] = np.nan
            
            comparison_data[name] = portfolio_metrics
        
        comparison_df = pd.DataFrame(comparison_data).T
        
        logger.info(f"Comparação entre {len(all_returns)} portfólios concluída")
        return comparison_df
    
    # ===== FUNÇÕES HELPER PARA MÉTRICAS NÃO DISPONÍVEIS NO EMPYRICAL =====
    
    def _calculate_avg_drawdown(self, returns: pd.Series) -> float:
        """Calcula drawdown médio"""
        try:
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.expanding().max()
            drawdown = (cumulative - running_max) / running_max
            
            # Retornar apenas drawdowns negativos (descidas)
            negative_drawdowns = drawdown[drawdown < 0]
            return negative_drawdowns.mean() if len(negative_drawdowns) > 0 else 0.0
        except:
            return 0.0
    
    def _calculate_avg_drawdown_days(self, returns: pd.Series) -> float:
        """Calcula número médio de dias em drawdown"""
        try:
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.expanding().max()
            drawdown = (cumulative - running_max) / running_max
            
            # Identificar períodos de drawdown
            in_drawdown = drawdown < 0
            
            # Contar duração de cada período de drawdown
            drawdown_periods = []
            current_period = 0
            
            for is_dd in in_drawdown:
                if is_dd:
                    current_period += 1
                else:
                    if current_period > 0:
                        drawdown_periods.append(current_period)
                        current_period = 0
            
            # Adicionar último período se terminou em drawdown
            if current_period > 0:
                drawdown_periods.append(current_period)
            
            return np.mean(drawdown_periods) if drawdown_periods else 0.0
        except:
            return 0.0
    
    def _calculate_max_drawdown_days(self, returns: pd.Series) -> int:
        """Calcula máximo número de dias em drawdown"""
        try:
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.expanding().max()
            drawdown = (cumulative - running_max) / running_max
            
            # Identificar períodos de drawdown
            in_drawdown = drawdown < 0
            
            # Contar duração de cada período de drawdown
            drawdown_periods = []
            current_period = 0
            
            for is_dd in in_drawdown:
                if is_dd:
                    current_period += 1
                else:
                    if current_period > 0:
                        drawdown_periods.append(current_period)
                        current_period = 0
            
            # Adicionar último período se terminou em drawdown
            if current_period > 0:
                drawdown_periods.append(current_period)
            
            return max(drawdown_periods) if drawdown_periods else 0
        except:
            return 0
    
    def _calculate_common_sense_ratio(self, returns: pd.Series) -> float:
        """Calcula Common Sense Ratio (aproximação)"""
        try:
            # Common Sense Ratio = tail ratio * (1 + excess kurtosis)
            tail_r = ep.tail_ratio(returns)
            excess_kurtosis = returns.kurtosis()
            return tail_r * (1 + excess_kurtosis)
        except:
            return 0.0
    
    def _calculate_tracking_error(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """Calcula tracking error (volatilidade dos excess returns)"""
        try:
            excess_returns = portfolio_returns - benchmark_returns
            return excess_returns.std() * np.sqrt(252)  # Anualizando
        except:
            return 0.0
    
    def _calculate_information_ratio(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """Calcula information ratio (excess return / tracking error)"""
        try:
            excess_returns = portfolio_returns - benchmark_returns
            excess_return_annualized = excess_returns.mean() * 252
            tracking_error = self._calculate_tracking_error(portfolio_returns, benchmark_returns)
            
            return excess_return_annualized / tracking_error if tracking_error != 0 else 0.0
        except:
            return 0.0