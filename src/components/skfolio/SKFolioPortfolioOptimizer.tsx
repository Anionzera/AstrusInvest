import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Loader2, 
  TrendingUp, 
  Shield, 
  Target, 
  BarChart3, 
  PieChart, 
  Activity,
  Brain,
  Settings,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  Plus,
  X,
  Sparkles,
  LineChart,
  TrendingDown,
  Cpu,
  Save,
  Database,
  AlertTriangle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from '../ui/use-toast';
import PlotlyChart from './PlotlyChart';

// Types para otimização
interface OptimizationConfig {
  risk_measure: string;
  solver: string;
  min_weights: number;
  max_weights: number;
  budget: number;
  l1_coef: number;
  l2_coef: number;
}

interface PortfolioResult {
  success: boolean;
  optimization_type: string;
  period: string;
  portfolio_metrics: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    calmar_ratio: number;
    var_95: number | null;
    cvar_95: number | null;
  };
  weights: Record<string, number>;
  assets_info: Array<{
    symbol: string;
    weight: number;
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
  }>;
  data_info: {
    start_date: string;
    end_date: string;
    observations: number;
    assets_count: number;
  };
  timestamp: string;
  charts?: {
    allocation_pie: string;
    efficient_frontier: string;
    correlation_heatmap: string;
    returns_distribution: string;
    risk_return_scatter?: string;
    cumulative_returns?: string;
    drawdown_chart?: string;
    performance_attribution?: string;
    rolling_metrics?: string;
    volatility_surface?: string;
  };
}

