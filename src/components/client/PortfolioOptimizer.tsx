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
import { AlertCircle, TrendingUp, BarChart4, RefreshCw, PlusCircle, Percent, ArrowUpRight, AlertTriangle, HelpCircle } from "lucide-react";
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

interface PortfolioOptimizerProps {
  clienteId?: number;
  onSavePortfolio?: (weights: Record<string, number>) => void;
  initialAllocation?: { name: string; allocation: number; color: string }[]; // Alocação inicial de classes de ativos
}

type OptimizationMethod = 
  | "efficient_frontier" 
  | "black_litterman" 
  | "hrp"
  | "equal_weight"
  | "min_volatility"
  | "max_sharpe";

const methodLabels: Record<OptimizationMethod, string> = {
  "efficient_frontier": "Fronteira Eficiente",
  "black_litterman": "Black-Litterman",
  "hrp": "Hierarchical Risk Parity",
  "equal_weight": "Pesos Iguais",
  "min_volatility": "Mínima Volatilidade",
  "max_sharpe": "Máximo Índice de Sharpe"
};

const methodDescriptions: Record<OptimizationMethod, string> = {
  "efficient_frontier": "Otimização clássica de média-variância que busca o melhor equilíbrio entre retorno esperado e risco.",
  "black_litterman": "Combina retornos de equilíbrio de mercado com visões do investidor para criar alocações mais robustas.",
  "hrp": "Utiliza agrupamento hierárquico para criar portfólios diversificados sem depender de estimativas de retorno.",
  "equal_weight": "Aloca o mesmo peso para todos os ativos, uma estratégia simples e muitas vezes eficaz.",
  "min_volatility": "Busca o portfólio com a menor volatilidade possível, independente do retorno.",
  "max_sharpe": "Busca o portfólio com a melhor relação entre retorno e risco (maior índice de Sharpe)."
};

const DEFAULT_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57"
];

