// Configuração da API base URL
const API_BASE_URL = 'http://localhost:5000';

// Interfaces
export interface PortfolioAsset {
  ticker: string;
  weight: number;
  name?: string;
  sector?: string;
}

export interface PerformanceMetrics {
  annual_return: number;
  cumulative_return: number;
  annual_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  omega_ratio: number;
  max_drawdown: number;
  avg_drawdown: number;
  avg_drawdown_days: number;
  max_drawdown_days: number;
  skewness: number;
  kurtosis: number;
  tail_ratio: number;
  common_sense_ratio: number;
  downside_risk: number;
  value_at_risk: number;
  conditional_value_at_risk: number;
  stability_of_timeseries: number;
  periods: number;
  start_date: string;
  end_date: string;
  // Métricas vs benchmark (opcionais)
  alpha?: number;
  beta?: number;
  tracking_error?: number;
  information_ratio?: number;
  up_capture?: number;
  down_capture?: number;
  capture_ratio?: number;
  benchmark_annual_return?: number;
  benchmark_volatility?: number;
  benchmark_sharpe?: number;
  benchmark_max_drawdown?: number;
  excess_sharpe?: number;
}

export interface RollingMetric {
  date: string;
  sharpe_ratio: number;
  volatility: number;
  max_drawdown: number;
  sortino_ratio?: number;
  calmar_ratio?: number;
}

export interface AnalysisRequest {
  tickers: string[];
  weights: number[];
  period_months: number;
  benchmark: string;
  risk_free_rate: number;
  include_tearsheet: boolean;
}

export interface AnalysisResponse {
  success: boolean;
  data: {
    portfolio_metrics: PerformanceMetrics;
    tearsheet_image?: string;
    rolling_metrics?: RollingMetric[];
    analysis_info: {
      portfolio_periods: number;
      benchmark_ticker: string;
      risk_free_rate: number;
      analysis_period_months: number;
      start_date: string;
      end_date: string;
    };
  };
  request_params: {
    tickers: string[];
    weights: number[];
    period_months: number;
    benchmark: string;
    risk_free_rate: number;
  };
}

export interface StrategyComparison {
  [strategyName: string]: {
    [assetTicker: string]: number;
  };
}