const AIPortfolioOptimizer: React.FC = () => {
  // Estados principais
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['PETR4.SA', 'VALE3.SA', 'ITUB4.SA']);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [period, setPeriod] = useState<string>('2y');
  const [optimizationType, setOptimizationType] = useState<string>('mean_risk');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioResult | null>(null);
  const [config, setConfig] = useState<OptimizationConfig>({
    risk_measure: 'VARIANCE',
    solver: 'CLARABEL',
    min_weights: 0.05,
    max_weights: 0.40,
    budget: 1.0,
    l1_coef: 0.0,
    l2_coef: 0.0
  });
  
  // Estados para exemplo
  const [samplePortfolio, setSamplePortfolio] = useState<any>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  // Função para forçar renderização dos gráficos Plotly
  const forceRenderPlotlyCharts = () => {
    setTimeout(() => {
      const chartContainers = document.querySelectorAll('[data-plotly-chart]');
      chartContainers.forEach((container: Element) => {
        try {
          const htmlContent = container.innerHTML;
          
          // Verifica se já foi processado para evitar duplicação
          if (container.getAttribute('data-plotly-processed')) {
            return;
          }
          
          // Marca como processado
          container.setAttribute('data-plotly-processed', 'true');
          
          // Extrai e executa scripts Plotly
          const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
          let scripts: string[] = [];
          let match;
          
          while ((match = scriptRegex.exec(htmlContent)) !== null) {
            const scriptContent = match[1];
            if (scriptContent.trim()) {
              scripts.push(scriptContent);
            }
          }
          
          // Executa todos os scripts encontrados
          scripts.forEach((scriptContent, index) => {
            try {
              // Cria um contexto seguro para execução
              const func = new Function(scriptContent);
              func();
              console.log(`✅ Script ${index + 1} executado para ${container.getAttribute('data-plotly-chart')}`);
            } catch (e) {
              console.log(`❌ Erro ao executar script ${index + 1}: ${e}`);
            }
          });
          
          if (scripts.length > 0) {
            console.log(`🎯 Total de ${scripts.length} scripts processados para ${container.getAttribute('data-plotly-chart')}`);
          }
          
        } catch (error) {
          console.log(`❌ Erro ao processar container: ${error}`);
        }
      });
    }, 300);
  };

  // Executa quando os gráficos são atualizados
  useEffect(() => {
    if (portfolioResult?.charts) {
      forceRenderPlotlyCharts();
    }
  }, [portfolioResult?.charts]);

  const optimizePortfolio = async () => {
    if (selectedSymbols.length < 2) {
      toast({
        title: "Símbolos Insuficientes",
        description: "Selecione pelo menos 2 ativos para otimização",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);
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
          auto_format: true,
          include_benchmark: true,
          include_charts: true,
          config: config
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPortfolioResult(data);
        toast({
          title: "🚀 Otimização IA Concluída!",
          description: `Portfólio otimizado com Sharpe Ratio: ${data.portfolio_metrics.sharpe_ratio.toFixed(3)}`,
        });
      } else {
        throw new Error(data.error || 'Erro na otimização');
      }
    } catch (error) {
      console.error('Erro na otimização:', error);
      toast({
        title: "Erro na Otimização IA",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const addSymbol = () => {
    if (!newSymbol.trim()) return;
    
    const symbol = newSymbol.trim().toUpperCase();
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol]);
      setNewSymbol('');
      toast({
        title: "Ativo Adicionado",
        description: `${symbol} foi adicionado ao portfólio`,
      });
    } else {
      toast({
        title: "Ativo Duplicado",
        description: `${symbol} já está no portfólio`,
        variant: "destructive"
      });
    }
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    toast({
      title: "Ativo Removido",
      description: `${symbol} foi removido do portfólio`,
    });
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAlgorithmDescription = (type: string): string => {
    switch (type) {
      case 'mean_risk':
        return 'Mean-Risk (Markowitz) é um método amplamente utilizado para gerenciar riscos e retornos em portfólios de investimentos. Ele busca encontrar uma combinação eficiente de ativos que maximiza o retorno esperado para um dado nível de risco ou minimiza o risco para um retorno esperado.';
      case 'risk_budgeting':
        return 'Risk Budgeting é uma técnica de gerenciamento de risco que divide o portfólio em partes menores, cada uma com um objetivo de risco específico. Isso permite que o investidor aloque recursos de forma mais eficiente e controlada.';
      case 'hrp':
        return 'Hierarchical Risk Parity (HRP) é um método de diversificação que utiliza uma abordagem hierárquica para alocar ativos com base em suas correlações. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'herc':
        return 'Hierarchical Equal Risk Contribution (HERC) é um método de diversificação que utiliza uma abordagem hierárquica para alocar ativos com base em suas contribuições de risco. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'nested_clusters':
        return 'Nested Clusters Optimization (NCO) é um método de diversificação que utiliza técnicas de agrupamento para criar clusters de ativos com similaridades. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'black_litterman':
        return 'Black-Litterman é um modelo de otimização que combina insights de diferentes fontes (como análise fundamentalista, técnico e quantitativa) com dados históricos para gerar uma estimativa de retorno esperado.';
      case 'factor_model':
        return 'Factor Model é um modelo de otimização que utiliza fatores comuns para explicar o comportamento de ativos. Ele ajuda a identificar padrões de comportamento e a alocar ativos com base nesses padrões.';
      case 'black_litterman_factor':
        return 'Black-Litterman + Factor Model é uma combinação de modelos que utiliza insights de diferentes fontes (como análise fundamentalista, técnico e quantitativa) com dados históricos para gerar uma estimativa de retorno esperado.';
      case 'distributionally_robust_cvar':
        return 'Distributionally Robust CVaR é uma técnica de otimização que busca minimizar o risco de perda máxima esperada em diferentes cenários de mercado. Ele ajuda a proteger o portfólio contra eventos extremos e volatilidades.';
      case 'max_diversification':
        return 'Maximum Diversification é uma técnica de diversificação que busca maximizar o retorno esperado do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'equal_weighted':
        return 'Equal Weighted é uma técnica de diversificação que divide o portfólio igualmente entre todos os ativos. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'inverse_volatility':
        return 'Inverse Volatility é uma técnica de diversificação que divide o portfólio inversamente proporcional ao risco de cada ativo. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'entropy_pooling':
        return 'Entropy Pooling é uma técnica de diversificação que utiliza a entropia para criar clusters de ativos com similaridades. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'opinion_pooling':
        return 'Opinion Pooling é uma técnica de diversificação que utiliza insights de diferentes fontes para criar clusters de ativos com similaridades. Ele ajuda a reduzir o risco total do portfólio ao mesclar ativos com diferentes níveis de risco e correlação.';
      case 'stacking':
        return 'Stacking Optimization (Ensemble) é uma técnica de diversificação que combina diferentes modelos de otimização para criar um portfólio mais eficiente. Ele ajuda a reduzir o risco total do portfólio ao mesclar diferentes modelos de otimização.';
      case 'synthetic_data':
        return 'Synthetic Data Generation é uma técnica de geração de dados sintéticos para criar um portfólio mais eficiente. Ele ajuda a reduzir o risco total do portfólio ao mesclar diferentes modelos de otimização.';
      case 'grid_search':
        return 'Grid Search + Cross Validation é uma técnica de otimização que utiliza uma grade de diferentes parâmetros para criar um portfólio mais eficiente. Ele ajuda a reduzir o risco total do portfólio ao mesclar diferentes modelos de otimização.';
      case 'randomized_search':
        return 'Randomized Search é uma técnica de otimização que utiliza uma busca aleatória para criar um portfólio mais eficiente. Ele ajuda a reduzir o risco total do portfólio ao mesclar diferentes modelos de otimização.';
      default:
        return 'Descrição do algoritmo não disponível';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Otimizador IA de Portfólios
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Inteligência artificial avançada para otimização quantitativa de investimentos
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Powered
        </Badge>
      </div>

      <Tabs defaultValue="optimizer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-violet-100 to-purple-100 p-1 rounded-xl">
          <TabsTrigger 
            value="optimizer" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
          >
            <Brain className="h-4 w-4" />
            Otimizador IA
          </TabsTrigger>
          <TabsTrigger 
            value="config" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger 
            value="charts" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
          >
            <LineChart className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger 
            value="results" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg"
          >
            <BarChart3 className="h-4 w-4" />
            Resultados
          </TabsTrigger>
        </TabsList>

        {/* Tab: Otimizador */}
        <TabsContent value="optimizer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Manual de Tickers */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-violet-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-900">
                  <Plus className="h-5 w-5" />
                  Adicionar Ativos
                </CardTitle>
                <CardDescription className="text-violet-700">
                  Digite qualquer ticker: PETR4.SA, AAPL, TSLA, BTC-USD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input para novo símbolo */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: PETR4.SA, AAPL, TSLA..."
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={addSymbol}
                    disabled={!newSymbol.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Símbolos Selecionados */}
                <div>
                  <Label className="text-violet-900">Ativos Selecionados ({selectedSymbols.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg min-h-[60px] bg-white">
                    {selectedSymbols.map((symbol) => (
                      <Badge 
                        key={symbol} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-red-100 hover:text-red-800 hover:border-red-200 transition-colors bg-violet-100 text-violet-800 border-violet-200"
                        onClick={() => removeSymbol(symbol)}
                      >
                        {symbol} 
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    {selectedSymbols.length === 0 && (
                      <span className="text-muted-foreground text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Nenhum ativo selecionado
                      </span>
                    )}
                  </div>
                </div>

                {/* Dicas */}
                <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Dica:</strong> Use .SA para ações brasileiras (PETR4.SA), 
                    -USD para crypto (BTC-USD) ou ticker direto para ações americanas (AAPL).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Configurações de Otimização */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Cpu className="h-5 w-5" />
                  Configuração da IA
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Parâmetros para otimização inteligente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-900">Período de Dados</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6mo">6 meses</SelectItem>
                        <SelectItem value="1y">1 ano</SelectItem>
                        <SelectItem value="2y">2 anos</SelectItem>
                        <SelectItem value="3y">3 anos</SelectItem>
                        <SelectItem value="5y">5 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-blue-900">Algoritmo IA</Label>
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
                    
                    {/* Descrição do Algoritmo Selecionado */}
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium">
                        {getAlgorithmDescription(optimizationType)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-900">Peso Mínimo (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.min_weights * 100]}
                        onValueChange={([value]) => setConfig({...config, min_weights: value / 100})}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-sm text-blue-700 mt-1 font-medium">
                        {formatPercentage(config.min_weights)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-blue-900">Peso Máximo (%)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[config.max_weights * 100]}
                        onValueChange={([value]) => setConfig({...config, max_weights: value / 100})}
                        min={10}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-sm text-blue-700 mt-1 font-medium">
                        {formatPercentage(config.max_weights)}
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={optimizePortfolio} 
                  disabled={isOptimizing || selectedSymbols.length < 2}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  size="lg"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Otimizando com IA...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Otimizar com IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Configurações Avançadas */}
        <TabsContent value="config" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Avançadas da IA
              </CardTitle>
              <CardDescription>
                Parâmetros detalhados para otimização {optimizationType}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Medida de Risco</Label>
                    <Select 
                      value={config.risk_measure} 
                      onValueChange={(value) => setConfig({...config, risk_measure: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VARIANCE">📊 Variance</SelectItem>
                        <SelectItem value="CVAR">🛡️ CVaR (Conditional Value at Risk)</SelectItem>
                        <SelectItem value="EVAR">⚡ EVaR (Entropic Value at Risk)</SelectItem>
                        <SelectItem value="CDAR">📉 CDaR (Conditional Drawdown at Risk)</SelectItem>
                        <SelectItem value="EDAR">🌊 EDaR (Entropic Drawdown at Risk)</SelectItem>
                        <SelectItem value="MAX_DRAWDOWN">📉 Max Drawdown</SelectItem>
                        <SelectItem value="STANDARD_DEVIATION">📈 Standard Deviation</SelectItem>
                        <SelectItem value="ULCER_INDEX">🩹 Ulcer Index</SelectItem>
                        <SelectItem value="GINI">📊 Gini Index</SelectItem>
                        <SelectItem value="WORST_REALIZATION">⚠️ Worst Realization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Solver Engine</Label>
                    <Select 
                      value={config.solver} 
                      onValueChange={(value) => setConfig({...config, solver: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLARABEL">🦀 CLARABEL (Rust - Recomendado)</SelectItem>
                        <SelectItem value="OSQP">⚡ OSQP (Operator Splitting QP)</SelectItem>
                        <SelectItem value="SCS">🎯 SCS (Splitting Conic Solver)</SelectItem>
                        <SelectItem value="ECOS">🌿 ECOS (Embedded Conic Solver)</SelectItem>
                        <SelectItem value="CVXOPT">🐍 CVXOPT (Python)</SelectItem>
                        <SelectItem value="GLPK">🆓 GLPK (GNU Linear Programming)</SelectItem>
                        <SelectItem value="CBC">🏆 CBC (COIN-OR Branch and Cut)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Orçamento Total</Label>
                    <Input
                      type="number"
                      value={config.budget}
                      onChange={(e) => setConfig({...config, budget: parseFloat(e.target.value) || 1.0})}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Regularização L1 (Sparsity)</Label>
                    <Slider
                      value={[config.l1_coef * 1000]}
                      onValueChange={([value]) => setConfig({...config, l1_coef: value / 1000})}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      {config.l1_coef.toFixed(3)} - Promove esparsidade (menos ativos)
                    </div>
                  </div>

                  <div>
                    <Label>Regularização L2 (Smoothing)</Label>
                    <Slider
                      value={[config.l2_coef * 1000]}
                      onValueChange={([value]) => setConfig({...config, l2_coef: value / 1000})}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      {config.l2_coef.toFixed(3)} - Suaviza pesos para estabilidade
                    </div>
                  </div>

                  {/* Configurações Específicas por Algoritmo */}
                  {optimizationType === 'synthetic_data' && (
                    <div>
                      <Label>Número de Amostras Sintéticas</Label>
                      <Input
                        type="number"
                        placeholder="2000"
                        min={100}
                        max={10000}
                        step={100}
                      />
                    </div>
                  )}

                  {optimizationType === 'grid_search' && (
                    <div>
                      <Label>Número de Combinações</Label>
                      <Input
                        type="number"
                        placeholder="27"
                        min={5}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}

                  {optimizationType === 'randomized_search' && (
                    <div>
                      <Label>Número de Iterações</Label>
                      <Input
                        type="number"
                        placeholder="20"
                        min={5}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}

                  {(optimizationType === 'black_litterman' || optimizationType === 'black_litterman_factor') && (
                    <div>
                      <Label>Views de Mercado (Opcional)</Label>
                      <Input
                        placeholder="Ex: PETR4 > VALE3 por 2%"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Alert específico para o algoritmo */}
              <Alert className="border-violet-200 bg-violet-50">
                <Info className="h-4 w-4 text-violet-600" />
                <AlertDescription className="text-violet-800">
                  <strong>{optimizationType.toUpperCase()}:</strong> {getAlgorithmDescription(optimizationType)}
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setConfig({
                    risk_measure: 'VARIANCE',
                    solver: 'CLARABEL',
                    min_weights: 0.05,
                    max_weights: 0.40,
                    budget: 1.0,
                    l1_coef: 0.0,
                    l2_coef: 0.0
                  });
                  toast({
                    title: "Configurações Restauradas",
                    description: "Parâmetros padrão aplicados",
                  });
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restaurar Padrões
                </Button>
                
                <Button 
                  onClick={() => {
                    toast({
                      title: "Configurações Salvas",
                      description: "Parâmetros atualizados com sucesso",
                    });
                  }}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gráficos */}
        <TabsContent value="charts" className="space-y-6">
          {portfolioResult?.charts ? (
            <>
              {/* Header dos Gráficos */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <LineChart className="h-5 w-5" />
                    Visualizações Interativas da IA
                  </CardTitle>
                  <CardDescription className="text-indigo-700">
                    Gráficos avançados gerados pelo algoritmo {portfolioResult.optimization_type}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Resumo de Gráficos Gerados */}
              {portfolioResult.charts && (
                <div className="mb-6">
                  <Card className="border-0 bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            🎨 Visualizações Geradas
                          </h3>
                          <p className="text-sm text-gray-600">
                            Sistema completo de análise visual do portfólio
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {Object.keys(portfolioResult.charts).length}
                          </div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">
                            Gráficos Plotly
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.keys(portfolioResult.charts).map((chartKey) => (
                          <span
                            key={chartKey}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {chartKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Grid de Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Pizza - Alocação */}
                {portfolioResult.charts.allocation_pie && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-blue-600" />
                        Alocação do Portfólio
                      </CardTitle>
                      <CardDescription>
                        Distribuição otimizada dos pesos por ativo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlotlyChart
                        htmlContent={portfolioResult.charts.allocation_pie}
                        chartId="portfolio-allocation-pie"
                        style={{ height: '500px' }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Fronteira Eficiente */}
                {portfolioResult.charts.efficient_frontier && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Fronteira Eficiente
                      </CardTitle>
                      <CardDescription>
                        Combinações ótimas de risco vs retorno
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlotlyChart
                        htmlContent={portfolioResult.charts.efficient_frontier}
                        chartId="portfolio-efficient-frontier"
                        style={{ height: '500px' }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Matriz de Correlação */}
                {portfolioResult.charts.correlation_heatmap && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-600" />
                        Matriz de Correlação
                      </CardTitle>
                      <CardDescription>
                        Correlações entre os ativos do portfólio
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlotlyChart
                        htmlContent={portfolioResult.charts.correlation_heatmap}
                        chartId="portfolio-correlation-heatmap"
                        style={{ height: '500px' }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Distribuição de Retornos */}
                {portfolioResult.charts.returns_distribution && (
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Distribuição de Retornos
                      </CardTitle>
                      <CardDescription>
                        Histograma dos retornos do portfólio
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlotlyChart
                        htmlContent={portfolioResult.charts.returns_distribution}
                        chartId="portfolio-returns-distribution"
                        style={{ height: '500px' }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Gráficos Adicionais que podem estar disponíveis */}
              {portfolioResult.charts.risk_return_scatter && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-600" />
                      Risco vs Retorno por Ativo
                    </CardTitle>
                    <CardDescription>
                      Posicionamento individual de cada ativo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.risk_return_scatter}
                      chartId="portfolio-risk-return-scatter"
                      style={{ height: '500px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {portfolioResult.charts.cumulative_returns && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-cyan-600" />
                      Retornos Cumulativos
                    </CardTitle>
                    <CardDescription>
                      Performance do portfólio ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.cumulative_returns}
                      chartId="portfolio-cumulative-returns"
                      style={{ height: '500px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {portfolioResult.charts.drawdown_chart && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      Análise de Drawdown
                    </CardTitle>
                    <CardDescription>
                      Perdas máximas do portfólio ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.drawdown_chart}
                      chartId="portfolio-drawdown-chart"
                      style={{ height: '600px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Performance Attribution */}
              {portfolioResult.charts.performance_attribution && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Atribuição de Performance
                    </CardTitle>
                    <CardDescription>
                      Contribuição de cada ativo para retorno e risco do portfólio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.performance_attribution}
                      chartId="portfolio-performance-attribution"
                      style={{ height: '700px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Rolling Metrics */}
              {portfolioResult.charts.rolling_metrics && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      Métricas Móveis
                    </CardTitle>
                    <CardDescription>
                      Evolução temporal das métricas de risco-retorno
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.rolling_metrics}
                      chartId="portfolio-rolling-metrics"
                      style={{ height: '600px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Volatility Surface */}
              {portfolioResult.charts.volatility_surface && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-cyan-600" />
                      Superfície de Volatilidade
                    </CardTitle>
                    <CardDescription>
                      Volatilidade por diferentes janelas temporais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      htmlContent={portfolioResult.charts.volatility_surface}
                      chartId="portfolio-volatility-surface"
                      style={{ height: '500px' }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Informações dos Gráficos */}
              <Alert className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <Info className="h-4 w-4 text-indigo-600" />
                <AlertDescription className="text-indigo-800">
                  <strong>💡 Gráficos Interativos:</strong> Passe o mouse sobre os gráficos para ver detalhes. 
                  Use zoom, pan e outras ferramentas do Plotly para análise detalhada.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <LineChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aguardando Gráficos</h3>
                <p className="text-muted-foreground mb-4">
                  Execute uma otimização para gerar visualizações interativas avançadas
                </p>
                
                {/* Renderização automática de gráficos */}
                {portfolioResult && portfolioResult.charts && (
                  <div className="text-sm text-muted-foreground mt-4">
                    ✅ Gráficos carregados automaticamente
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground mt-6">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Alocação
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Fronteira Eficiente
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Correlação
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Distribuições
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Risco-Retorno
                  </div>
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Retornos Cumulativos
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Drawdown
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Atribuição
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Métricas Móveis
                  </div>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Volatilidade 3D
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="results" className="space-y-6">
          {portfolioResult ? (
            <>
              {/* Header dos Resultados */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <TrendingUp className="h-5 w-5" />
                    Resultados da Otimização com IA
                  </CardTitle>
                  <CardDescription className="text-emerald-700">
                    Algoritmo: <span className="font-semibold">{portfolioResult.optimization_type}</span> | 
                    Período: <span className="font-semibold">{portfolioResult.period}</span> | 
                    Benchmark: <span className="font-semibold">^BVSP (Ibovespa)</span>
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Métricas Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium text-blue-700">Retorno Anualizado</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatPercentage(portfolioResult.portfolio_metrics.expected_return)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-sm font-medium text-purple-700">Volatilidade</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatPercentage(portfolioResult.portfolio_metrics.volatility)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                    <div className="text-sm font-medium text-amber-700">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-amber-900">
                      {portfolioResult.portfolio_metrics.sharpe_ratio.toFixed(3)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <div className="text-sm font-medium text-red-700">Max Drawdown</div>
                    <div className="text-2xl font-bold text-red-900">
                      {formatPercentage(portfolioResult.portfolio_metrics.max_drawdown)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas Avançadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-blue-50">
                  <CardContent className="p-4 text-center">
                    <Cpu className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
                    <div className="text-sm font-medium text-cyan-700">Calmar Ratio</div>
                    <div className="text-xl font-bold text-cyan-900">
                      {portfolioResult.portfolio_metrics.calmar_ratio?.toFixed(3) || 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                    <div className="text-sm font-medium text-emerald-700">VaR 95%</div>
                    <div className="text-xl font-bold text-emerald-900">
                      {portfolioResult.portfolio_metrics.var_95 !== null && portfolioResult.portfolio_metrics.var_95 !== undefined 
                        ? formatPercentage(Math.abs(portfolioResult.portfolio_metrics.var_95)) 
                        : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-pink-600" />
                    <div className="text-sm font-medium text-pink-700">CVaR 95%</div>
                    <div className="text-xl font-bold text-pink-900">
                      {portfolioResult.portfolio_metrics.cvar_95 !== null && portfolioResult.portfolio_metrics.cvar_95 !== undefined 
                        ? formatPercentage(Math.abs(portfolioResult.portfolio_metrics.cvar_95)) 
                        : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Informações do Dataset */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Informações do Dataset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Data Inicial</div>
                      <div className="font-mono">{portfolioResult.data_info.start_date}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Data Final</div>
                      <div className="font-mono">{portfolioResult.data_info.end_date}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Observações</div>
                      <div className="font-mono">{portfolioResult.data_info.observations}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Ativos</div>
                      <div className="font-mono">{portfolioResult.data_info.assets_count}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alocação do Portfólio */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Alocação Otimizada do Portfólio
                  </CardTitle>
                  <CardDescription>
                    Pesos otimizados por algoritmo de {portfolioResult.optimization_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portfolioResult.assets_info.map((asset, index) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${index * 360 / portfolioResult.assets_info.length}, 70%, 50%)` }}></div>
                          <div>
                            <div className="font-medium">{asset.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              Retorno: {formatPercentage(asset.expected_return)} | 
                              Vol: {formatPercentage(asset.volatility)} | 
                              Sharpe: {asset.sharpe_ratio.toFixed(3)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatPercentage(asset.weight)}</div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${asset.weight * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aguardando Otimização</h3>
                <p className="text-muted-foreground">
                  Execute uma otimização para ver os resultados detalhados aqui
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPortfolioOptimizer;