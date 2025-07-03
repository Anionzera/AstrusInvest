import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Loader2, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Activity,
  RefreshCw,
  Download,
  Eye,
  Zap,
  LineChart,
  Layers
} from 'lucide-react';
import { toast } from '../../ui/use-toast';
import PlotlyChart from '../PlotlyChart';

/**
 * 🎨 SKFOLIO CHARTS - SISTEMA COMPLETO DE VISUALIZAÇÕES
 * 
 * Este módulo contém todas as visualizações avançadas do SKFolio:
 * 
 * 📊 GRÁFICOS PRINCIPAIS (10 tipos):
 * 
 * 1. 🥧 ALLOCATION PIE
 *    - Gráfico de pizza com alocação dos ativos
 *    - Mostra distribuição de pesos do portfólio
 *    - Filtros para pesos significativos (>1%)
 * 
 * 2. 🔥 CORRELATION HEATMAP  
 *    - Matriz de correlação entre ativos
 *    - Escala de cores RdBu (vermelho-azul)
 *    - Valores numéricos nas células
 * 
 * 3. 📈 RETURNS DISTRIBUTION
 *    - Análise completa com 4 subplots:
 *      * Histograma de retornos
 *      * Box plot dos retornos  
 *      * Retornos acumulados vs benchmark
 *      * Q-Q plot para normalidade
 * 
 * 4. 🎯 EFFICIENT FRONTIER
 *    - Fronteira eficiente risco-retorno
 *    - Portfólio otimizado destacado
 *    - Capital Market Line (CML)
 *    - Ativos individuais plotados
 * 
 * 5. 🎯 RISK-RETURN SCATTER  
 *    - Análise individual por ativo
 *    - Tamanho = peso no portfólio
 *    - Cor = contribuição para o risco
 *    - Tooltips com informações detalhadas
 * 
 * 6. 📈 CUMULATIVE RETURNS
 *    - Retornos cumulativos vs benchmark
 *    - Retornos mensais em barras
 *    - Análise temporal completa
 * 
 * 7. 📉 DRAWDOWN CHART
 *    - Evolução vs máximo histórico
 *    - Períodos de drawdown destacados
 *    - Estatísticas de perda máxima
 * 
 * 8. 🎯 PERFORMANCE ATTRIBUTION
 *    - Contribuição de cada ativo para retorno
 *    - Contribuição para risco
 *    - Análise de eficiência (retorno/risco)
 *    - Decomposição Sharpe Ratio
 * 
 * 9. 📊 ROLLING METRICS
 *    - Métricas móveis por janela temporal:
 *      * Retorno móvel anualizado
 *      * Volatilidade móvel  
 *      * Sharpe Ratio móvel
 *      * Beta móvel (se há benchmark)
 * 
 * 10. 🌡️ VOLATILITY SURFACE
 *     - Superfície 3D de volatilidade
 *     - Múltiplas janelas temporais (5d a 252d)
 *     - Heatmap com evolução temporal
 * 
 * 🚀 TECNOLOGIAS:
 * - Plotly.js para gráficos interativos
 * - Subplots para análises complexas
 * - Responsive design
 * - Tooltips avançados
 * - Exportação automática para HTML
 * 
 * 🎨 PALETA DE CORES:
 * - Set3 para diversidade
 * - Viridis para superfícies
 * - RdBu para correlações
 * - Verde/Vermelho para performance
 * 
 * 📐 DIMENSÕES OTIMIZADAS:
 * - 400-500px: Gráficos simples
 * - 600-700px: Análises com subplots
 * - 800px: Análises complexas (drawdown)
 * 
 * 🔧 CONFIGURAÇÕES:
 * - DisplayModeBar: true (para interatividade)
 * - Responsive: true (mobile-friendly)
 * - Config avançado por tipo
 */

interface ChartInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  height: number;
  features: string[];
}

