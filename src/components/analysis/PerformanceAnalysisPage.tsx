import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Target,
  Shield,
  Zap,
  Download,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Info,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Maximize2,
  MinusSquare,
  PlusSquare,
  Eye,
  EyeOff,
  Globe,
  Layers,
  MousePointer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Share2,
  XCircle,
  Sparkles,
  BarChart,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  comprehensiveAnalysis, 
  checkPerformanceHealth,
  ModernAnalysisRequest,
  ModernAnalysisResponse,
  PerformanceMetrics,
  PerformanceCharts
} from '@/services/performanceService';

// Interfaces
interface PortfolioAsset {
  ticker: string;
  weight: number;
  name?: string;
  sector?: string;
}

interface PerformanceMetrics {
  annual_return: number;
  cumulative_return: number;
  annual_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  avg_drawdown: number;
  skewness: number;
  kurtosis: number;
  value_at_risk: number;
  conditional_value_at_risk: number;
  alpha?: number;
  beta?: number;
  tracking_error?: number;
  information_ratio?: number;
  stability_of_timeseries: number;
  periods: number;
  start_date: string;
  end_date: string;
}

interface AnalysisConfig {
  portfolio: PortfolioAsset[];
  benchmark: string;
  riskFreeRate: number;
  periodMonths: number;
  includeTearsheet: boolean;
  includeRollingMetrics: boolean;
  rollingWindow: number;
}

interface RollingMetric {
  date: string;
  sharpe_ratio: number;
  volatility: number;
  max_drawdown: number;
}

interface StrategyComparison {
  name: string;
  annual_return: number;
  annual_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  sortino_ratio: number;
}

const PerformanceAnalysisPage: React.FC = () => {
  // Estados principais
  const [assets, setAssets] = useState<PortfolioAsset[]>([
    { ticker: 'PETR4.SA', weight: 0.3, name: 'Petrobras' },
    { ticker: 'VALE3.SA', weight: 0.3, name: 'Vale' },
    { ticker: 'ITUB4.SA', weight: 0.4, name: 'Itaú' }
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
  const [activeTab, setActiveTab] = useState('overview');
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
    { value: 'cumulative_returns', label: 'Performance Cumulativa', icon: TrendingUp },
    { value: 'drawdown', label: 'Drawdown', icon: TrendingDown },
    { value: 'returns_distribution', label: 'Distribuição de Retornos', icon: BarChart },
    { value: 'portfolio_composition', label: 'Composição do Portfólio', icon: PieChart },
    { value: 'price_evolution', label: 'Evolução dos Preços', icon: LineChart },
    { value: 'rolling_sharpe', label: 'Sharpe Ratio Rolling', icon: Activity }
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
    const newAsset: PortfolioAsset = {
      ticker: '',
      weight: 0,
      name: ''
    };
    setAssets(prev => [...prev, newAsset]);
  }, []);

  const removeAsset = useCallback((ticker: string) => {
    if (assets.length > 1) {
      setAssets(prev => prev.filter(asset => asset.ticker !== ticker));
    }
  }, [assets.length]);

  const updateAsset = useCallback((ticker: string, field: keyof PortfolioAsset, value: string | number) => {
    setAssets(prev => prev.map(asset => 
      asset.ticker === ticker ? { ...asset, [field]: value } : asset
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
    benchmark?: number;
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
            {benchmark !== undefined && (
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
    <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
            <div>
          <h1 className="text-3xl font-bold gradient-text bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Análise de Performance
              </h1>
              <p className="text-muted-foreground mt-2">
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
                {assets.map((asset, index) => (
                  <motion.div
                    key={asset.ticker}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg"
                  >
                    <div className="col-span-5">
                      <Label htmlFor={`ticker-${asset.ticker}`} className="text-xs text-muted-foreground">
                        Ticker
                  </Label>
                      <Input
                        id={`ticker-${asset.ticker}`}
                        placeholder="ex: PETR4.SA"
                        value={asset.ticker}
                        onChange={(e) => updateAsset(asset.ticker, 'ticker', e.target.value.toUpperCase())}
                        className="mt-1"
                  />
                </div>

                    <div className="col-span-4">
                      <Label htmlFor={`weight-${asset.ticker}`} className="text-xs text-muted-foreground">
                        Peso (0.0 - 1.0)
                  </Label>
                      <Input
                        id={`weight-${asset.ticker}`}
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        placeholder="0.30"
                        value={asset.weight}
                        onChange={(e) => updateAsset(asset.ticker, 'weight', Number(e.target.value))}
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
                        onClick={() => removeAsset(asset.ticker)}
                        disabled={assets.length <= 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={addAsset}>
                    Adicionar Ativo
                  </Button>
                    <Button variant="ghost" onClick={normalizeWeights}>
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
                    Período: {analysisData.analysis_period.start_date} até {analysisData.analysis_period.end_date} 
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

              {/* Métricas Avançadas */}
                  <Card>
                    <CardHeader>
                  <CardTitle>Métricas Avançadas</CardTitle>
                          <CardDescription>
                    Análise detalhada de risco e performance
                          </CardDescription>
                    </CardHeader>
                    <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Métricas de Risco-Retorno */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Risco-Retorno</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sortino Ratio:</span>
                          <span className="font-mono">{analysisData.performance_metrics.sortino_ratio.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Calmar Ratio:</span>
                          <span className="font-mono">{analysisData.performance_metrics.calmar_ratio.toFixed(3)}</span>
                                </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Omega Ratio:</span>
                          <span className="font-mono">{analysisData.performance_metrics.omega_ratio.toFixed(3)}</span>
                              </div>
                                </div>
                              </div>

                    {/* Métricas de Risco */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Risco</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VaR (5%):</span>
                          <span className="font-mono">{(analysisData.performance_metrics.value_at_risk * 100).toFixed(2)}%</span>
                                </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CVaR (5%):</span>
                          <span className="font-mono">{(analysisData.performance_metrics.conditional_value_at_risk * 100).toFixed(2)}%</span>
                              </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Downside Risk:</span>
                          <span className="font-mono">{(analysisData.performance_metrics.downside_risk * 100).toFixed(2)}%</span>
                        </div>
                               </div>
                               </div>

                    {/* Métricas vs Benchmark */}
                    {analysisData.performance_metrics.alpha !== null && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">vs Benchmark</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Alpha:</span>
                            <span className="font-mono">{(analysisData.performance_metrics.alpha! * 100).toFixed(2)}%</span>
                              </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Beta:</span>
                            <span className="font-mono">{analysisData.performance_metrics.beta!.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tracking Error:</span>
                            <span className="font-mono">{(analysisData.performance_metrics.tracking_error! * 100).toFixed(2)}%</span>
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
                  <CardTitle>Visualizações</CardTitle>
                  <CardDescription>
                    Gráficos gerados 
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {chartOptions.map(option => (
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

export default PerformanceAnalysisPage; 