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
  const [isLoading, setIsLoading] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    portfolio: [
      { ticker: 'PETR4.SA', weight: 0.25, name: 'Petrobras', sector: 'Energy' },
      { ticker: 'VALE3.SA', weight: 0.25, name: 'Vale', sector: 'Materials' },
      { ticker: 'ITUB4.SA', weight: 0.25, name: 'Itaú', sector: 'Financial' },
      { ticker: 'BBDC4.SA', weight: 0.25, name: 'Bradesco', sector: 'Financial' },
    ],
    benchmark: '^BVSP',
    riskFreeRate: 0.0525,
    periodMonths: 12,
    includeTearsheet: true,
    includeRollingMetrics: true,
    rollingWindow: 63,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [rollingMetrics, setRollingMetrics] = useState<RollingMetric[]>([]);
  const [tearsheetImage, setTearsheetImage] = useState<string | null>(null);
  const [strategyComparison, setStrategyComparison] = useState<StrategyComparison[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Estados para controle da UI
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set([
    'sharpe_ratio', 'annual_return', 'annual_volatility', 'max_drawdown'
  ]));

  // Benchmarks disponíveis
  const benchmarks = [
    { value: '^BVSP', label: 'Ibovespa (BVSP)', flag: '🇧🇷' },
    { value: '^SMLL', label: 'Small Caps (SMLL)', flag: '🇧🇷' },
    { value: '^IFIX', label: 'IFIX (Real Estate)', flag: '🇧🇷' },
    { value: '^GSPC', label: 'S&P 500', flag: '🇺🇸' },
    { value: '^DJI', label: 'Dow Jones', flag: '🇺🇸' },
    { value: '^IXIC', label: 'NASDAQ', flag: '🇺🇸' },
    { value: 'EEM', label: 'Emerging Markets ETF', flag: '🌎' },
  ];

  // Cores para gráficos
  const chartColors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    secondary: '#6b7280',
    accent: '#8b5cf6',
  };

  // Função para executar análise
  const runAnalysis = useCallback(async () => {
    if (analysisConfig.portfolio.length === 0) {
      toast({
        title: 'Erro',
        description: 'Configure pelo menos um ativo no portfólio',
        variant: 'destructive',
      });
      return;
    }

    const totalWeight = analysisConfig.portfolio.reduce((sum, asset) => sum + asset.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      toast({
        title: 'Erro',
        description: 'A soma dos pesos deve ser aproximadamente 100%',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        tickers: analysisConfig.portfolio.map(asset => asset.ticker),
        weights: analysisConfig.portfolio.map(asset => asset.weight),
        period_months: analysisConfig.periodMonths,
        benchmark: analysisConfig.benchmark,
        risk_free_rate: analysisConfig.riskFreeRate,
        include_tearsheet: analysisConfig.includeTearsheet,
      };

      const response = await fetch('/api/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setPerformanceMetrics(result.data.portfolio_metrics);
        setRollingMetrics(result.data.rolling_metrics || []);
        setTearsheetImage(result.data.tearsheet_image);
        setLastUpdate(new Date());

        toast({
          title: 'Análise Concluída',
          description: 'Métricas de performance calculadas com sucesso!',
        });
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast({
        title: 'Erro na Análise',
        description: error.message || 'Falha ao executar análise de performance',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [analysisConfig]);

  // Função para comparar estratégias
  const compareStrategies = useCallback(async () => {
    const strategies = {
      'Atual': Object.fromEntries(
        analysisConfig.portfolio.map(asset => [asset.ticker, asset.weight])
      ),
      'Conservador': Object.fromEntries(
        analysisConfig.portfolio.map(asset => [asset.ticker, asset.weight * 0.8])
      ),
      'Agressivo': Object.fromEntries(
        analysisConfig.portfolio.map(asset => [asset.ticker, asset.weight * 1.2])
      ),
    };

    // Normalizar pesos
    Object.keys(strategies).forEach(strategyName => {
      const strategy = strategies[strategyName];
      const total = Object.values(strategy).reduce((sum, weight) => sum + weight, 0);
      Object.keys(strategy).forEach(ticker => {
        strategy[ticker] = strategy[ticker] / total;
      });
    });

    try {
      const response = await fetch('/api/performance/compare-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategies,
          period_months: analysisConfig.periodMonths,
          benchmark: analysisConfig.benchmark,
          risk_free_rate: analysisConfig.riskFreeRate,
        }),
      });

      const result = await response.json();
      if (result.success && result.data.comparative_table) {
        const comparisonData = Object.entries(result.data.comparative_table).map(
          ([name, metrics]: [string, any]) => ({
            name,
            annual_return: metrics.annual_return || 0,
            annual_volatility: metrics.annual_volatility || 0,
            sharpe_ratio: metrics.sharpe_ratio || 0,
            max_drawdown: metrics.max_drawdown || 0,
            sortino_ratio: metrics.sortino_ratio || 0,
          })
        );
        setStrategyComparison(comparisonData);
      }
    } catch (error) {
      console.error('Erro na comparação:', error);
      toast({
        title: 'Erro na Comparação',
        description: 'Falha ao comparar estratégias',
        variant: 'destructive',
      });
    }
  }, [analysisConfig]);

  // Auto-refresh para modo tempo real
  useEffect(() => {
    if (isRealTime && performanceMetrics) {
      const interval = setInterval(() => {
        runAnalysis();
      }, 60000); // Atualizar a cada minuto

      return () => clearInterval(interval);
    }
  }, [isRealTime, performanceMetrics, runAnalysis]);

  // Função para formatar valores
  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatNumber = (value: number, decimals = 3) => value.toFixed(decimals);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  // Função para obter cor baseada no valor
  const getColorByValue = (value: number, type: 'return' | 'risk' = 'return') => {
    if (type === 'return') {
      return value > 0 ? chartColors.success : chartColors.danger;
    }
    return value < 0.2 ? chartColors.success : value < 0.4 ? chartColors.warning : chartColors.danger;
  };

  // Componente de métrica individual
  const MetricCard: React.FC<{
    title: string;
    value: number;
    format: 'percentage' | 'number';
    description: string;
    icon: React.ReactNode;
    type?: 'return' | 'risk';
    benchmark?: number;
  }> = ({ title, value, format, description, icon, type = 'return', benchmark }) => {
    const formattedValue = format === 'percentage' ? formatPercentage(value) : formatNumber(value);
    const color = getColorByValue(value, type);
    const isExpanded = expandedCards.has(title);

    return (
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: color }}>
                {icon}
              </div>
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newExpanded = new Set(expandedCards);
                if (isExpanded) {
                  newExpanded.delete(title);
                } else {
                  newExpanded.add(title);
                }
                setExpandedCards(newExpanded);
              }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold" style={{ color }}>
              {formattedValue}
            </div>
            {benchmark !== undefined && (
              <div className="text-sm text-muted-foreground">
                Benchmark: {format === 'percentage' ? formatPercentage(benchmark) : formatNumber(benchmark)}
              </div>
            )}
            {isExpanded && (
              <CardDescription className="text-xs mt-2">
                {description}
              </CardDescription>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Análise de Performance
              </h1>
              <p className="text-muted-foreground mt-2">
                Análise avançada usando pyfolio-reloaded e empyrical-reloaded
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isRealTime}
                  onCheckedChange={setIsRealTime}
                  id="realtime"
                />
                <Label htmlFor="realtime" className="text-sm">
                  Tempo Real
                </Label>
              </div>
              {lastUpdate && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {lastUpdate.toLocaleTimeString('pt-BR')}
                </Badge>
              )}
            </div>
          </div>

          {/* Ações principais */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={runAnalysis}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Executar Análise
                </>
              )}
            </Button>
            <Button
              onClick={compareStrategies}
              variant="outline"
              disabled={!performanceMetrics}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparar Estratégias
            </Button>
            {tearsheetImage && (
              <Button variant="outline" asChild>
                <a
                  href={`data:image/png;base64,${tearsheetImage}`}
                  download="portfolio_tearsheet.png"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Tearsheet
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Configuração do Portfólio */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuração do Portfólio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Configurações básicas */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="benchmark">Benchmark</Label>
                  <Select
                    value={analysisConfig.benchmark}
                    onValueChange={(value) =>
                      setAnalysisConfig(prev => ({ ...prev, benchmark: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {benchmarks.map(benchmark => (
                        <SelectItem key={benchmark.value} value={benchmark.value}>
                          <span className="flex items-center">
                            <span className="mr-2">{benchmark.flag}</span>
                            {benchmark.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="riskFreeRate">
                    Taxa Livre de Risco ({formatPercentage(analysisConfig.riskFreeRate)})
                  </Label>
                  <Slider
                    value={[analysisConfig.riskFreeRate * 100]}
                    onValueChange={([value]) =>
                      setAnalysisConfig(prev => ({ ...prev, riskFreeRate: value / 100 }))
                    }
                    max={15}
                    min={0}
                    step={0.25}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="periodMonths">
                    Período de Análise ({analysisConfig.periodMonths} meses)
                  </Label>
                  <Slider
                    value={[analysisConfig.periodMonths]}
                    onValueChange={([value]) =>
                      setAnalysisConfig(prev => ({ ...prev, periodMonths: value }))
                    }
                    max={60}
                    min={3}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Composição do portfólio */}
              <div className="md:col-span-2">
                <Label>Composição do Portfólio</Label>
                <div className="space-y-2 mt-2">
                  {analysisConfig.portfolio.map((asset, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Input
                        value={asset.ticker}
                        onChange={(e) => {
                          const newPortfolio = [...analysisConfig.portfolio];
                          newPortfolio[index] = { ...asset, ticker: e.target.value };
                          setAnalysisConfig(prev => ({ ...prev, portfolio: newPortfolio }));
                        }}
                        placeholder="Ticker"
                        className="w-24"
                      />
                      <Input
                        value={asset.name || ''}
                        onChange={(e) => {
                          const newPortfolio = [...analysisConfig.portfolio];
                          newPortfolio[index] = { ...asset, name: e.target.value };
                          setAnalysisConfig(prev => ({ ...prev, portfolio: newPortfolio }));
                        }}
                        placeholder="Nome"
                        className="flex-1"
                      />
                      <div className="w-32">
                        <Label className="text-xs">
                          {formatPercentage(asset.weight)}
                        </Label>
                        <Slider
                          value={[asset.weight * 100]}
                          onValueChange={([value]) => {
                            const newPortfolio = [...analysisConfig.portfolio];
                            newPortfolio[index] = { ...asset, weight: value / 100 };
                            setAnalysisConfig(prev => ({ ...prev, portfolio: newPortfolio }));
                          }}
                          max={100}
                          min={0}
                          step={1}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPortfolio = analysisConfig.portfolio.filter((_, i) => i !== index);
                          setAnalysisConfig(prev => ({ ...prev, portfolio: newPortfolio }));
                        }}
                      >
                        <MinusSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newAsset = { ticker: '', weight: 0, name: '' };
                      setAnalysisConfig(prev => ({
                        ...prev,
                        portfolio: [...prev.portfolio, newAsset]
                      }));
                    }}
                  >
                    <PlusSquare className="w-4 h-4 mr-2" />
                    Adicionar Ativo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {performanceMetrics && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-8">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="metrics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="rolling">
                <LineChart className="w-4 h-4 mr-2" />
                Rolling
              </TabsTrigger>
              <TabsTrigger value="comparison">
                <PieChart className="w-4 h-4 mr-2" />
                Comparação
              </TabsTrigger>
              <TabsTrigger value="tearsheet">
                <Maximize2 className="w-4 h-4 mr-2" />
                Tearsheet
              </TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Retorno Anual"
                  value={performanceMetrics.annual_return}
                  format="percentage"
                  description="Retorno anualizado do portfólio baseado no histórico"
                  icon={<TrendingUp className="w-4 h-4" />}
                  type="return"
                />
                <MetricCard
                  title="Volatilidade"
                  value={performanceMetrics.annual_volatility}
                  format="percentage"
                  description="Medida de risco baseada na variabilidade dos retornos"
                  icon={<Activity className="w-4 h-4" />}
                  type="risk"
                />
                <MetricCard
                  title="Sharpe Ratio"
                  value={performanceMetrics.sharpe_ratio}
                  format="number"
                  description="Relação risco-retorno ajustada pela taxa livre de risco"
                  icon={<Target className="w-4 h-4" />}
                />
                <MetricCard
                  title="Max Drawdown"
                  value={performanceMetrics.max_drawdown}
                  format="percentage"
                  description="Maior perda em relação ao pico histórico"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  type="risk"
                />
              </div>

              {/* Gráfico de resumo */}
              {rollingMetrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evolução das Métricas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={rollingMetrics.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <RechartsTooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="sharpe_ratio"
                          stroke={chartColors.primary}
                          name="Sharpe Ratio"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="volatility"
                          fill={chartColors.warning}
                          name="Volatilidade"
                          opacity={0.6}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Métricas Detalhadas */}
            <TabsContent value="metrics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  title="Retorno Cumulativo"
                  value={performanceMetrics.cumulative_return}
                  format="percentage"
                  description="Retorno total do período analisado"
                  icon={<DollarSign className="w-4 h-4" />}
                />
                <MetricCard
                  title="Sortino Ratio"
                  value={performanceMetrics.sortino_ratio}
                  format="number"
                  description="Sharpe ratio considerando apenas volatilidade downside"
                  icon={<Shield className="w-4 h-4" />}
                />
                <MetricCard
                  title="Calmar Ratio"
                  value={performanceMetrics.calmar_ratio}
                  format="number"
                  description="Retorno anual dividido pelo max drawdown"
                  icon={<Zap className="w-4 h-4" />}
                />
                <MetricCard
                  title="VaR (5%)"
                  value={performanceMetrics.value_at_risk}
                  format="percentage"
                  description="Perda máxima esperada em 95% dos casos"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  type="risk"
                />
                <MetricCard
                  title="CVaR (5%)"
                  value={performanceMetrics.conditional_value_at_risk}
                  format="percentage"
                  description="Perda média quando excede o VaR"
                  icon={<Shield className="w-4 h-4" />}
                  type="risk"
                />
                <MetricCard
                  title="Skewness"
                  value={performanceMetrics.skewness}
                  format="number"
                  description="Assimetria da distribuição de retornos"
                  icon={<Activity className="w-4 h-4" />}
                />
              </div>

              {performanceMetrics.alpha !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle>Métricas vs. Benchmark</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        title="Alpha"
                        value={performanceMetrics.alpha}
                        format="number"
                        description="Retorno excedente em relação ao benchmark"
                        icon={<TrendingUp className="w-4 h-4" />}
                      />
                      <MetricCard
                        title="Beta"
                        value={performanceMetrics.beta}
                        format="number"
                        description="Sensibilidade em relação ao benchmark"
                        icon={<Activity className="w-4 h-4" />}
                      />
                      <MetricCard
                        title="Tracking Error"
                        value={performanceMetrics.tracking_error}
                        format="percentage"
                        description="Volatilidade dos excess returns"
                        icon={<Target className="w-4 h-4" />}
                        type="risk"
                      />
                      <MetricCard
                        title="Information Ratio"
                        value={performanceMetrics.information_ratio}
                        format="number"
                        description="Alpha dividido pelo tracking error"
                        icon={<Percent className="w-4 h-4" />}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Métricas Rolling */}
            <TabsContent value="rolling" className="space-y-6">
              {rollingMetrics.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sharpe Ratio Rolling</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={rollingMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area
                            type="monotone"
                            dataKey="sharpe_ratio"
                            stroke={chartColors.primary}
                            fill={chartColors.primary}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Volatilidade Rolling</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={rollingMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area
                            type="monotone"
                            dataKey="volatility"
                            stroke={chartColors.warning}
                            fill={chartColors.warning}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Drawdown Rolling</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={rollingMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area
                            type="monotone"
                            dataKey="max_drawdown"
                            stroke={chartColors.danger}
                            fill={chartColors.danger}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">
                      Execute uma análise para ver as métricas rolling
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Comparação de Estratégias */}
            <TabsContent value="comparison" className="space-y-6">
              {strategyComparison.length > 0 ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Comparação de Estratégias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={strategyComparison}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis />
                          <Radar
                            name="Sharpe Ratio"
                            dataKey="sharpe_ratio"
                            stroke={chartColors.primary}
                            fill={chartColors.primary}
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Retorno vs. Risco</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart data={strategyComparison}>
                            <CartesianGrid />
                            <XAxis 
                              type="number" 
                              dataKey="annual_volatility" 
                              name="Volatilidade"
                              unit="%"
                            />
                            <YAxis 
                              type="number" 
                              dataKey="annual_return" 
                              name="Retorno"
                              unit="%"
                            />
                            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter 
                              name="Estratégias" 
                              dataKey="annual_return" 
                              fill={chartColors.primary}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Comparativo de Métricas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsBarChart data={strategyComparison}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="sharpe_ratio" fill={chartColors.primary} name="Sharpe" />
                            <Bar dataKey="sortino_ratio" fill={chartColors.success} name="Sortino" />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-40 space-y-4">
                    <p className="text-muted-foreground">
                      Clique em "Comparar Estratégias" para ver a análise comparativa
                    </p>
                    <Button onClick={compareStrategies} variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Comparar Estratégias
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tearsheet */}
            <TabsContent value="tearsheet" className="space-y-6">
              {tearsheetImage ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Tearsheet Pyfolio-Reloaded
                          </CardTitle>
                          <CardDescription>
                            Relatório visual completo gerado pelo pyfolio-reloaded com todas as métricas e gráficos de performance
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Tela Cheia
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-7xl w-full h-[90vh]">
                              <DialogHeader>
                                <DialogTitle>Portfolio Performance Analysis - Complete Tearsheet</DialogTitle>
                                <DialogDescription>
                                  Análise completa de performance usando pyfolio-reloaded e empyrical-reloaded
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex-1 overflow-auto">
                                <img
                                  src={`data:image/png;base64,${tearsheetImage}`}
                                  alt="Portfolio Tearsheet - Full View"
                                  className="w-full h-auto"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`data:image/png;base64,${tearsheetImage}`}
                              download="portfolio-tearsheet.png"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PNG
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Preview da imagem */}
                        <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                          <img
                            src={`data:image/png;base64,${tearsheetImage}`}
                            alt="Portfolio Tearsheet"
                            className="w-full h-auto rounded shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-300"
                            onClick={() => {
                              // Abrir modal em tela cheia
                              const modal = document.querySelector('[data-state="closed"]') as HTMLElement;
                              modal?.click();
                            }}
                          />
                        </div>
                        
                        {/* Informações sobre o tearsheet */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <LineChart className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-semibold text-blue-900">Retornos Cumulativos</p>
                                  <p className="text-sm text-blue-700">Performance vs benchmark ao longo do tempo</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="font-semibold text-green-900">Métricas Rolling</p>
                                  <p className="text-sm text-green-700">Sharpe, volatilidade e drawdown temporais</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-purple-50 border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="font-semibold text-purple-900">Distribuições</p>
                                  <p className="text-sm text-purple-700">Histogramas e estatísticas de retornos</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Resumo das métricas do tearsheet */}
                        {performanceMetrics && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Target className="w-5 h-5 text-orange-600" />
                              Resumo das Métricas
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Sharpe Ratio</p>
                                                                 <p className={`text-lg font-bold ${(performanceMetrics.sharpe_ratio || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                   {formatNumber(performanceMetrics.sharpe_ratio || 0, 3)}
                                 </p>
                               </div>
                               <div className="text-center p-3 bg-gray-50 rounded-lg">
                                 <p className="text-sm text-gray-600">Retorno Anual</p>
                                 <p className={`text-lg font-bold ${(performanceMetrics.annual_return || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                   {formatPercentage(performanceMetrics.annual_return || 0)}
                                 </p>
                               </div>
                               <div className="text-center p-3 bg-gray-50 rounded-lg">
                                 <p className="text-sm text-gray-600">Volatilidade</p>
                                 <p className="text-lg font-bold text-orange-600">
                                   {formatPercentage(performanceMetrics.annual_volatility || 0)}
                                </p>
                              </div>
                                                             <div className="text-center p-3 bg-gray-50 rounded-lg">
                                 <p className="text-sm text-gray-600">Max Drawdown</p>
                                 <p className="text-lg font-bold text-red-600">
                                   {formatPercentage(Math.abs(performanceMetrics.max_drawdown || 0))}
                                 </p>
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Informações sobre pyfolio-reloaded */}
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Info className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-blue-900 mb-2">Sobre o Pyfolio-Reloaded</h3>
                                                     <p className="text-blue-800 mb-3">
                             O tearsheet acima contém <strong>TODOS os 13 gráficos originais</strong> do pyfolio-reloaded, 
                             gerado automaticamente usando <strong>pyfolio-reloaded v0.9.8</strong> e <strong>empyrical-reloaded v0.5.11</strong>, 
                             as mesmas bibliotecas usadas por bancos e gestoras profissionais.
                           </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                         <div>
                               <h4 className="font-medium text-blue-900 mb-1">📊 Gráficos 1-7:</h4>
                               <ul className="text-blue-700 space-y-1 text-sm">
                                 <li>• Cumulative Returns</li>
                                 <li>• Cumulative Returns volatility matched</li>
                                 <li>• Cumulative Returns (log scale)</li>
                                 <li>• Returns (daily)</li>
                                 <li>• Rolling Portfolio to Benchmark</li>
                                 <li>• Rolling Sharpe Ratio (6-month)</li>
                                 <li>• Rolling Fama-French betas</li>
                               </ul>
                             </div>
                             <div>
                               <h4 className="font-medium text-blue-900 mb-1">📈 Gráficos 8-13:</h4>
                               <ul className="text-blue-700 space-y-1 text-sm">
                                 <li>• Top 5 drawdown periods</li>
                                 <li>• Underwater plot</li>
                                 <li>• Monthly Returns</li>
                                 <li>• Annual Returns</li>
                                 <li>• Distribution of monthly returns</li>
                                 <li>• Return quantiles</li>
                               </ul>
                             </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-40 space-y-4">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">Tearsheet não gerado</h3>
                      <p className="text-muted-foreground">
                        Execute uma análise com tearsheet habilitado para visualizar o relatório completo
                      </p>
                    </div>
                    <Button onClick={runAnalysis} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <Play className="w-4 h-4 mr-2" />
                      Gerar Tearsheet Pyfolio
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="p-8">
              <div className="flex flex-col items-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="font-semibold">Executando Análise de Performance</p>
                  <p className="text-sm text-muted-foreground">
                    Calculando métricas usando pyfolio-reloaded e empyrical-reloaded...
                  </p>
                </div>
                <Progress value={75} className="w-64" />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAnalysisPage; 