export interface ComparisonResponse {
  success: boolean;
  data: {
    individual_metrics: {
      [strategyName: string]: PerformanceMetrics | { error: string };
    };
    comparative_table: {
      [strategyName: string]: {
        annual_return: number;
        annual_volatility: number;
        sharpe_ratio: number;
        max_drawdown: number;
        sortino_ratio: number;
        calmar_ratio: number;
        cumulative_return: number;
      };
    };
    best_strategy: {
      by_sharpe?: string;
      by_return?: string;
      by_risk?: string;
    };
    benchmark_ticker: string;
    risk_free_rate: number;
  };
  request_params: {
    strategies: string[];
    period_months: number;
    benchmark: string;
    risk_free_rate: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  libraries: {
    pyfolio_version?: string;
    empyrical_available: boolean;
  };
  timestamp: string;
  error?: string;
}

export interface MetricsRequest {
  returns: number[];
  benchmark_returns?: number[];
  risk_free_rate: number;
  period_start?: string;
  period_end?: string;
}

export interface TearsheetRequest {
  returns: number[];
  benchmark_returns?: number[];
  period_start?: string;
  hide_positions?: boolean;
}

export interface RollingMetricsRequest {
  returns: number[];
  window: number;
  metrics: string[];
}

class PerformanceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/performance`;
  }

  /**
   * Verifica a saúde do serviço de performance
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro no health check:', error);
      throw error;
    }
  }

  /**
   * Executa análise completa de performance do portfólio
   */
  async analyzePortfolio(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      // Validações básicas
      if (request.tickers.length !== request.weights.length) {
        throw new Error('Número de tickers deve ser igual ao número de pesos');
      }

      const totalWeight = request.weights.reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        throw new Error('Soma dos pesos deve ser aproximadamente 1.0');
      }

      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Análise falhou');
      }

      return result;
    } catch (error) {
      console.error('Erro na análise de portfólio:', error);
      throw error;
    }
  }

  /**
   * Compara múltiplas estratégias de portfólio
   */
  async compareStrategies(
    strategies: StrategyComparison,
    periodMonths: number = 12,
    benchmark: string = '^BVSP',
    riskFreeRate: number = 0.0525
  ): Promise<ComparisonResponse> {
    try {
      // Validações
      if (Object.keys(strategies).length < 2) {
        throw new Error('Necessário pelo menos 2 estratégias para comparação');
      }

      // Validar e normalizar pesos de cada estratégia
      const normalizedStrategies: StrategyComparison = {};
      
      for (const [strategyName, weights] of Object.entries(strategies)) {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        if (totalWeight === 0) {
          throw new Error(`Estratégia '${strategyName}' não pode ter peso total zero`);
        }

        // Normalizar pesos
        normalizedStrategies[strategyName] = {};
        for (const [ticker, weight] of Object.entries(weights)) {
          normalizedStrategies[strategyName][ticker] = weight / totalWeight;
        }
      }

      const requestPayload = {
        strategies: normalizedStrategies,
        period_months: periodMonths,
        benchmark,
        risk_free_rate: riskFreeRate,
      };

      const response = await fetch(`${this.baseUrl}/compare-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Comparação falhou');
      }

      return result;
    } catch (error) {
      console.error('Erro na comparação de estratégias:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas avançadas para retornos personalizados
   */
  async calculateAdvancedMetrics(request: MetricsRequest): Promise<{
    success: boolean;
    data: {
      metrics: PerformanceMetrics;
      analysis_info: {
        periods: number;
        has_benchmark: boolean;
        risk_free_rate: number;
        start_date: string;
        end_date: string;
      };
    };
  }> {
    try {
      if (request.returns.length === 0) {
        throw new Error('Lista de retornos não pode estar vazia');
      }

      if (request.benchmark_returns && request.benchmark_returns.length !== request.returns.length) {
        throw new Error('Retornos do benchmark devem ter o mesmo tamanho dos retornos do portfólio');
      }

      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Cálculo de métricas falhou');
      }

      return result;
    } catch (error) {
      console.error('Erro no cálculo de métricas avançadas:', error);
      throw error;
    }
  }

  /**
   * Gera tearsheet visual usando pyfolio
   */
  async generateTearsheet(request: TearsheetRequest): Promise<{
    success: boolean;
    data: {
      tearsheet_image: string;
      format: string;
    };
  }> {
    try {
      if (request.returns.length === 0) {
        throw new Error('Lista de retornos não pode estar vazia');
      }

      if (request.benchmark_returns && request.benchmark_returns.length !== request.returns.length) {
        throw new Error('Retornos do benchmark devem ter o mesmo tamanho dos retornos do portfólio');
      }

      const response = await fetch(`${this.baseUrl}/tearsheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Geração de tearsheet falhou');
      }

      return result;
    } catch (error) {
      console.error('Erro na geração de tearsheet:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas rolling para análise temporal
   */
  async calculateRollingMetrics(request: RollingMetricsRequest): Promise<{
    success: boolean;
    data: {
      rolling_metrics: RollingMetric[];
      window: number;
      metrics: string[];
      total_periods: number;
      valid_periods: number;
    };
  }> {
    try {
      if (request.returns.length === 0) {
        throw new Error('Lista de retornos não pode estar vazia');
      }

      if (request.window >= request.returns.length) {
        throw new Error('Janela deve ser menor que o número total de retornos');
      }

      if (request.window < 10) {
        throw new Error('Janela deve ser de pelo menos 10 períodos');
      }

      const response = await fetch(`${this.baseUrl}/rolling-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Cálculo de métricas rolling falhou');
      }

      return result;
    } catch (error) {
      console.error('Erro no cálculo de métricas rolling:', error);
      throw error;
    }
  }

  /**
   * Utilitário para formatar valores percentuais
   */
  formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Utilitário para formatar números
   */
  formatNumber(value: number, decimals: number = 3): string {
    return value.toFixed(decimals);
  }

  /**
   * Utilitário para formatar datas
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  /**
   * Utilitário para obter cor baseada no valor da métrica
   */
  getMetricColor(value: number, type: 'return' | 'risk' = 'return'): string {
    if (type === 'return') {
      return value > 0 ? '#10b981' : '#ef4444'; // verde para positivo, vermelho para negativo
    }
    
    // Para métricas de risco, cores baseadas em limites
    if (value < 0.15) return '#10b981'; // baixo risco - verde
    if (value < 0.25) return '#f59e0b'; // risco médio - amarelo
    return '#ef4444'; // alto risco - vermelho
  }

  /**
   * Utilitário para determinar o benchmark recomendado baseado nos ativos
   */
  getRecommendedBenchmark(tickers: string[]): string {
    const hasBrazilianAssets = tickers.some(ticker => ticker.endsWith('.SA'));
    const hasUSAssets = tickers.some(ticker => !ticker.endsWith('.SA') && !ticker.startsWith('^'));
    
    if (hasBrazilianAssets && !hasUSAssets) {
      return '^BVSP'; // Ibovespa para ativos brasileiros
    }
    
    if (hasUSAssets && !hasBrazilianAssets) {
      return '^GSPC'; // S&P 500 para ativos americanos
    }
    
    return 'EEM'; // Emerging Markets para portfolios mistos
  }

  /**
   * Valida composição do portfólio
   */
  validatePortfolio(portfolio: PortfolioAsset[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (portfolio.length === 0) {
      errors.push('Portfólio deve conter pelo menos um ativo');
    }
    
    const totalWeight = portfolio.reduce((sum, asset) => sum + asset.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      errors.push(`Soma dos pesos deve ser próxima a 100% (atual: ${(totalWeight * 100).toFixed(2)}%)`);
    }
    
    const duplicatedTickers = portfolio
      .map(asset => asset.ticker)
      .filter((ticker, index, array) => array.indexOf(ticker) !== index);
    
    if (duplicatedTickers.length > 0) {
      errors.push(`Tickers duplicados encontrados: ${duplicatedTickers.join(', ')}`);
    }
    
    const emptyTickers = portfolio.filter(asset => !asset.ticker.trim());
    if (emptyTickers.length > 0) {
      errors.push(`${emptyTickers.length} ativo(s) sem ticker definido`);
    }
    
    const negativeWeights = portfolio.filter(asset => asset.weight < 0);
    if (negativeWeights.length > 0) {
      errors.push(`${negativeWeights.length} ativo(s) com peso negativo`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instância singleton do serviço
export const performanceService = new PerformanceService();

// Export padrão
export default performanceService; 