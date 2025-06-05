import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Info, TrendingDown } from "lucide-react";
import { Separator } from "../ui/separator";
import { db } from "../../lib/db";
import { 
  calculateSharpeRatio, 
  calculateSortinoRatio, 
  calculateMaxDrawdown,
  calculateCorrelationMatrix,
  simulateStressScenarios,
  generateRebalancingRecommendations
} from "../../lib/riskMetrics";
import RiskMetricsCard from "./RiskMetricsCard";
import CorrelationHeatmap from "./CorrelationHeatmap";
import StressTestSimulator from "./StressTestSimulator";

interface AdvancedRiskAnalysisProps {
  clienteId?: number;
}

const AdvancedRiskAnalysis: React.FC<AdvancedRiskAnalysisProps> = ({ clienteId }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<any>({
    assets: [],
    weights: {},
    returns: {},
    volatilities: {},
    correlationMatrix: {}
  });
  const [riskMetrics, setRiskMetrics] = useState({
    sharpeRatio: 0,
    sortinoRatio: 0,
    volatility: 0,
    maxDrawdown: 0,
    var95: 0,
    var99: 0
  });
  const [simulationResults, setSimulationResults] = useState<any>({
    worstCase: 0,
    averageCase: 0,
    bestCase: 0,
    results: []
  });
  const [rebalancingRecommendations, setRebalancingRecommendations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("metrics");
  
  useEffect(() => {
    loadPortfolioData();
  }, [clienteId]);
  
  const loadPortfolioData = async () => {
    setIsLoading(true);
    
    try {
      // Carregar posições do cliente
      let posicoes;
      if (clienteId) {
        posicoes = await db.posicoes.where('clienteId').equals(clienteId).toArray();
      } else {
        posicoes = await db.posicoes.toArray();
      }
      
      // Carregar ativos
      const ativos = await db.ativos.toArray();
      const ativosMap = new Map(ativos.map(a => [a.id, a]));
      
      // Processar dados do portfólio
      const assets = [];
      const weights: Record<string, number> = {};
      const returns: Record<string, number[]> = {};
      const volatilities: Record<string, number> = {};
      
      // Valor total do portfólio
      const portfolioTotal = posicoes.reduce((sum, pos) => sum + (pos.valorTotal || 0), 0);
      
      // Processar cada posição
      for (const posicao of posicoes) {
        const ativo = ativosMap.get(posicao.ativoId);
        if (!ativo) continue;
        
        const assetName = ativo.nome;
        assets.push(assetName);
        
        // Calcular peso no portfólio
        const weight = portfolioTotal > 0 ? (posicao.valorTotal || 0) / portfolioTotal : 0;
        weights[assetName] = weight;
        
        // Dados de retorno simulados (em uma aplicação real, seriam dados históricos)
        const simulatedReturns = generateSimulatedReturns(12);
        returns[assetName] = simulatedReturns;
        
        // Volatilidade (desvio padrão dos retornos)
        volatilities[assetName] = calculateStandardDeviation(simulatedReturns);
      }
      
      // Calcular matriz de correlação
      const correlationMatrix = calculateCorrelationMatrix(returns);
      
      // Atualizar estado com os dados do portfólio
      setPortfolioData({
        assets,
        weights,
        returns,
        volatilities,
        correlationMatrix
      });
      
      // Calcular métricas de risco
      calculateRiskMetrics(returns, weights, volatilities, correlationMatrix);
      
      // Simular cenários de estresse
      const expectedReturns: Record<string, number> = {};
      assets.forEach(asset => {
        expectedReturns[asset] = calculateMeanReturn(returns[asset]) * 12; // Anualizar
      });
      
      const stressResults = simulateStressScenarios(
        weights,
        volatilities,
        correlationMatrix,
        expectedReturns
      );
      setSimulationResults(stressResults);
      
      // Gerar recomendações de rebalanceamento
      const targetWeights = generateTargetWeights(assets.length);
      const recommendations = generateRebalancingRecommendations(
        weights,
        targetWeights,
        {
          riskProfile: "Moderado",
          maxAllowedVolatility: 0.15,
          targetReturn: 0.08
        }
      );
      setRebalancingRecommendations(recommendations);
      
    } catch (error) {
      console.error("Erro ao carregar dados do portfólio:", error);
      toast({
        variant: "destructive",
        title: "Erro na análise",
        description: "Não foi possível carregar os dados do portfólio para análise de risco."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função auxiliar para calcular a média de retornos
  const calculateMeanReturn = (returns: number[]): number => {
    if (returns.length === 0) return 0;
    return returns.reduce((sum, value) => sum + value, 0) / returns.length;
  };
  
  // Função auxiliar para calcular o desvio padrão (volatilidade)
  const calculateStandardDeviation = (returns: number[]): number => {
    if (returns.length <= 1) return 0;
    
    const mean = calculateMeanReturn(returns);
    const squaredDifferences = returns.map(ret => Math.pow(ret - mean, 2));
    const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  };
  
  // Função para gerar retornos simulados (numa aplicação real, seriam dados históricos)
  const generateSimulatedReturns = (count: number): number[] => {
    return Array.from({ length: count }, () => (Math.random() * 0.1) - 0.03); // Entre -3% e +7%
  };
  
  // Gerar pesos alvo simulados (numa aplicação real, baseados no perfil de risco)
  const generateTargetWeights = (assetCount: number): Record<string, number> => {
    const targetWeights: Record<string, number> = {};
    const assets = portfolioData.assets;
    
    // Gerar pesos aleatórios que somam 1
    let remainingWeight = 1;
    for (let i = 0; i < assets.length - 1; i++) {
      const maxWeight = remainingWeight * 0.8; // Limitar para garantir diversificação
      const weight = Math.random() * maxWeight;
      targetWeights[assets[i]] = weight;
      remainingWeight -= weight;
    }
    
    // Último ativo recebe o peso restante
    if (assets.length > 0) {
      targetWeights[assets[assets.length - 1]] = remainingWeight;
    }
    
    return targetWeights;
  };
  
  // Calcular todas as métricas de risco
  const calculateRiskMetrics = (
    returns: Record<string, number[]>,
    weights: Record<string, number>,
    volatilities: Record<string, number>,
    correlationMatrix: Record<string, Record<string, number>>
  ) => {
    try {
      // Calcular retornos do portfólio
      const portfolioReturns: number[] = [];
      const timeperiods = Object.values(returns)[0]?.length || 0;
      
      for (let t = 0; t < timeperiods; t++) {
        let periodReturn = 0;
        Object.keys(weights).forEach(asset => {
          if (returns[asset] && returns[asset][t] !== undefined) {
            periodReturn += weights[asset] * returns[asset][t];
          }
        });
        portfolioReturns.push(periodReturn);
      }
      
      // Calcular valores baseados nos preços
      const portfolioPrices = [100]; // Começar com 100
      for (let t = 0; t < portfolioReturns.length; t++) {
        const newPrice = portfolioPrices[t] * (1 + portfolioReturns[t]);
        portfolioPrices.push(newPrice);
      }
      
      // Taxa livre de risco (CDI simulado)
      const riskFreeRate = 0.004; // ~5% a.a. mensal
      
      // Calcular métricas
      const sharpeRatio = calculateSharpeRatio(portfolioReturns, riskFreeRate);
      const sortinoRatio = calculateSortinoRatio(portfolioReturns, riskFreeRate);
      const volatility = calculateStandardDeviation(portfolioReturns);
      const maxDrawdown = calculateMaxDrawdown(portfolioPrices);
      
      // Simular VaR (Value at Risk)
      const expectedReturns: Record<string, number> = {};
      Object.keys(weights).forEach(asset => {
        expectedReturns[asset] = calculateMeanReturn(returns[asset] || []) * 12; // Anualizar
      });
      
      const stressResults = simulateStressScenarios(
        weights,
        volatilities,
        correlationMatrix,
        expectedReturns,
        500 // Menos simulações para performance
      );
      
      setRiskMetrics({
        sharpeRatio,
        sortinoRatio,
        volatility,
        maxDrawdown,
        var95: stressResults.var95,
        var99: stressResults.var99
      });
      
    } catch (error) {
      console.error("Erro ao calcular métricas de risco:", error);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Análise Avançada de Risco</h2>
          <p className="text-muted-foreground">
            Avaliação detalhada de métricas de risco e simulações de cenários
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="metrics">Métricas de Risco</TabsTrigger>
            <TabsTrigger value="correlation">Correlações</TabsTrigger>
            <TabsTrigger value="stress">Testes de Estresse</TabsTrigger>
            <TabsTrigger value="rebalancing">Rebalanceamento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="mt-6">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Calculando métricas de risco...</p>
              </div>
            ) : (
              <RiskMetricsCard
                sharpeRatio={riskMetrics.sharpeRatio}
                sortinoRatio={riskMetrics.sortinoRatio}
                volatility={riskMetrics.volatility}
                maxDrawdown={riskMetrics.maxDrawdown}
                var95={riskMetrics.var95}
                var99={riskMetrics.var99}
              />
            )}
          </TabsContent>
          
          <TabsContent value="correlation" className="mt-6">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Carregando matriz de correlação...</p>
              </div>
            ) : portfolioData.assets.length < 2 ? (
              <div className="py-10 text-center">
                <Info className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  São necessários pelo menos 2 ativos para calcular correlações.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                <CorrelationHeatmap 
                  correlationMatrix={portfolioData.correlationMatrix} 
                  assets={portfolioData.assets}
                />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stress" className="mt-6">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Executando simulações...</p>
              </div>
            ) : (
              <StressTestSimulator 
                simulationResults={simulationResults}
                portfolioWeights={portfolioData.weights}
              />
            )}
          </TabsContent>
          
          <TabsContent value="rebalancing" className="mt-6">
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-4 text-muted-foreground">Gerando recomendações...</p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recomendações de Rebalanceamento</CardTitle>
                  <CardDescription>
                    Sugestões para otimizar a alocação de ativos e reduzir riscos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rebalancingRecommendations.length === 0 ? (
                    <div className="py-10 text-center">
                      <Info className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-4 text-muted-foreground">
                        Sem recomendações de rebalanceamento no momento.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Rebalanceamento Sugerido</AlertTitle>
                        <AlertDescription>
                          Estas recomendações são baseadas na análise de risco atual da carteira.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid gap-4">
                        {rebalancingRecommendations.map((rec, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{rec.asset}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs ${rec.action === 'comprar' ? 'bg-green-100 text-green-800' : rec.action === 'vender' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                {rec.action === 'comprar' ? 'Comprar' : rec.action === 'vender' ? 'Vender' : 'Manter'}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Peso Atual:</span> {(rec.currentWeight * 100).toFixed(2)}%
                              </div>
                              <div>
                                <span className="text-muted-foreground">Peso Alvo:</span> {(rec.targetWeight * 100).toFixed(2)}%
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Ajuste Sugerido:</span> {(rec.amount * 100).toFixed(2)}%
                              </div>
                              <div className="col-span-2 mt-1 text-muted-foreground italic">
                                {rec.reason}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={loadPortfolioData}>Atualizar Análise</Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedRiskAnalysis; 