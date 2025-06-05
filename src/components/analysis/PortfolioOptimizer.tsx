import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, BarChart4, RefreshCw, PlusCircle, Percent, ArrowUpRight, AlertTriangle, HelpCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  Legend,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { db } from "@/lib/db";
import { Switch } from "@/components/ui/switch";

interface PortfolioOptimizerProps {
  clienteId?: number;
  onSavePortfolio?: (weights: Record<string, number>) => void;
}

type OptimizationMethod = 
  | "efficient_frontier" 
  | "black_litterman" 
  | "hrp"
  | "equal_weight"
  | "min_volatility"
  | "max_sharpe"
  | "efficient_cvar"  
  | "cla";

const methodLabels: Record<OptimizationMethod, string> = {
  "efficient_frontier": "Fronteira Eficiente",
  "black_litterman": "Black-Litterman",
  "hrp": "Hierarchical Risk Parity",
  "equal_weight": "Pesos Iguais",
  "min_volatility": "Mínima Volatilidade",
  "max_sharpe": "Máximo Índice de Sharpe",
  "efficient_cvar": "CVaR",
  "cla": "CLA"
};

const methodDescriptions: Record<OptimizationMethod, string> = {
  "efficient_frontier": "Otimização clássica de média-variância que busca o melhor equilíbrio entre retorno esperado e risco.",
  "black_litterman": "Combina retornos de equilíbrio de mercado com visões do investidor para criar alocações mais robustas.",
  "hrp": "Utiliza agrupamento hierárquico para criar portfólios diversificados sem depender de estimativas de retorno.",
  "equal_weight": "Aloca o mesmo peso para todos os ativos, uma estratégia simples e muitas vezes eficaz.",
  "min_volatility": "Busca o portfólio com a menor volatilidade possível, independente do retorno.",
  "max_sharpe": "Busca o portfólio com a melhor relação entre retorno e risco (maior índice de Sharpe).",
  "efficient_cvar": "Otimiza com base no Conditional Value at Risk (CVaR), minimizando perdas em cenários extremos.",
  "cla": "Usa o Critical Line Algorithm para calcular a fronteira eficiente completa de forma mais precisa."
};

const DEFAULT_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57"
];

const OPTIMIZATION_DESCRIPTIONS: Record<string, string> = {
  "efficient_frontier": "Otimiza o portfólio usando o modelo clássico de média-variância de Markowitz.",
  "black_litterman": "Combina retornos de equilíbrio de mercado com visões do investidor para criar alocações mais robustas.",
  "hrp": "Utiliza agrupamento hierárquico para criar portfólios diversificados sem depender de estimativas de retorno.",
  "equal_weight": "Aloca o mesmo peso para todos os ativos, uma estratégia simples e muitas vezes eficaz.",
  "min_volatility": "Busca o portfólio com a menor volatilidade possível, independente do retorno.",
  "max_sharpe": "Busca o portfólio com a melhor relação entre retorno e risco (maior índice de Sharpe).",
  "efficient_cvar": "Otimiza com base no Conditional Value at Risk (CVaR), minimizando perdas em cenários extremos.",
  "cla": "Usa o Critical Line Algorithm para calcular a fronteira eficiente completa de forma mais precisa."
};