export const SKFOLIO_CHARTS: ChartInfo[] = [
  {
    id: 'allocation_pie',
    name: 'Alocação do Portfólio',
    description: 'Distribuição de pesos por ativo em formato de pizza',
    type: 'pie',
    height: 400,
    features: ['Donut chart', 'Filtro >1%', 'Percentuais', 'Cores Set3']
  },
  {
    id: 'correlation_heatmap',
    name: 'Matriz de Correlação',
    description: 'Correlação entre todos os ativos do portfólio',
    type: 'heatmap',
    height: 500,
    features: ['RdBu colorscale', 'Valores numéricos', 'Simétrica', 'Hover info']
  },
  {
    id: 'returns_distribution',
    name: 'Análise de Retornos',
    description: 'Análise completa da distribuição de retornos',
    type: 'subplots',
    height: 700,
    features: ['4 subplots', 'Histograma', 'Box plot', 'Q-Q plot', 'Benchmark']
  },
  {
    id: 'efficient_frontier',
    name: 'Fronteira Eficiente',
    description: 'Fronteira de eficiência e Capital Market Line',
    type: 'scatter',
    height: 500,
    features: ['Portfólio otimizado', 'CML', 'Ativos individuais', 'Sharpe info']
  },
  {
    id: 'risk_return_scatter',
    name: 'Risco-Retorno por Ativo',
    description: 'Análise individual com peso proporcional',
    type: 'scatter',
    height: 500,
    features: ['Tamanho = peso', 'Colorscale', 'Tooltips detalhados', 'Contribuições']
  },
  {
    id: 'cumulative_returns',
    name: 'Retornos Cumulativos',
    description: 'Evolução temporal vs benchmark',
    type: 'subplots',
    height: 700,
    features: ['2 subplots', 'Retornos acumulados', 'Barras mensais', 'Benchmark']
  },
  {
    id: 'drawdown_chart',
    name: 'Análise de Drawdown',
    description: 'Perdas máximas e períodos de recuperação',
    type: 'subplots',
    height: 600,
    features: ['Valor vs máximo', 'Drawdown %', 'Períodos destacados', 'Estatísticas']
  },
  {
    id: 'performance_attribution',
    name: 'Atribuição de Performance',
    description: 'Contribuição individual para retorno e risco',
    type: 'subplots',
    height: 700,
    features: ['4 subplots', 'Retorno contrib.', 'Risco contrib.', 'Eficiência', 'Sharpe decomp.']
  },
  {
    id: 'rolling_metrics',
    name: 'Métricas Móveis',
    description: 'Evolução temporal das métricas de risco-retorno',
    type: 'subplots',
    height: 600,
    features: ['4 subplots', 'Retorno móvel', 'Vol. móvel', 'Sharpe móvel', 'Beta/VaR']
  },
  {
    id: 'volatility_surface',
    name: 'Superfície de Volatilidade',
    description: 'Volatilidade por diferentes janelas temporais',
    type: 'heatmap',
    height: 500,
    features: ['9 janelas', '5d-252d', 'Viridis colors', 'Temporal evolution']
  }
];

/**
 * 🔍 ESTATÍSTICAS DO SISTEMA:
 */
export const CHART_STATS = {
  total_charts: SKFOLIO_CHARTS.length,
  types: ['pie', 'heatmap', 'scatter', 'subplots'],
  avg_height: Math.round(SKFOLIO_CHARTS.reduce((sum, chart) => sum + chart.height, 0) / SKFOLIO_CHARTS.length),
  total_features: SKFOLIO_CHARTS.reduce((sum, chart) => sum + chart.features.length, 0),
  complex_charts: SKFOLIO_CHARTS.filter(c => c.type === 'subplots').length
};

interface ChartData {
  allocation_pie?: string;
  efficient_frontier?: string;
  correlation_heatmap?: string;
  returns_distribution?: string;
  cumulative_returns?: string;
  risk_metrics?: string;
}

interface PortfolioData {
  success: boolean;
  charts: ChartData;
  portfolio_metrics: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
  assets_info: Array<{
    symbol: string;
    weight: number;
  }>;
}

