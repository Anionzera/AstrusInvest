// Configuração da API base URL
const API_BASE_URL = 'http://localhost:5000';

// Interfaces melhoradas
export interface PortfolioAsset {
  ticker: string;
  weight: number;
  name?: string;
  sector?: string;
}

export interface AnalysisPeriod {
  start_date: string;
  end_date: string;
  total_days: number;
  period: string;
}

export interface PortfolioComposition {
  ticker: string;
  weight: number;
  name: string;
}

export interface PerformanceMetrics {
  // ===== MÉTRICAS BÁSICAS DE RETORNO =====
  annual_return: number;
  cagr: number;
  cumulative_return: number;
  simple_returns_mean: number;
  
  // ===== MÉTRICAS DE VOLATILIDADE E RISCO =====
  annual_volatility: number;
  downside_risk: number;
  value_at_risk_95: number;
  value_at_risk_99: number;
  conditional_value_at_risk_95: number;
  conditional_value_at_risk_99: number;
  max_drawdown: number;
  
  // ===== MÉTRICAS DE RISCO-RETORNO =====
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  omega_ratio: number;
  
  // ===== MÉTRICAS ESTATÍSTICAS =====
  skewness: number;
  kurtosis: number;
  tail_ratio: number;
  stability_of_timeseries: number;
  
  // ===== MÉTRICAS AVANÇADAS DE RISCO =====
  gpd_var_estimate?: number | null;
  gpd_es_estimate?: number | null;
  
  // ===== MÉTRICAS VS BENCHMARK =====
  alpha?: number | null;
  beta?: number | null;
  up_capture?: number | null;
  down_capture?: number | null;
  capture_ratio?: number | null;
  excess_sharpe?: number | null;
  batting_average?: number | null;
  beta_fragility_heuristic?: number | null;
  tracking_error?: number | null;
  information_ratio?: number | null;
  
  // ===== ALPHA/BETA UP/DOWN =====
  up_alpha?: number | null;
  up_beta?: number | null;
  down_alpha?: number | null;
  down_beta?: number | null;
  
  // ===== BENCHMARK STATS =====
  benchmark_annual_return?: number | null;
  benchmark_volatility?: number | null;
  benchmark_sharpe?: number | null;
  benchmark_max_drawdown?: number | null;
  
  // ===== MÉTRICAS ROLLING (30 dias) =====
  roll_annual_volatility_30d?: number | null;
  roll_max_drawdown_30d?: number | null;
  roll_sharpe_ratio_30d?: number | null;
  roll_sortino_ratio_30d?: number | null;
  roll_alpha_30d?: number | null;
  roll_beta_30d?: number | null;
  roll_up_capture_30d?: number | null;
  roll_down_capture_30d?: number | null;
  
  // ===== MÉTRICAS DE AGREGAÇÃO =====
  monthly_returns_count?: number | null;
  yearly_returns_count?: number | null;
  best_month?: number | null;
  worst_month?: number | null;
  best_year?: number | null;
  worst_year?: number | null;
  positive_months_pct?: number | null;
  positive_years_pct?: number | null;
  
  // ===== ANÁLISES AVANÇADAS =====
  performance_attribution?: any;
  factor_exposures?: any;
}

export interface PerformanceCharts {
  // Gráficos Customizados
  cumulative_returns: string;
  drawdown: string;
  returns_distribution: string;
  portfolio_composition: string;
  price_evolution: string;
  rolling_sharpe: string;
  
  // Gráficos Pyfolio Nativos
  rolling_returns_pyfolio?: string;
  rolling_sharpe_pyfolio?: string;
  rolling_beta_pyfolio?: string;
  rolling_volatility_pyfolio?: string;
  drawdown_underwater_pyfolio?: string;
  monthly_heatmap_pyfolio?: string;
  annual_returns_pyfolio?: string;
  monthly_distribution_pyfolio?: string;
  return_quantiles_pyfolio?: string;
  
  // Gráficos Customizados Adicionais
  returns_distribution_advanced?: string;
  drawdown_periods_custom?: string;
  custom_cumulative_returns?: string;
  
  error?: string;
}

export interface ModernAnalysisRequest {
  tickers: string[];
  weights: number[];
  period: string;
  benchmark: string;
  risk_free_rate: number;
}

export interface ModernAnalysisResponse {
  success: boolean;
  timestamp: string;
  analysis_period: AnalysisPeriod;
  portfolio_composition: PortfolioComposition[];
  performance_metrics: PerformanceMetrics;
  charts: PerformanceCharts;
  request_params: ModernAnalysisRequest;
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
   * Nova análise moderna completa com gráficos matplotlib
   */
  async comprehensiveAnalysis(request: ModernAnalysisRequest): Promise<ModernAnalysisResponse> {
    try {
      // Validações básicas
      if (request.tickers.length !== request.weights.length) {
        throw new Error('Número de tickers deve ser igual ao número de pesos');
      }

      const weightSum = request.weights.reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 1.0) > 0.01) {
        throw new Error('Soma dos pesos deve ser aproximadamente 1.0');
      }