const PortfolioOptimizer: React.FC<PortfolioOptimizerProps> = ({ clienteId, onSavePortfolio }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("optimization");
  
  // Estados para otimização
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [optimizationMethod, setOptimizationMethod] = useState<OptimizationMethod>("max_sharpe");
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.1);
  const [period, setPeriod] = useState<string>("2y");
  const [minWeight, setMinWeight] = useState<number>(0);
  const [maxWeight, setMaxWeight] = useState<number>(1);
  const [targetReturn, setTargetReturn] = useState<number | null>(null);
  const [targetRisk, setTargetRisk] = useState<number | null>(null);
  
  // Adicionar estados para modelos de retorno e risco
  const [returnsModel, setReturnsModel] = useState<string>("mean_historical");
  const [riskModel, setRiskModel] = useState<string>("sample_cov");
  const [benchmark, setBenchmark] = useState<string>("^BVSP");
  
  // Resultados da otimização
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [efficientFrontierData, setEfficientFrontierData] = useState<any>(null);
  const [discreteAllocation, setDiscreteAllocation] = useState<any>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(100000);
  
  // Adicionar useMachineLearning ao estado
  const [useMachineLearning, setUseMachineLearning] = useState<boolean>(false);
  
  // Adicionar um ticker à lista
  const addTicker = () => {
    if (!tickerInput) return;
    
    const ticker = tickerInput.trim().toUpperCase();
    if (tickers.includes(ticker)) {
      toast({
        title: "Ativo já adicionado",
        description: `${ticker} já está na lista de ativos.`,
        variant: "destructive"
      });
      return;
    }
    
    setTickers([...tickers, ticker]);
    setTickerInput("");
  };
  
  // Remover um ticker da lista
  const removeTicker = (tickerToRemove: string) => {
    setTickers(tickers.filter(ticker => ticker !== tickerToRemove));
  };
  
  // Otimizar portfólio
  const optimizePortfolio = async () => {
    if (tickers.length < 2) {
      toast({
        title: "Ativos insuficientes",
        description: "É necessário adicionar pelo menos 2 ativos para otimização.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/portfolio/optimize', {
        tickers,
        method: optimizationMethod,
        risk_free_rate: riskFreeRate,
        target_return: targetReturn,
        target_risk: targetRisk,
        min_weight: minWeight,
        max_weight: maxWeight,
        period,
        use_ml_predictions: useMachineLearning,
        returns_model: returnsModel,
        risk_model: riskModel,
        benchmark: returnsModel === "capm" ? benchmark : undefined
      });
      
      setOptimizationResult(response.data);
      
      toast({
        title: "Otimização concluída",
        description: useMachineLearning ? 
          "Portfólio otimizado com sucesso usando Machine Learning." : 
          "Portfólio otimizado com sucesso."
      });
      
      // Carregar a fronteira eficiente
      fetchEfficientFrontier();
      
    } catch (error: any) {
      console.error("Erro na otimização:", error);
      const errorMessage = error.response?.data?.error || "Não foi possível otimizar o portfólio. Verifique os ativos selecionados.";
      
      toast({
        title: "Erro na otimização",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Carregar fronteira eficiente
  const fetchEfficientFrontier = async () => {
    if (tickers.length < 2) return;
    
    try {
      const response = await axios.post('/api/portfolio/efficient-frontier', {
        tickers,
        risk_free_rate: riskFreeRate,
        period,
        returns_model: returnsModel,
        risk_model: riskModel,
        benchmark: returnsModel === "capm" ? benchmark : undefined
      });
      
      setEfficientFrontierData(response.data);
      
    } catch (error: any) {
      console.error("Erro ao carregar fronteira eficiente:", error);
      const errorMessage = error.response?.data?.error || "Não foi possível carregar a fronteira eficiente.";
      
      toast({
        title: "Erro ao carregar fronteira eficiente",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  // Calcular alocação discreta
  const calculateDiscreteAllocation = async () => {
    if (!optimizationResult) {
      toast({
        title: "Otimização necessária",
        description: "Primeiro otimize o portfólio antes de calcular a alocação discreta.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await axios.post('/api/portfolio/discrete-allocation', {
        tickers,
        method: optimizationMethod,
        risk_free_rate: riskFreeRate,
        total_value: portfolioValue,
        period,
        use_ml_predictions: useMachineLearning
      });
      
      setDiscreteAllocation(response.data);
      
    } catch (error: any) {
      console.error("Erro na alocação discreta:", error);
      const errorMessage = error.response?.data?.error || "Não foi possível calcular a alocação discreta.";
      
      toast({
        title: "Erro na alocação",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  // Salvar portfólio otimizado
  const handleSavePortfolio = () => {
    if (!optimizationResult || !onSavePortfolio) return;
    
    onSavePortfolio(optimizationResult.weights);
    
    toast({
      title: "Portfólio salvo",
      description: "O portfólio otimizado foi salvo com sucesso."
    });
  };
  
  // Preparar dados para gráfico de pizza dos pesos
  const prepareWeightsChartData = () => {
    if (!optimizationResult?.weights) return [];
    
    return Object.entries(optimizationResult.weights).map(([name, value], index) => ({
      name,
      value: Number(value) * 100,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }));
  };
  
  // Formatar percentual
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart4 className="h-5 w-5" />
            <span>Otimizador de Portfólio</span>
          </CardTitle>
          <CardDescription>
            Utilize técnicas modernas de otimização para criar portfólios eficientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="optimization" className="flex-1">Otimização</TabsTrigger>
              <TabsTrigger value="results" className="flex-1">Resultados</TabsTrigger>
              <TabsTrigger value="frontier" className="flex-1">Fronteira Eficiente</TabsTrigger>
              <TabsTrigger value="allocation" className="flex-1">Alocação</TabsTrigger>
            </TabsList>
            
            {/* Aba de Otimização */}
            <TabsContent value="optimization" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="ticker-input">Adicionar ativo (ticker)</Label>
                    <Input
                      id="ticker-input"
                      placeholder="Ex: PETR4, VALE3, ITUB4"
                      value={tickerInput}
                      onChange={(e) => setTickerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                    />
                  </div>
                  <Button onClick={addTicker} className="mb-0.5">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                
                {tickers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tickers.map(ticker => (
                      <Badge key={ticker} variant="secondary" className="cursor-pointer" onClick={() => removeTicker(ticker)}>
                        {ticker} ×
                      </Badge>
                    ))}
                  </div>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="optimization-method">Método de otimização</Label>
                    <Select 
                      value={optimizationMethod} 
                      onValueChange={(value: OptimizationMethod) => setOptimizationMethod(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max_sharpe">Maximizar Sharpe Ratio</SelectItem>
                        <SelectItem value="min_volatility">Minimizar Volatilidade</SelectItem>
                        <SelectItem value="efficient_frontier">Fronteira Eficiente</SelectItem>
                        <SelectItem value="equal_weight">Pesos Iguais</SelectItem>
                        <SelectItem value="hrp">Hierarchical Risk Parity (HRP)</SelectItem>
                        <SelectItem value="black_litterman">Black-Litterman</SelectItem>
                        <SelectItem value="efficient_cvar">CVaR</SelectItem>
                        <SelectItem value="cla">CLA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Modelo de estimativa de retornos */}
                  <div className="space-y-2">
                    <Label htmlFor="returns-model">Modelo de Retornos</Label>
                    <Select 
                      value={returnsModel} 
                      onValueChange={setReturnsModel}
                    >
                      <SelectTrigger id="returns-model">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean_historical">Média Histórica</SelectItem>
                        <SelectItem value="ema_historical">Média Móvel Exponencial</SelectItem>
                        <SelectItem value="capm">Modelo CAPM</SelectItem>
                        <SelectItem value="james_stein">James-Stein Shrinkage</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Método para estimar retornos esperados
                    </p>
                  </div>
                  
                  {/* Benchmark para CAPM */}
                  {returnsModel === "capm" && (
                    <div className="space-y-2">
                      <Label htmlFor="benchmark">Benchmark para CAPM</Label>
                      <Input
                        id="benchmark"
                        placeholder="Ex: ^BVSP, ^GSPC"
                        value={benchmark}
                        onChange={(e) => setBenchmark(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Índice de referência para o modelo CAPM (^BVSP para Ibovespa)
                      </p>
                    </div>
                  )}
                  
                  {/* Adicionar opção de Machine Learning */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="use-ml">Usar Machine Learning</Label>
                      <Switch 
                        id="use-ml"
                        checked={useMachineLearning}
                        onCheckedChange={setUseMachineLearning}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Utiliza modelos de aprendizado de máquina para prever retornos futuros em vez de média histórica simples.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="period">Período de Dados Históricos</Label>
                    <Select
                      value={period}
                      onValueChange={setPeriod}
                    >
                      <SelectTrigger id="period">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Períodos</SelectLabel>
                          <SelectItem value="1y">1 ano</SelectItem>
                          <SelectItem value="2y">2 anos</SelectItem>
                          <SelectItem value="3y">3 anos</SelectItem>
                          <SelectItem value="5y">5 anos</SelectItem>
                          <SelectItem value="10y">10 anos</SelectItem>
                          <SelectItem value="max">Máximo</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Período de dados para cálculo de retornos históricos
                    </p>
                  </div>
                  
                  {/* Modelo de risco */}
                  <div className="space-y-2">
                    <Label htmlFor="risk-model">Modelo de Risco</Label>
                    <Select 
                      value={riskModel} 
                      onValueChange={setRiskModel}
                    >
                      <SelectTrigger id="risk-model">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sample_cov">Covariância Amostral</SelectItem>
                        <SelectItem value="semicovariance">Semicovariância</SelectItem>
                        <SelectItem value="exp_cov">Covariância Exponencial</SelectItem>
                        <SelectItem value="ledoit_wolf">Ledoit-Wolf Shrinkage</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Método para estimar matriz de covariância
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="risk-free-rate">Taxa Livre de Risco</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Taxa anual de um investimento sem risco (ex: 0.1 para 10% ao ano)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[riskFreeRate * 100]}
                        min={0}
                        max={20}
                        step={0.1}
                        onValueChange={(value) => setRiskFreeRate(value[0] / 100)}
                        className="flex-1"
                      />
                      <div className="w-16 text-right">
                        <Badge variant="outline">
                          {(riskFreeRate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Limites de Alocação</Label>
                      <div className="text-sm text-muted-foreground">
                        Min: {(minWeight * 100).toFixed(0)}% / Max: {(maxWeight * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="pt-4">
                      <Slider
                        value={[minWeight * 100, maxWeight * 100]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          setMinWeight(value[0] / 100);
                          setMaxWeight(value[1] / 100);
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Limites de peso mínimo e máximo para cada ativo
                    </p>
                  </div>
                </div>
                
                {/* Botão de Otimização */}
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={optimizePortfolio} 
                    disabled={isLoading || tickers.length < 2}
                    className="w-full md:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Otimizando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Otimizar Portfólio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Aba de Resultados */}
            <TabsContent value="results" className="space-y-6">
              {!optimizationResult ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sem resultados</AlertTitle>
                  <AlertDescription>
                    Primeiro otimize o portfólio na aba de Otimização.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Título com badge indicando se usou ML */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Pesos Ótimos</h3>
                    {optimizationResult.used_ml_predictions && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Machine Learning
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" />
                          Retorno Esperado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {formatPercent(optimizationResult.performance.expected_annual_return)} <span className="text-sm text-muted-foreground">a.a.</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                          Volatilidade Anual
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {formatPercent(optimizationResult.performance.annual_volatility)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          <Percent className="h-4 w-4 mr-2 text-blue-500" />
                          Índice de Sharpe
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {optimizationResult.performance.sharpe_ratio.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Alocação Otimizada</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ativo</TableHead>
                            <TableHead className="text-right">Peso</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(optimizationResult.weights)
                            .sort((a, b) => Number(b[1]) - Number(a[1]))
                            .map(([ticker, weight]) => (
                              <TableRow key={ticker}>
                                <TableCell>{ticker}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPercent(Number(weight))}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="h-64">
                      <h4 className="text-sm font-medium mb-2">Distribuição Visual</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={prepareWeightsChartData()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                          >
                            {prepareWeightsChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartTooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Peso']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Botão de Salvar */}
                  {onSavePortfolio && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSavePortfolio}
                        className="w-full md:w-auto"
                      >
                        Salvar Portfólio Otimizado
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            {/* Aba de Fronteira Eficiente */}
            <TabsContent value="frontier" className="space-y-6">
              {!efficientFrontierData ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sem dados da fronteira eficiente</AlertTitle>
                  <AlertDescription>
                    Primeiro otimize o portfólio na aba de Otimização.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid />
                        <XAxis 
                          type="number" 
                          dataKey="risk" 
                          name="Risco" 
                          domain={[0, 'dataMax']}
                          label={{ value: 'Risco (Volatilidade Anual)', position: 'insideBottom', offset: -10 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="return" 
                          name="Retorno" 
                          domain={[0, 'dataMax']}
                          label={{ value: 'Retorno Esperado Anual', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartTooltip 
                          formatter={(value) => `${(value * 100).toFixed(2)}%`} 
                          labelFormatter={(_, payload) => {
                            const point = payload[0]?.payload;
                            if (point?.label) {
                              return point.label;
                            }
                            return `Portfólio`;
                          }}
                        />
                        <Scatter 
                          name="Fronteira Eficiente" 
                          data={efficientFrontierData.efficient_frontier} 
                          fill="#8884d8"
                        />
                        
                        {/* Adicionar ponto atual se existir */}
                        {optimizationResult && (
                          <Scatter
                            name="Portfólio Atual"
                            data={[{
                              risk: optimizationResult.performance.annual_volatility,
                              return: optimizationResult.performance.expected_annual_return,
                              label: "Portfólio Otimizado"
                            }]}
                            fill="#ff0000"
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Portfólio Mínima Volatilidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Retorno</p>
                            <p className="font-medium">{formatPercent(efficientFrontierData.min_volatility.return)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Risco</p>
                            <p className="font-medium">{formatPercent(efficientFrontierData.min_volatility.risk)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Portfólio Máximo Sharpe</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Retorno</p>
                            <p className="font-medium">{formatPercent(efficientFrontierData.max_sharpe.return)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Risco</p>
                            <p className="font-medium">{formatPercent(efficientFrontierData.max_sharpe.risk)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Linha de Mercado de Capitais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Taxa Livre de Risco</p>
                            <p className="font-medium">{formatPercent(riskFreeRate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pontos na Fronteira</p>
                            <p className="font-medium">{efficientFrontierData.efficient_frontier.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Aba de Alocação */}
            <TabsContent value="allocation" className="space-y-6">
              {!optimizationResult ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sem portfólio otimizado</AlertTitle>
                  <AlertDescription>
                    Primeiro otimize o portfólio na aba de Otimização.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label htmlFor="portfolio-value">Valor Total do Portfólio</Label>
                      <Input
                        id="portfolio-value"
                        type="number"
                        value={portfolioValue}
                        onChange={(e) => setPortfolioValue(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Valor total para alocação em ativos
                      </p>
                    </div>
                    <Button 
                      onClick={calculateDiscreteAllocation}
                      disabled={isLoading}
                    >
                      Calcular Alocação Discreta
                    </Button>
                  </div>
                  
                  {discreteAllocation && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Alocação Recomendada</h3>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ativo</TableHead>
                            <TableHead className="text-right">Quantidade</TableHead>
                            <TableHead className="text-right">Valor Estimado</TableHead>
                            <TableHead className="text-right">Peso Efetivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(discreteAllocation.allocation)
                            .sort((a, b) => Number(b[1]) - Number(a[1]))
                            .map(([ticker, quantity]) => {
                              // Valores simulados para mostrar no exemplo
                              const price = portfolioValue * discreteAllocation.weights[ticker] / Number(quantity);
                              const estimatedValue = Number(quantity) * price;
                              const effectiveWeight = estimatedValue / (portfolioValue - discreteAllocation.leftover);
                              
                              return (
                                <TableRow key={ticker}>
                                  <TableCell>{ticker}</TableCell>
                                  <TableCell className="text-right">{quantity}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(estimatedValue)}</TableCell>
                                  <TableCell className="text-right">{formatPercent(effectiveWeight)}</TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                        <TableRow>
                          <TableCell colSpan={2} className="font-medium">Não alocado</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(discreteAllocation.leftover)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPercent(discreteAllocation.leftover / portfolioValue)}
                          </TableCell>
                        </TableRow>
                      </Table>
                      
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Observação sobre alocação discreta</AlertTitle>
                        <AlertDescription>
                          Devido à indivisibilidade das ações, a alocação real pode diferir ligeiramente dos pesos teóricos ótimos.
                          O valor não alocado representa o montante que não pôde ser convertido em um número inteiro de ações.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioOptimizer; 