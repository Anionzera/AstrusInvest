import axios from 'axios';

const API_BASE_URL = `${window.location.origin}/api`;

export interface ValuationData {
  symbol: string;
  current_price: number;
  target_price: number;
  upside_potential: number;
  recommendation: string;
  confidence_level: string;
  valuation_methods: {
    dcf: number;
    multiples: number;
    asset_based: number;
  };
  risk_metrics: {
    volatility: number;
    beta: number;
    sharpe_ratio: number;
  };
  fundamentals: {
    pe_ratio: number;
    pb_ratio: number;
    roe: number;
    roic: number;
    debt_to_equity: number;
    current_ratio: number;
  };
  market_data: {
    market_cap: number;
    volume: number;
    avg_volume: number;
    week_52_high: number;
    week_52_low: number;
  };
  timestamp?: string;
  analysis_details?: {
    data_source: string;
    methods_used: string[];
    last_updated: string;
  };
}

export interface ValuationResponse {
  success: boolean;
  symbol: string;
  timestamp: string;
  analysis_type: string;
  valuation: ValuationData;
}

export interface BatchValuationRequest {
  symbols: string[];
  include_comparison?: boolean;
}

export interface BatchValuationResponse {
  success: boolean;
  timestamp: string;
  analysis_type: string;
  summary: {
    total_requested: number;
    successful: number;
    failed: number;
    success_rate: string;
  };
  valuations: Record<string, ValuationData | null>;
  comparison?: any;
}

export interface ValuationRankingParams {
  symbols: string;
  metric?: 'upside_potential' | 'target_price' | 'health_score';
  limit?: number;
}

export class ValuationService {
  private static instance: ValuationService;
  private axiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para tratamento de erros
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Erro na API de Valuation:', error);
        
        if (error.response) {
          // Erro com resposta do servidor
          throw new Error(error.response.data?.message || error.response.data?.error || 'Erro no servidor');
        } else if (error.request) {
          // Erro de rede
          throw new Error('Erro de conexão. Verifique se a API está rodando.');
        } else {
          // Erro na configuração da requisição
          throw new Error('Erro na requisição: ' + error.message);
        }
      }
    );
  }

  public static getInstance(): ValuationService {
    if (!ValuationService.instance) {
      ValuationService.instance = new ValuationService();
    }
    return ValuationService.instance;
  }

  /**
   * Obtém análise de valuation para uma ação específica
   */
  async getStockValuation(symbol: string): Promise<ValuationData> {
    try {
      const response = await this.axiosInstance.get<ValuationResponse>(`/valuation/stock/${symbol}`);
      return response.data.valuation;
    } catch (error) {
      console.error(`Erro ao obter valuation para ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Obtém análise de valuation para múltiplas ações
   */
  async getBatchValuation(request: BatchValuationRequest): Promise<BatchValuationResponse> {
    try {
      const response = await this.axiosInstance.post<BatchValuationResponse>('/valuation/stocks/multiple', request);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter valuation em lote:', error);
      throw error;
    }
  }

  /**
   * Obtém ranking de ações por potencial de valorização
   */
  async getValuationRanking(params: ValuationRankingParams): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/valuation/ranking', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter ranking de valuation:', error);
      throw error;
    }
  }

  /**
   * Verifica se a API de valuation está funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/valuation/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Erro no health check da API de valuation:', error);
      return false;
    }
  }

  /**
   * Obtém métodos de valuation disponíveis
   */
  async getValuationMethods(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/valuation/methods');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter métodos de valuation:', error);
      throw error;
    }
  }
}

// Instância singleton do serviço
export const valuationService = ValuationService.getInstance();

// Funções de conveniência para uso direto
export const getStockValuation = (symbol: string) => valuationService.getStockValuation(symbol);
export const getBatchValuation = (request: BatchValuationRequest) => valuationService.getBatchValuation(request);
export const getValuationRanking = (params: ValuationRankingParams) => valuationService.getValuationRanking(params);
export const checkValuationHealth = () => valuationService.healthCheck();
export const getValuationMethods = () => valuationService.getValuationMethods(); 