      const response = await fetch(`${this.baseUrl}/comprehensive-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Análise falhou');
      }

      return data;
    } catch (error) {
      console.error('Erro na análise moderna:', error);
      throw error;
    }
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
   * Executa análise completa de performance do portfólio (método legado)
   */
  async analyzePortfolio(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      // Validações básicas
      if (request.tickers.length !== request.weights.length) {
        throw new Error('Número de tickers deve ser igual ao número de pesos');
      }

      const weightSum = request.weights.reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 1.0) > 0.01) {
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
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Análise falhou');
      }

      return data;
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
    riskFreeRate: number = 0.1475
  ): Promise<ComparisonResponse> {
    try {
      // Validações
      if (Object.keys(strategies).length < 2) {
        throw new Error('Necessário pelo menos 2 estratégias para comparação');
      }
      
      for (const [strategyName, weights] of Object.entries(strategies)) {
        const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(weightSum - 1.0) > 0.01) {
          throw new Error(`Soma dos pesos da estratégia '${strategyName}' deve ser aproximadamente 1.0`);
        }
      }

      const requestBody = {
        strategies,
        period_months: periodMonths,
        benchmark,
        risk_free_rate: riskFreeRate
      };

      const response = await fetch(`${this.baseUrl}/compare-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Comparação falhou');
      }

      return data;
    } catch (error) {
      console.error('Erro na comparação de estratégias:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas avançadas usando empyrical
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
      if (!request.returns || request.returns.length === 0) {
        throw new Error('Lista de retornos é obrigatória');
      }

      const response = await fetch(`${this.baseUrl}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Cálculo de métricas falhou');
      }

      return data;
    } catch (error) {
      console.error('Erro no cálculo de métricas:', error);
      throw error;
    }
  }

  /**
   * Gera tearsheet visual
   */
  async generateTearsheet(request: TearsheetRequest): Promise<{
    success: boolean;
    data: {
      tearsheet_image: string;
      format: string;
    };
  }> {
    try {
      if (!request.returns || request.returns.length === 0) {
        throw new Error('Lista de retornos é obrigatória');
      }

      const response = await fetch(`${this.baseUrl}/tearsheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Geração de tearsheet falhou');
      }

      return data;
    } catch (error) {
      console.error('Erro na geração de tearsheet:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas rolling
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
      if (!request.returns || request.returns.length === 0) {
        throw new Error('Lista de retornos é obrigatória');
      }

      if (request.window <= 0) {
        throw new Error('Janela de rolling deve ser maior que 0');
      }

      const response = await fetch(`${this.baseUrl}/rolling-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Cálculo de métricas rolling falhou');
      }

      return data;
    } catch (error) {
      console.error('Erro no cálculo de métricas rolling:', error);
      throw error;
    }
  }

  // Métodos de formatação e utilitários
  formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  formatNumber(value: number, decimals: number = 3): string {
    return value.toFixed(decimals);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  getMetricColor(value: number, type: 'return' | 'risk' = 'return'): string {
    if (type === 'return') {
      return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';
    } else {
      return value < 0.1 ? 'text-green-600' : value < 0.2 ? 'text-yellow-600' : 'text-red-600';
    }
  }

  getRecommendedBenchmark(tickers: string[]): string {
    const hasInternational = tickers.some(ticker => 
      !ticker.includes('.SA') && !ticker.startsWith('^')
    );
    const hasBrazilian = tickers.some(ticker => ticker.includes('.SA'));
    
    if (hasInternational && !hasBrazilian) {
      return '^GSPC'; // S&P 500
    } else if (hasBrazilian) {
      return '^BVSP'; // Ibovespa
    } else {
      return '^BVSP'; // Default
    }
  }

  validatePortfolio(portfolio: PortfolioAsset[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (portfolio.length === 0) {
      errors.push('Portfólio não pode estar vazio');
    }
    
    const totalWeight = portfolio.reduce((sum, asset) => sum + asset.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push('Soma dos pesos deve ser aproximadamente 100%');
    }
    
    const duplicateTickers = portfolio
      .map(asset => asset.ticker)
      .filter((ticker, index, arr) => arr.indexOf(ticker) !== index);
    
    if (duplicateTickers.length > 0) {
      errors.push(`Tickers duplicados: ${duplicateTickers.join(', ')}`);
    }
    
    portfolio.forEach((asset, index) => {
      if (!asset.ticker || asset.ticker.trim() === '') {
        errors.push(`Ativo ${index + 1}: ticker é obrigatório`);
    }
      if (asset.weight < 0 || asset.weight > 1) {
        errors.push(`Ativo ${index + 1}: peso deve estar entre 0% e 100%`);
    }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instância singleton do serviço
export const performanceService = new PerformanceService();

// Exportar métodos principais para uso direto
export const comprehensiveAnalysis = (request: ModernAnalysisRequest) => 
  performanceService.comprehensiveAnalysis(request);

export const analyzePortfolio = (request: AnalysisRequest) => 
  performanceService.analyzePortfolio(request);

export const compareStrategies = (
  strategies: StrategyComparison, 
  periodMonths?: number, 
  benchmark?: string, 
  riskFreeRate?: number
) => 
  performanceService.compareStrategies(strategies, periodMonths, benchmark, riskFreeRate);

export const checkPerformanceHealth = () => 
  performanceService.healthCheck(); 