const AIPortfolioCharts: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'AAPL', 'TSLA']);
  const [period, setPeriod] = useState<string>('2y');
  const [optimizationType, setOptimizationType] = useState<string>('mean_risk');

  const generateCharts = async () => {
    if (selectedSymbols.length < 2) {
      toast({
        title: "Símbolos Insuficientes",
        description: "Selecione pelo menos 2 ativos para gerar visualizações",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/skfolio/brazilian-stocks/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols: selectedSymbols,
          period: period,
          optimization_type: optimizationType,
          include_charts: true,
          config: {
            risk_measure: 'VARIANCE',
            solver: 'CLARABEL',
            min_weights: 0.05,
            max_weights: 0.40
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPortfolioData(data);
        toast({
          title: "🎨 Visualizações Geradas!",
          description: `Gráficos criados para ${data.assets_info.length} ativos`,
        });
      } else {
        throw new Error(data.error || 'Erro ao gerar visualizações');
      }
    } catch (error) {
      console.error('Erro ao gerar gráficos:', error);
      toast({
        title: "Erro nas Visualizações",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadChart = (chartType: string) => {
    toast({
      title: "Download Iniciado",
      description: `Baixando gráfico: ${chartType}`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Analytics & Visualizações
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Visualizações interativas avançadas para análise quantitativa de portfólios
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <LineChart className="h-4 w-4 mr-2" />
          Plotly Analytics
        </Badge>
      </div>

      {/* Controles */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Layers className="h-5 w-5" />
            Configurações de Visualização
          </CardTitle>
          <CardDescription className="text-indigo-700">
            Configure os parâmetros para gerar visualizações personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-indigo-900">Período de Análise</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1y">1 ano</SelectItem>
                  <SelectItem value="2y">2 anos</SelectItem>
                  <SelectItem value="3y">3 anos</SelectItem>
                  <SelectItem value="5y">5 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-indigo-900">Algoritmo de Otimização</label>
              <Select value={optimizationType} onValueChange={setOptimizationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Algoritmos Principais */}
                  <SelectItem value="mean_risk">🎯 Mean-Risk (Markowitz)</SelectItem>
                  <SelectItem value="risk_budgeting">⚖️ Risk Budgeting</SelectItem>
                  
                  {/* Algoritmos Hierárquicos */}
                  <SelectItem value="hrp">🌳 Hierarchical Risk Parity (HRP)</SelectItem>
                  <SelectItem value="herc">🔗 Hierarchical Equal Risk Contribution (HERC)</SelectItem>
                  <SelectItem value="nested_clusters">🎪 Nested Clusters Optimization (NCO)</SelectItem>
                  
                  {/* Modelos Baseados em Fatores */}
                  <SelectItem value="black_litterman">🧠 Black-Litterman</SelectItem>
                  <SelectItem value="factor_model">📊 Factor Model</SelectItem>
                  <SelectItem value="black_litterman_factor">🤖 Black-Litterman + Factor Model</SelectItem>
                  
                  {/* Otimização Robusta */}
                  <SelectItem value="distributionally_robust_cvar">🛡️ Distributionally Robust CVaR</SelectItem>
                  
                  {/* Métodos de Diversificação */}
                  <SelectItem value="max_diversification">🌟 Maximum Diversification</SelectItem>
                  <SelectItem value="equal_weighted">⚖️ Equal Weighted</SelectItem>
                  <SelectItem value="inverse_volatility">📉 Inverse Volatility</SelectItem>
                  
                  {/* Técnicas Avançadas de IA */}
                  <SelectItem value="entropy_pooling">🎲 Entropy Pooling</SelectItem>
                  <SelectItem value="opinion_pooling">💭 Opinion Pooling</SelectItem>
                  <SelectItem value="stacking">🏗️ Stacking Optimization (Ensemble)</SelectItem>
                  
                  {/* Dados Sintéticos */}
                  <SelectItem value="synthetic_data">🔬 Synthetic Data Generation</SelectItem>
                  
                  {/* Model Selection & Validação */}
                  <SelectItem value="grid_search">🔍 Grid Search + Cross Validation</SelectItem>
                  <SelectItem value="randomized_search">🎰 Randomized Search</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateCharts} 
                disabled={isLoading || selectedSymbols.length < 2}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Gerar Visualizações
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Símbolos Selecionados */}
          <div>
            <label className="text-sm font-medium text-indigo-900">Ativos Selecionados</label>
            <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg bg-white min-h-[50px]">
              {selectedSymbols.map((symbol) => (
                <Badge 
                  key={symbol} 
                  variant="secondary" 
                  className="bg-indigo-100 text-indigo-800 border-indigo-200"
                >
                  {symbol}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualizações */}
      {portfolioData && (
        <Tabs defaultValue="allocation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-indigo-100 to-purple-100 p-1 rounded-xl">
            <TabsTrigger 
              value="allocation" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
            >
              <PieChart className="h-4 w-4" />
              Alocação
            </TabsTrigger>
            <TabsTrigger 
              value="correlation" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
            >
              <Layers className="h-4 w-4" />
              Correlação
            </TabsTrigger>
            <TabsTrigger 
              value="returns" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
            >
              <TrendingUp className="h-4 w-4" />
              Retornos
            </TabsTrigger>
            <TabsTrigger 
              value="frontier" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
            >
              <BarChart3 className="h-4 w-4" />
              Fronteira
            </TabsTrigger>
          </TabsList>

          {/* Métricas Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                <div className="text-sm font-medium text-emerald-700">Retorno</div>
                <div className="text-xl font-bold text-emerald-900">
                  {(portfolioData.portfolio_metrics.expected_return * 100).toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-medium text-blue-700">Volatilidade</div>
                <div className="text-xl font-bold text-blue-900">
                  {(portfolioData.portfolio_metrics.volatility * 100).toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium text-purple-700">Sharpe</div>
                <div className="text-xl font-bold text-purple-900">
                  {portfolioData.portfolio_metrics.sharpe_ratio.toFixed(3)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-600 rotate-180" />
                <div className="text-sm font-medium text-red-700">Max DD</div>
                <div className="text-xl font-bold text-red-900">
                  {(portfolioData.portfolio_metrics.max_drawdown * 100).toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab: Alocação */}
          <TabsContent value="allocation" className="space-y-6">
            {portfolioData.charts.allocation_pie ? (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Alocação do Portfólio Otimizado
                    <Button variant="outline" size="sm" onClick={() => downloadChart('allocation')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Distribuição otimizada dos ativos no portfólio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    htmlContent={portfolioData.charts.allocation_pie}
                    chartId="allocation-pie-chart"
                    style={{ height: '500px' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Gráfico de alocação não disponível. Tente gerar novamente.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Correlação */}
          <TabsContent value="correlation" className="space-y-6">
            {portfolioData.charts.correlation_heatmap ? (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Matriz de Correlação dos Ativos
                    <Button variant="outline" size="sm" onClick={() => downloadChart('correlation')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Análise de correlação entre os ativos do portfólio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    htmlContent={portfolioData.charts.correlation_heatmap}
                    chartId="correlation-heatmap-chart"
                    style={{ height: '500px' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Matriz de correlação não disponível. Tente gerar novamente.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Retornos */}
          <TabsContent value="returns" className="space-y-6">
            {portfolioData.charts.returns_distribution ? (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Análise de Retornos do Portfólio
                    <Button variant="outline" size="sm" onClick={() => downloadChart('returns')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Distribuição e evolução dos retornos do portfólio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    htmlContent={portfolioData.charts.returns_distribution}
                    chartId="returns-distribution-chart"
                    style={{ height: '500px' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Análise de retornos não disponível. Tente gerar novamente.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Fronteira */}
          <TabsContent value="frontier" className="space-y-6">
            {portfolioData.charts.efficient_frontier ? (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Análise Risco vs Retorno
                    <Button variant="outline" size="sm" onClick={() => downloadChart('frontier')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Posicionamento do portfólio otimizado no espaço risco-retorno
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    htmlContent={portfolioData.charts.efficient_frontier}
                    chartId="efficient-frontier-chart"
                    style={{ height: '500px' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Gráfico risco-retorno não disponível. Tente gerar novamente.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Estado Inicial */}
      {!portfolioData && !isLoading && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Visualizações Aguardando</h3>
            <p className="text-muted-foreground mb-4">
              Configure os parâmetros e clique em "Gerar Visualizações" para criar gráficos interativos.
            </p>
            <Button variant="outline" onClick={generateCharts} disabled={selectedSymbols.length < 2}>
              <Zap className="h-4 w-4 mr-2" />
              Gerar Primeira Visualização
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIPortfolioCharts; 