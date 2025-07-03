import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calculator,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Play,
  RefreshCw,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Sparkles,
  BarChart,
  PieChart,
  LineChart,
  Plus,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  comprehensiveAnalysis, 
  checkPerformanceHealth,
  ModernAnalysisRequest,
  ModernAnalysisResponse,
  PerformanceMetrics,
  PerformanceCharts
} from '@/services/performanceService';

interface AssetInput {
  id: string;
  ticker: string;
  weight: number;
  name?: string;
}

const PerformancePage: React.FC = () => {
  // Estados principais
  const [assets, setAssets] = useState<AssetInput[]>([
    { id: '1', ticker: 'PETR4.SA', weight: 0.3, name: 'Petrobras' },
    { id: '2', ticker: 'VALE3.SA', weight: 0.3, name: 'Vale' },
    { id: '3', ticker: 'ITUB4.SA', weight: 0.4, name: 'Itaú' }
  ]);
  const [period, setPeriod] = useState('2y');
  const [benchmark, setBenchmark] = useState('^BVSP');
  const [riskFreeRate, setRiskFreeRate] = useState(14.75);
  
  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<ModernAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('setup');
  const [selectedChart, setSelectedChart] = useState('cumulative_returns');

  // Opções de configuração
  const periodOptions = [
    { value: '6mo', label: '6 Meses' },
    { value: '1y', label: '1 Ano' },
    { value: '2y', label: '2 Anos' },
    { value: '3y', label: '3 Anos' },
    { value: '5y', label: '5 Anos' }
  ];

  const benchmarkOptions = [
    { value: '^BVSP', label: 'Ibovespa (IBOV)' },
    { value: '^GSPC', label: 'S&P 500' },
    { value: '^IXIC', label: 'NASDAQ' },
    { value: 'IFIX.SA', label: 'IFIX' },
    { value: '^DJI', label: 'Dow Jones' }
  ];

  const chartOptions = [
    // Gráficos principais
    { value: 'cumulative_returns', label: 'Performance Cumulativa', icon: TrendingUp },
    { value: 'drawdown', label: 'Drawdown', icon: TrendingDown },
    { value: 'returns_distribution', label: 'Distribuição de Retornos', icon: BarChart },
    { value: 'portfolio_composition', label: 'Composição do Portfólio', icon: PieChart },
    { value: 'price_evolution', label: 'Evolução dos Preços', icon: LineChart },
    { value: 'rolling_sharpe', label: 'Sharpe Ratio Rolling', icon: Activity },
    
    // Gráficos Pyfolio nativos
    { value: 'rolling_returns_pyfolio', label: 'Rolling Returns (Pyfolio)', icon: RefreshCw },
    { value: 'rolling_sharpe_pyfolio', label: 'Rolling Sharpe (Pyfolio)', icon: Activity },
    { value: 'rolling_beta_pyfolio', label: 'Rolling Beta', icon: TrendingUp },
    { value: 'rolling_volatility_pyfolio', label: 'Rolling Volatility', icon: AlertTriangle },
    { value: 'drawdown_underwater_pyfolio', label: 'Underwater Plot', icon: Minus },
    { value: 'monthly_heatmap_pyfolio', label: 'Monthly Heatmap', icon: Target },
    { value: 'annual_returns_pyfolio', label: 'Annual Returns', icon: BarChart3 },
    { value: 'monthly_distribution_pyfolio', label: 'Monthly Distribution', icon: BarChart },
    { value: 'return_quantiles_pyfolio', label: 'Return Quantiles', icon: LineChart },
    
    // Gráficos customizados adicionais
    { value: 'returns_distribution_advanced', label: 'Distribuição Avançada', icon: BarChart3 },
    { value: 'drawdown_periods_custom', label: 'Períodos de Drawdown', icon: TrendingDown }
  ];

  // Verificar saúde do serviço ao carregar
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkPerformanceHealth();
        setHealthStatus(health.status);
      } catch (error) {
        setHealthStatus('unhealthy');
        console.error('Erro ao verificar saúde do serviço:', error);
      }
    };
    
    checkHealth();
  }, []);

  // Calcular peso total atual
  const totalWeight = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.weight, 0);
  }, [assets]);

  // Validar se o portfólio está pronto para análise
  const isPortfolioValid = useMemo(() => {
    return (
      assets.length > 0 &&
      assets.every(asset => asset.ticker.trim() !== '' && asset.weight > 0) &&
      Math.abs(totalWeight - 1.0) < 0.01
    );
  }, [assets, totalWeight]);

  // Manipuladores de ativos
  const addAsset = useCallback(() => {
    const newAsset: AssetInput = {
      id: Date.now().toString(),
      ticker: '',
      weight: 0,
      name: ''
    };
    setAssets(prev => [...prev, newAsset]);
  }, []);

  const removeAsset = useCallback((id: string) => {
    if (assets.length > 1) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
    }
  }, [assets.length]);

  const updateAsset = useCallback((id: string, field: keyof AssetInput, value: string | number) => {
    setAssets(prev => prev.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  }, []);

  const normalizeWeights = useCallback(() => {
    const total = assets.reduce((sum, asset) => sum + asset.weight, 0);
    if (total > 0) {
      setAssets(prev => prev.map(asset => ({
        ...asset,
        weight: Number((asset.weight / total).toFixed(4))
      })));
    }
  }, [assets]);

  // Executar análise
  const runAnalysis = async () => {
    if (!isPortfolioValid) {
      toast.error('Portfólio inválido. Verifique os tickers e pesos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: ModernAnalysisRequest = {
        tickers: assets.map(asset => asset.ticker),
        weights: assets.map(asset => asset.weight),
        period,
        benchmark,
        risk_free_rate: riskFreeRate / 100 // Converter para decimal
      };

      const result = await comprehensiveAnalysis(request);
      setAnalysisData(result);
      setActiveTab('results');
      
      toast.success('Análise de performance concluída com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro na análise: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Exportar resultados
  const exportResults = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_analysis_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Relatório exportado com sucesso!');
  };

  // Compartilhar resultados
  const shareResults = () => {
    if (!analysisData) return;
    
    const shareText = `Análise de Performance - Portfólio
Retorno Anual: ${(analysisData.performance_metrics.annual_return * 100).toFixed(2)}%
Volatilidade: ${(analysisData.performance_metrics.annual_volatility * 100).toFixed(2)}%
Sharpe Ratio: ${analysisData.performance_metrics.sharpe_ratio.toFixed(3)}
Max Drawdown: ${(analysisData.performance_metrics.max_drawdown * 100).toFixed(2)}%`;

    if (navigator.share) {
      navigator.share({
        title: 'Análise de Performance',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Dados copiados para área de transferência!');
    }
  };

  // Componente de métrica individual
  const MetricCard: React.FC<{
    title: string;
    value: number;
    format: 'percentage' | 'number' | 'ratio';
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    benchmark?: number | null;
  }> = ({ title, value, format, subtitle, trend, benchmark }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'percentage':
          return `${(val * 100).toFixed(2)}%`;
        case 'ratio':
          return val.toFixed(3);
        case 'number':
          return val.toFixed(0);
        default:
          return val.toString();
      }
    };

    const getTrendIcon = () => {
      switch (trend) {
        case 'up':
          return <ArrowUpRight className="h-4 w-4 text-green-500" />;
        case 'down':
          return <ArrowDownRight className="h-4 w-4 text-red-500" />;
        default:
          return <Minus className="h-4 w-4 text-gray-500" />;
      }
    };

    const getTrendColor = () => {
      switch (trend) {
        case 'up':
          return 'text-green-600';
        case 'down':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className={`text-2xl font-bold ${getTrendColor()}`}>
                {formatValue(value)}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {benchmark !== undefined && benchmark !== null && (
                <p className="text-xs text-blue-600">
                  Benchmark: {formatValue(benchmark)}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getTrendIcon()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Análise de Performance
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Análise quantitativa avançada
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Status do serviço */}
          <Badge 
            variant={healthStatus === 'healthy' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            {healthStatus === 'healthy' ? (
              <CheckCircle className="h-3 w-3" />
            ) : healthStatus === 'unhealthy' ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            <span className="text-xs">
              {healthStatus === 'healthy' ? 'Serviço Online' : 
               healthStatus === 'unhealthy' ? 'Serviço Offline' : 'Verificando...'}
            </span>
          </Badge>

          {analysisData && (
            <>
              <Button variant="outline" size="sm" onClick={shareResults}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </>
          )}
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Configuração</TabsTrigger>
          <TabsTrigger value="results" disabled={!analysisData}>Resultados</TabsTrigger>
          <TabsTrigger value="charts" disabled={!analysisData}>Gráficos</TabsTrigger>
        </TabsList>

        {/* Tab de Configuração */}
        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composição do Portfólio */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Composição do Portfólio</span>
                </CardTitle>
                <CardDescription>
                  Configure os ativos e seus respectivos pesos no portfólio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence>
                  {assets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="col-span-5">
                        <Label htmlFor={`ticker-${asset.id}`} className="text-xs text-muted-foreground">
                          Ticker
                        </Label>
                        <Input
                          id={`ticker-${asset.id}`}
                          placeholder="ex: PETR4.SA"
                          value={asset.ticker}
                          onChange={(e) => updateAsset(asset.id, 'ticker', e.target.value.toUpperCase())}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="col-span-4">
                        <Label htmlFor={`weight-${asset.id}`} className="text-xs text-muted-foreground">
                          Peso (0.0 - 1.0)
                        </Label>
                        <Input
                          id={`weight-${asset.id}`}
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          placeholder="0.30"
                          value={asset.weight}
                          onChange={(e) => updateAsset(asset.id, 'weight', Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">%</Label>
                        <div className="mt-1 text-sm font-medium">
                          {(asset.weight * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAsset(asset.id)}
                          disabled={assets.length <= 1}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={addAsset}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Ativo
                    </Button>
                    <Button variant="ghost" onClick={normalizeWeights}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Normalizar Pesos
                    </Button>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total:</p>
                    <p className={`text-lg font-bold ${
                      Math.abs(totalWeight - 1.0) < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(totalWeight * 100).toFixed(1)}%
                    </p>
                    <Progress 
                      value={totalWeight * 100} 
                      className="w-24 mt-1"
                      max={100}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parâmetros de Análise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5" />
                  <span>Parâmetros</span>
                </CardTitle>
                <CardDescription>
                  Configure os parâmetros da análise
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Período de Análise</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benchmark">Benchmark</Label>
                  <Select value={benchmark} onValueChange={setBenchmark}>
                    <SelectTrigger id="benchmark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {benchmarkOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk-free-rate">Taxa Livre de Risco (%)</Label>
                  <Input
                    id="risk-free-rate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.25"
                    value={riskFreeRate}
                    onChange={(e) => setRiskFreeRate(Number(e.target.value))}
                    placeholder="14.75"
                  />
                  <p className="text-xs text-muted-foreground">
                    Taxa Selic atual: 14,75% a.a.
                  </p>
                </div>

                <Separator />

                <Button 
                  onClick={runAnalysis}
                  disabled={!isPortfolioValid || loading || healthStatus !== 'healthy'}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Analisando...' : 'Executar Análise'}
                </Button>

                {!isPortfolioValid && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Verifique se todos os ativos têm tickers válidos e os pesos somam 100%.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Resultados */}
        <TabsContent value="results">
          {analysisData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Resumo do Portfólio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>Resumo da Análise</span>
                  </CardTitle>
                  <CardDescription>
                    Período: {new Date(analysisData.analysis_period.start_date).toLocaleDateString('pt-BR')} até {new Date(analysisData.analysis_period.end_date).toLocaleDateString('pt-BR')} 
                    ({analysisData.analysis_period.total_days} dias)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {analysisData.portfolio_composition.map((asset, index) => (
                      <div key={asset.ticker} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-3 h-3 rounded-full" style={{
                          backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)`
                        }} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">{asset.ticker}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{(asset.weight * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Retorno Anual"
                  value={analysisData.performance_metrics.annual_return}
                  format="percentage"
                  trend={analysisData.performance_metrics.annual_return > 0 ? 'up' : 'down'}
                  benchmark={analysisData.performance_metrics.benchmark_annual_return}
                />
                
                <MetricCard
                  title="Volatilidade Anual"
                  value={analysisData.performance_metrics.annual_volatility}
                  format="percentage"
                  trend={analysisData.performance_metrics.annual_volatility < 0.2 ? 'up' : 'down'}
                  benchmark={analysisData.performance_metrics.benchmark_volatility}
                />
                
                <MetricCard
                  title="Sharpe Ratio"
                  value={analysisData.performance_metrics.sharpe_ratio}
                  format="ratio"
                  trend={analysisData.performance_metrics.sharpe_ratio > 1 ? 'up' : 
                         analysisData.performance_metrics.sharpe_ratio > 0 ? 'neutral' : 'down'}
                  benchmark={analysisData.performance_metrics.benchmark_sharpe}
                />
                
                <MetricCard
                  title="Max Drawdown"
                  value={analysisData.performance_metrics.max_drawdown}
                  format="percentage"
                  trend={analysisData.performance_metrics.max_drawdown > -0.1 ? 'up' : 'down'}
                  benchmark={analysisData.performance_metrics.benchmark_max_drawdown}
                />
              </div>

              {/* Métricas Avançadas COMPLETAS */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Métricas de Retorno</span>
                    </CardTitle>
                    <CardDescription>
                      Análise completa de retornos usando empyrical-reloaded
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CAGR:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.cagr * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Retorno Cumulativo:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.cumulative_return * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Retorno Médio:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.simple_returns_mean * 100).toFixed(3)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Métricas de Risco</span>
                    </CardTitle>
                    <CardDescription>
                      Análise completa de risco e volatilidade
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <h5 className="font-semibold text-sm text-red-600">VaR & CVaR</h5>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VaR 95%:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.value_at_risk_95 * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VaR 99%:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.value_at_risk_99 * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CVaR 95%:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.conditional_value_at_risk_95 * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CVaR 99%:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.conditional_value_at_risk_99 * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h5 className="font-semibold text-sm text-orange-600">Drawdown</h5>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.max_drawdown * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Downside Risk:</span>
                          <span className="font-mono font-medium">{(analysisData.performance_metrics.downside_risk * 100).toFixed(2)}%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-semibold text-sm text-purple-600">Estatísticas</h5>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Skewness:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.skewness.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Kurtosis:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.kurtosis.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tail Ratio:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.tail_ratio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Stability:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.stability_of_timeseries.toFixed(3)}</span>
                        </div>
                      </div>

                      {/* Métricas GPD se disponíveis */}
                      {(analysisData.performance_metrics.gpd_var_estimate || analysisData.performance_metrics.gpd_es_estimate) && (
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-indigo-600">GPD Estimates</h5>
                          {analysisData.performance_metrics.gpd_var_estimate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">GPD VaR:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.gpd_var_estimate * 100).toFixed(2)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.gpd_es_estimate && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">GPD ES:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.gpd_es_estimate * 100).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Métricas de Risco-Retorno</span>
                    </CardTitle>
                    <CardDescription>
                      Índices de performance ajustados ao risco
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sharpe Ratio:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.sharpe_ratio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sortino Ratio:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.sortino_ratio.toFixed(3)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Calmar Ratio:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.calmar_ratio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Omega Ratio:</span>
                          <span className="font-mono font-medium">{analysisData.performance_metrics.omega_ratio.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Métricas vs Benchmark COMPLETAS */}
                {analysisData.performance_metrics.alpha !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Análise vs Benchmark</span>
                      </CardTitle>
                      <CardDescription>
                        Métricas comparativas contra o benchmark selecionado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-green-600">Alpha & Beta</h5>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Alpha:</span>
                            <span className="font-mono font-medium">{(analysisData.performance_metrics.alpha! * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Beta:</span>
                            <span className="font-mono font-medium">{analysisData.performance_metrics.beta!.toFixed(3)}</span>
                          </div>
                          {analysisData.performance_metrics.beta_fragility_heuristic && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Beta Fragility:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.beta_fragility_heuristic.toFixed(3)}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-blue-600">Captura</h5>
                          {analysisData.performance_metrics.up_capture && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Up Capture:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.up_capture * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.down_capture && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Down Capture:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.down_capture * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.capture_ratio && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Capture Ratio:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.capture_ratio.toFixed(3)}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-purple-600">Tracking</h5>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tracking Error:</span>
                            <span className="font-mono font-medium">{(analysisData.performance_metrics.tracking_error! * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Information Ratio:</span>
                            <span className="font-mono font-medium">{analysisData.performance_metrics.information_ratio!.toFixed(3)}</span>
                          </div>
                          {analysisData.performance_metrics.excess_sharpe && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Excess Sharpe:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.excess_sharpe.toFixed(3)}</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.batting_average && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Batting Average:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.batting_average * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>

                        {/* Alpha/Beta Up/Down se disponíveis */}
                        {(analysisData.performance_metrics.up_alpha || analysisData.performance_metrics.down_alpha) && (
                          <div className="space-y-3">
                            <h5 className="font-semibold text-sm text-indigo-600">Up/Down Analysis</h5>
                            {analysisData.performance_metrics.up_alpha && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Up Alpha:</span>
                                <span className="font-mono font-medium">{(analysisData.performance_metrics.up_alpha * 100).toFixed(2)}%</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.up_beta && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Up Beta:</span>
                                <span className="font-mono font-medium">{analysisData.performance_metrics.up_beta.toFixed(3)}</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.down_alpha && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Down Alpha:</span>
                                <span className="font-mono font-medium">{(analysisData.performance_metrics.down_alpha * 100).toFixed(2)}%</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.down_beta && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Down Beta:</span>
                                <span className="font-mono font-medium">{analysisData.performance_metrics.down_beta.toFixed(3)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Métricas Rolling se disponíveis */}
                {(analysisData.performance_metrics.roll_sharpe_ratio_30d || 
                  analysisData.performance_metrics.roll_alpha_30d) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <RefreshCw className="h-5 w-5" />
                        <span>Métricas Rolling (30 dias)</span>
                      </CardTitle>
                      <CardDescription>
                        Métricas calculadas em janela móvel de 30 dias
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-blue-600">Performance</h5>
                          {analysisData.performance_metrics.roll_sharpe_ratio_30d && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Sharpe Rolling:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.roll_sharpe_ratio_30d.toFixed(3)}</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.roll_sortino_ratio_30d && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Sortino Rolling:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.roll_sortino_ratio_30d.toFixed(3)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-red-600">Risco</h5>
                          {analysisData.performance_metrics.roll_annual_volatility_30d && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Volatilidade Rolling:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.roll_annual_volatility_30d * 100).toFixed(2)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.roll_max_drawdown_30d && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Drawdown Rolling:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.roll_max_drawdown_30d * 100).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>

                        {(analysisData.performance_metrics.roll_alpha_30d || 
                          analysisData.performance_metrics.roll_beta_30d) && (
                          <div className="space-y-3">
                            <h5 className="font-semibold text-sm text-green-600">vs Benchmark</h5>
                            {analysisData.performance_metrics.roll_alpha_30d && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Alpha Rolling:</span>
                                <span className="font-mono font-medium">{(analysisData.performance_metrics.roll_alpha_30d * 100).toFixed(2)}%</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.roll_beta_30d && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Beta Rolling:</span>
                                <span className="font-mono font-medium">{analysisData.performance_metrics.roll_beta_30d.toFixed(3)}</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.roll_up_capture_30d && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Up Capture Rolling:</span>
                                <span className="font-mono font-medium">{(analysisData.performance_metrics.roll_up_capture_30d * 100).toFixed(1)}%</span>
                              </div>
                            )}
                            {analysisData.performance_metrics.roll_down_capture_30d && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Down Capture Rolling:</span>
                                <span className="font-mono font-medium">{(analysisData.performance_metrics.roll_down_capture_30d * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Métricas de Agregação se disponíveis */}
                {(analysisData.performance_metrics.monthly_returns_count || 
                  analysisData.performance_metrics.best_month) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart className="h-5 w-5" />
                        <span>Análise Temporal</span>
                      </CardTitle>
                      <CardDescription>
                        Estatísticas agregadas por períodos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-blue-600">Períodos</h5>
                          {analysisData.performance_metrics.monthly_returns_count && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Meses:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.monthly_returns_count}</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.yearly_returns_count && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Anos:</span>
                              <span className="font-mono font-medium">{analysisData.performance_metrics.yearly_returns_count}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-green-600">Melhor</h5>
                          {analysisData.performance_metrics.best_month && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Melhor Mês:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.best_month * 100).toFixed(2)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.best_year && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Melhor Ano:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.best_year * 100).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-red-600">Pior</h5>
                          {analysisData.performance_metrics.worst_month && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Pior Mês:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.worst_month * 100).toFixed(2)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.worst_year && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Pior Ano:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.worst_year * 100).toFixed(2)}%</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-purple-600">Consistência</h5>
                          {analysisData.performance_metrics.positive_months_pct && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Meses Positivos:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.positive_months_pct * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {analysisData.performance_metrics.positive_years_pct && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Anos Positivos:</span>
                              <span className="font-mono font-medium">{(analysisData.performance_metrics.positive_years_pct * 100).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Tab de Gráficos */}
        <TabsContent value="charts">
          {analysisData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Seletor de Gráficos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Visualizações</span>
                  </CardTitle>
                  <CardDescription>
                    Gráficos gerados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-600 mb-3">Visão Geral de Performance	</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {chartOptions.slice(0, 6).map(option => (
                          <Button
                            key={option.value}
                            variant={selectedChart === option.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChart(option.value)}
                            className="h-auto flex flex-col items-center space-y-1 p-3"
                          >
                            <option.icon className="h-4 w-4" />
                            <span className="text-xs text-center">{option.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-green-600 mb-3">Análises Dinâmicas	</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {chartOptions.slice(6, 15).map(option => (
                          <Button
                            key={option.value}
                            variant={selectedChart === option.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChart(option.value)}
                            className="h-auto flex flex-col items-center space-y-1 p-3"
                          >
                            <option.icon className="h-4 w-4" />
                            <span className="text-xs text-center">{option.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-purple-600 mb-3">Análises Avançadas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {chartOptions.slice(15).map(option => (
                          <Button
                            key={option.value}
                            variant={selectedChart === option.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedChart(option.value)}
                            className="h-auto flex flex-col items-center space-y-1 p-3"
                          >
                            <option.icon className="h-4 w-4" />
                            <span className="text-xs text-center">{option.label}</span>
                          </Button>
                        ))}
                                             </div>
                     </div>
                   </div>
                </CardContent>
              </Card>

              {/* Gráfico Selecionado */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {(() => {
                      const selectedOption = chartOptions.find(opt => opt.value === selectedChart);
                      return selectedOption?.icon ? <selectedOption.icon className="h-5 w-5" /> : null;
                    })()}
                    <span>{chartOptions.find(opt => opt.value === selectedChart)?.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    {analysisData.charts[selectedChart as keyof PerformanceCharts] ? (
                      <img
                        src={analysisData.charts[selectedChart as keyof PerformanceCharts]}
                        alt={chartOptions.find(opt => opt.value === selectedChart)?.label}
                        className="max-w-full h-auto rounded-lg border shadow-sm"
                        style={{ maxHeight: '600px' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="text-center">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>Gráfico não disponível</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Erro nos gráficos */}
              {analysisData.charts.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Erro na geração dos gráficos: {analysisData.charts.error}
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformancePage; 