const PortfolioOptimizer: React.FC<PortfolioOptimizerProps> = ({ 
  clienteId, 
  onSavePortfolio,
  initialAllocation 
}) => {
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
  
  // Resultados da otimização
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [efficientFrontierData, setEfficientFrontierData] = useState<any>(null);
  const [discreteAllocation, setDiscreteAllocation] = useState<any>(null);
  const [portfolioValue, setPortfolioValue] = useState<number>(100000);
  
  // Estado para armazenar o mapeamento de ativos para categorias
  const [assetCategories, setAssetCategories] = useState<Record<string, string>>({});
  
  // Estado para controlar se devemos respeitar as restrições de classe de ativos
  const [respectAssetClassConstraints, setRespectAssetClassConstraints] = useState<boolean>(
    initialAllocation !== undefined
  );
  
  // Efeito para carregar tickers do cliente, se disponível
  useEffect(() => {
    if (clienteId) {
      loadClientAssets();
    }
  }, [clienteId]);

  // Efeito para mapear tickers para categorias quando tickers mudam
  useEffect(() => {
    if (tickers.length > 0) {
      inferAssetCategories();
    }
  }, [tickers]);
  
  // Função para inferir categorias de ativos a partir dos tickers
  const inferAssetCategories = async () => {
    try {
      // Tentar obter categorias dos ativos a partir do banco de dados
      const categoriesMap: Record<string, string> = {};
      
      for (const ticker of tickers) {
        const tickerUpper = ticker.toUpperCase();
        
        // Inferir categorias a partir de padrões de nomes
        // Ações brasileiras
        if (/^PETR|VALE|ITUB|BBDC|ABEV|WEGE|MGLU/.test(tickerUpper)) {
          categoriesMap[ticker] = "Renda Variável";
        } else if (/^BPAC|ITSA|B3SA|BBAS/.test(tickerUpper)) {
          categoriesMap[ticker] = "Renda Variável";
        } 
        // Fundos Imobiliários
        else if (/^KNRI|HGLG|MXRF|BCFF|XPLG/.test(tickerUpper)) {
          categoriesMap[ticker] = "Fundos Imobiliários";
        } 
        // Índices
        else if (/^IBOV|BOVESPA|^BVSP/.test(tickerUpper)) {
          categoriesMap[ticker] = "Índices";
        } else if (/^SP500|^GSPC|^S&P/.test(tickerUpper)) {
          categoriesMap[ticker] = "Índices";
        } else if (/^NASDAQ|^IXIC|^DOW|^DJI|^DJIA|^FTSE|^DAX|^NIKKEI/.test(tickerUpper)) {
          categoriesMap[ticker] = "Índices";
        }
        // Criptomoedas
        else if (/^BTC|^ETH|^XRP|^LTC|^ADA|^DOT|^BNB|^DOGE|^SOL|^USDT|^USDC/.test(tickerUpper)) {
          categoriesMap[ticker] = "Criptomoedas";
        }
        // Internacionais
        else if (/^IVVB|BEEF|NASD/.test(tickerUpper)) {
          categoriesMap[ticker] = "Internacional";
        } 
        // Renda Fixa
        else if (/^LFT|LTN|NTN|CDB|DEB|FIDC/.test(tickerUpper)) {
          categoriesMap[ticker] = "Renda Fixa";
        } else {
          // Categoria padrão para tickers não reconhecidos
          categoriesMap[ticker] = "Outros";
        }
      }
      
      setAssetCategories(categoriesMap);
    } catch (error) {
      console.error("Erro ao inferir categorias de ativos:", error);
    }
  };
  
  // Função para extrair restrições de categorias da alocação inicial
  const extractCategoryConstraints = () => {
    if (!initialAllocation || !respectAssetClassConstraints) {
      return undefined;
    }
    
    const constraints: Record<string, [number, number, number]> = {};
    
    initialAllocation.forEach(assetClass => {
      // Usar a alocação como valor alvo, com margem de tolerância
      const targetWeight = assetClass.allocation / 100;
      const tolerance = 0.05; // 5% de tolerância
      
      constraints[assetClass.name] = [
        Math.max(0, targetWeight - tolerance), // Mínimo
        targetWeight,                         // Alvo
        Math.min(1, targetWeight + tolerance) // Máximo
      ];
    });
    
    return constraints;
  };
  
  // Função para carregar ativos do cliente a partir do banco de dados
  const loadClientAssets = async () => {
    try {
      if (!clienteId) return;
      
      // Buscar posições do cliente
      const positions = await db.posicoes
        .where('clienteId')
        .equals(clienteId)
        .toArray();
      
      if (positions.length === 0) {
        toast({
          title: "Sem ativos",
          description: "Este cliente não possui ativos para otimização.",
          variant: "destructive"
        });
        return;
      }
      
      // Buscar detalhes dos ativos
      const clientTickers: string[] = [];
      let totalValue = 0;
      
      for (const position of positions) {
        const asset = await db.ativos.get(position.ativoId);
        if (asset && asset.ticker) {
          clientTickers.push(asset.ticker);
          totalValue += position.quantidade * position.precoMedio;
        }
      }
      
      if (clientTickers.length > 0) {
        setTickers(clientTickers);
        setPortfolioValue(totalValue);
        
        toast({
          title: "Ativos carregados",
          description: `${clientTickers.length} ativos carregados do portfólio do cliente.`
        });
      }
    } catch (error) {
      console.error("Erro ao carregar ativos do cliente:", error);
      toast({
        title: "Erro ao carregar ativos",
        description: "Não foi possível carregar os ativos do cliente.",
        variant: "destructive"
      });
    }
  };
  
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
      // Extrair restrições de categorias se disponíveis
      const categoryConstraints = extractCategoryConstraints();
      
      const response = await axios.post('/api/portfolio/optimize', {
        tickers,
        method: optimizationMethod,
        risk_free_rate: riskFreeRate,
        target_return: targetReturn,
        target_risk: targetRisk,
        min_weight: minWeight,
        max_weight: maxWeight,
        period,
        asset_categories: assetCategories,
        category_constraints: categoryConstraints
      });
      
      setOptimizationResult(response.data);
      
      // Verificar se as restrições de categoria foram respeitadas
      if (categoryConstraints && response.data.category_allocations) {
        const categoryAllocations = response.data.category_allocations;
        let constraintViolations = [];
        
        for (const [category, [min, target, max]] of Object.entries(categoryConstraints)) {
          const actual = categoryAllocations[category] || 0;
          if (actual < min || actual > max) {
            constraintViolations.push(
              `${category}: Esperado ${(target*100).toFixed(1)}% (±5%), Atual ${(actual*100).toFixed(1)}%`
            );
          }
        }
        
        if (constraintViolations.length > 0) {
          toast({
            title: "Aviso: Algumas restrições de classe de ativos não puderam ser totalmente satisfeitas",
            description: constraintViolations.join(", "),
            variant: "warning"
          });
        } else {
          toast({
            title: "Otimização concluída",
            description: "Portfólio otimizado com sucesso respeitando as restrições de classe de ativos."
          });
        }
      } else {
        toast({
          title: "Otimização concluída",
          description: "Portfólio otimizado com sucesso."
        });
      }
      
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
        period
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
      // Extrair restrições de categorias se disponíveis
      const categoryConstraints = extractCategoryConstraints();
      
      const response = await axios.post('/api/portfolio/discrete-allocation', {
        tickers,
        method: optimizationMethod,
        risk_free_rate: riskFreeRate,
        total_value: portfolioValue,
        period,
        asset_categories: assetCategories,
        category_constraints: categoryConstraints
      });
      
      setDiscreteAllocation(response.data);
      
      toast({
        title: "Alocação discreta calculada",
        description: `Alocação de ${formatCurrency(portfolioValue)} em ${Object.keys(response.data.allocation).length} ativos.`
      });
    } catch (error: any) {
      console.error("Erro na alocação discreta:", error);
      const errorMessage = error.response?.data?.error || "Não foi possível calcular a alocação discreta.";
      
      toast({
        title: "Erro na alocação discreta",
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
    <Card className="w-full">
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="optimization">Otimização</TabsTrigger>
            <TabsTrigger value="results" disabled={!optimizationResult}>Resultados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="optimization" className="space-y-4">
            {/* Seção de Ativos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ativos</h3>
              
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
              </div>
              
              {/* Restrições de Classe de Ativos */}
              {initialAllocation && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Restrições de Classe de Ativos</h3>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="respect-constraints">Respeitar alocação da recomendação</Label>
                      <input
                        type="checkbox"
                        id="respect-constraints"
                        checked={respectAssetClassConstraints}
                        onChange={(e) => setRespectAssetClassConstraints(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  {respectAssetClassConstraints && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        O otimizador respeitará as seguintes alocações por classe de ativo (com margem de ±5%):
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {initialAllocation.map((assetClass) => (
                          <div key={assetClass.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span style={{ color: assetClass.color }} className="font-medium">
                              {assetClass.name}:
                            </span>
                            <span className="font-bold">{assetClass.allocation}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Método de Otimização */}
              <div className="space-y-2">
                <Label htmlFor="optimization-method">Método de Otimização</Label>
                <Select 
                  value={optimizationMethod} 
                  onValueChange={(value) => setOptimizationMethod(value as OptimizationMethod)}
                >
                  <SelectTrigger id="optimization-method">
                    <SelectValue placeholder="Selecione um método" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(methodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {methodDescriptions[optimizationMethod]}
                </p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                onClick={optimizePortfolio} 
                disabled={isLoading || tickers.length < 2}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Otimizando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Otimizar Portfólio
                  </>
                )}
              </Button>
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
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PortfolioOptimizer; 