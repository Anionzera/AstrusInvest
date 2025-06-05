import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/use-toast";
import AdvancedRiskAnalysis from "./AdvancedRiskAnalysis";
import RiskMetricsCard from "./RiskMetricsCard";
import CorrelationHeatmap from "./CorrelationHeatmap";
import StressTestSimulator from "./StressTestSimulator";

// Tipos de dados para os clientes e posições
interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  perfilRisco: "Conservador" | "Moderado" | "Balanceado" | "Agressivo" | "Arrojado";
}

interface Position {
  id: string;
  clienteId: string;
  ativo: string;
  quantidade: number;
  precoMedio: number;
  cotacaoAtual: number;
  categoria: string;
  dataCompra: string;
}

const RiskAnalysisView: React.FC = () => {
  const { clienteId } = useParams<{ clienteId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("metricas");
  const [riskMetrics, setRiskMetrics] = useState<{
    sharpeRatio: number;
    sortinoRatio: number;
    volatility: number;
    maxDrawdown: number;
    var95: number;
    var99: number;
  }>({
    sharpeRatio: 0,
    sortinoRatio: 0,
    volatility: 0,
    maxDrawdown: 0,
    var95: 0,
    var99: 0
  });
  const [correlationMatrix, setCorrelationMatrix] = useState<Record<string, Record<string, number>>>({});
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [simulationResults, setSimulationResults] = useState<{
    scenarios: { name: string; impact: number; description: string }[];
    varMetrics: {
      var95: number;
      var99: number;
      cvar95: number;
      expectedReturn: number;
      worstCase: number;
      bestCase: number;
    };
  }>({
    scenarios: [],
    varMetrics: {
      var95: -8.5,
      var99: -12.3,
      cvar95: -10.8,
      expectedReturn: 6.2,
      worstCase: -15.7,
      bestCase: 18.4
    }
  });
  const [portfolioValue, setPortfolioValue] = useState<number>(0);

  // Verificar permissões do administrador ao iniciar
  useEffect(() => {
    if (!user || !user.isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa ter privilégios de administrador para acessar esta página."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  // Carregar dados do cliente e realizar cálculos de risco
  useEffect(() => {
    const loadClientData = async () => {
      if (!clienteId) return;
      
      setLoading(true);
      try {
        // Simulando busca de dados
        // Em uma implementação real, você buscaria esses dados da API
        setTimeout(() => {
          const mockCliente: Cliente = {
            id: clienteId,
            nome: "João Silva",
            cpf: "123.456.789-00",
            email: "joao@example.com",
            telefone: "(11) 99999-9999",
            dataNascimento: "1980-01-01",
            perfilRisco: "Balanceado"
          };
          
          setCliente(mockCliente);
          calculateRiskMetrics();
          generateCorrelationMatrix();
          generateStressScenarios();
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
        setLoading(false);
      }
    };
    
    loadClientData();
  }, [clienteId]);
  
  // Função para calcular métricas de risco
  const calculateRiskMetrics = () => {
    // Simulando cálculos de métricas de risco
    // Em uma implementação real, você usaria os dados reais da carteira
    setRiskMetrics({
      sharpeRatio: 0.95,
      sortinoRatio: 1.25,
      volatility: 12.6,
      maxDrawdown: 18.5,
      var95: 8.2,
      var99: 12.8
    });
    
    // Simular valor do portfólio
    setPortfolioValue(450000);
  };
  
  // Função para gerar a matriz de correlação
  const generateCorrelationMatrix = () => {
    const categories = [
      "Ações Nacionais",
      "Ações Internacionais",
      "Renda Fixa",
      "Tesouro Direto",
      "Fundos Imobiliários",
      "Multimercado"
    ];
    
    setAssetCategories(categories);
    
    // Criar matriz de correlação simulada
    const matrix: Record<string, Record<string, number>> = {};
    
    categories.forEach(cat1 => {
      matrix[cat1] = {};
      categories.forEach(cat2 => {
        if (cat1 === cat2) {
          matrix[cat1][cat2] = 1;
        } else {
          // Gerar correlações aleatórias mas realistas
          let correlation;
          if (cat1.includes("Ações") && cat2.includes("Ações")) {
            correlation = 0.6 + Math.random() * 0.3; // Correlação alta entre ações
          } else if ((cat1.includes("Renda Fixa") || cat1.includes("Tesouro")) && 
                     (cat2.includes("Renda Fixa") || cat2.includes("Tesouro"))) {
            correlation = 0.7 + Math.random() * 0.25; // Correlação alta entre renda fixa
          } else if ((cat1.includes("Ações") && (cat2.includes("Renda Fixa") || cat2.includes("Tesouro"))) ||
                     (cat2.includes("Ações") && (cat1.includes("Renda Fixa") || cat1.includes("Tesouro")))) {
            correlation = -0.3 + Math.random() * 0.5; // Correlação baixa ou negativa entre ações e renda fixa
          } else {
            correlation = 0.1 + Math.random() * 0.4; // Outras correlações
          }
          
          matrix[cat1][cat2] = correlation;
          matrix[cat2][cat1] = correlation; // Matriz de correlação é simétrica
        }
      });
    });
    
    setCorrelationMatrix(matrix);
  };
  
  // Função para gerar cenários de estresse
  const generateStressScenarios = () => {
    const scenarios = [
      {
        name: "Crise Financeira 2008",
        impact: -28.4,
        description: "Simulação baseada na crise financeira global de 2008, com forte queda em ativos de risco."
      },
      {
        name: "Pandemia COVID-19",
        impact: -22.6,
        description: "Impacto semelhante ao observado no início da pandemia de COVID-19 em março de 2020."
      },
      {
        name: "Estouro da Bolha Tecnológica",
        impact: -15.3,
        description: "Cenário similar à queda do mercado tecnológico no início dos anos 2000."
      },
      {
        name: "Crise Brasileira 2015-2016",
        impact: -18.7,
        description: "Baseado na recessão econômica e crise política brasileira de 2015-2016."
      },
      {
        name: "Alta Inflacionária",
        impact: -12.5,
        description: "Cenário de inflação acelerada e aumento agressivo nas taxas de juros."
      },
      {
        name: "Elevação Acentuada de Juros",
        impact: -9.2,
        description: "Impacto de um ciclo rápido de aumento de juros pelo Banco Central."
      },
      {
        name: "Recuperação Pós-Crise",
        impact: 14.5,
        description: "Cenário de recuperação rápida após um evento de crise, similar ao observado em 2009."
      },
      {
        name: "Crescimento Econômico Forte",
        impact: 17.8,
        description: "Ambiente de forte crescimento econômico com expansão de lucros corporativos."
      }
    ];
    
    setSimulationResults({
      scenarios,
      varMetrics: {
        var95: -8.5,
        var99: -12.3,
        cvar95: -10.8,
        expectedReturn: 6.2,
        worstCase: -15.7,
        bestCase: 18.4
      }
    });
  };
  
  // Função para recarregar os dados
  const handleRefresh = () => {
    setLoading(true);
    calculateRiskMetrics();
    generateCorrelationMatrix();
    generateStressScenarios();
    setTimeout(() => setLoading(false), 1000);
  };
  
  // Função para simular uma nova análise de estresse
  const handleRunSimulation = (params: {
    scenarios: string[];
    simulationCount: number;
    confidenceLevel: number;
    includeHistorical: boolean;
  }) => {
    setLoading(true);
    console.log("Executando simulação com parâmetros:", params);
    
    // Simulação de processamento
    setTimeout(() => {
      // Gerar novos resultados aleatórios mas realistas para a simulação
      const newImpacts = simulationResults.scenarios.map(scenario => ({
        ...scenario,
        impact: scenario.impact * (0.8 + Math.random() * 0.4) // Variação de -20% a +20%
      }));
      
      setSimulationResults({
        scenarios: newImpacts,
        varMetrics: {
          var95: -7.5 - Math.random() * 3,
          var99: -11.0 - Math.random() * 4,
          cvar95: -9.0 - Math.random() * 4,
          expectedReturn: 5.0 + Math.random() * 3,
          worstCase: -14.0 - Math.random() * 5,
          bestCase: 16.0 + Math.random() * 5
        }
      });
      
      setLoading(false);
    }, 2000);
  };
  
  if (loading && !cliente) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-60" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {cliente ? `Análise de Risco: ${cliente.nome}` : "Análise de Risco Avançada"}
          </h1>
          <p className="text-muted-foreground">
            {clienteId 
              ? "Análise detalhada de risco para o portfólio do cliente" 
              : "Ferramentas avançadas de análise de risco para portfólios"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Voltar ao Painel
          </Button>
          <Badge variant={user?.hasRealAdminAccess ? "default" : "outline"} className="ml-2">
            {user?.hasRealAdminAccess ? "Admin Completo" : "Acesso Limitado"}
          </Badge>
        </div>
      </div>
      
      {loading ? (
        <div className="w-full h-[600px] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Calculando métricas de risco...</p>
            <p className="text-sm text-muted-foreground">
              Isso pode levar alguns instantes.
            </p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metricas">Métricas de Risco</TabsTrigger>
            <TabsTrigger value="correlacao">Matriz de Correlação</TabsTrigger>
            <TabsTrigger value="estresse">Testes de Estresse</TabsTrigger>
            <TabsTrigger value="avancado">Análise Avançada</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metricas" className="space-y-4">
            <RiskMetricsCard
              sharpeRatio={riskMetrics.sharpeRatio}
              sortinoRatio={riskMetrics.sortinoRatio}
              volatility={riskMetrics.volatility}
              maxDrawdown={riskMetrics.maxDrawdown}
              var95={riskMetrics.var95}
              var99={riskMetrics.var99}
            />
          </TabsContent>
          
          <TabsContent value="correlacao">
            <CorrelationHeatmap
              correlationMatrix={correlationMatrix}
              assets={assetCategories}
            />
          </TabsContent>
          
          <TabsContent value="estresse">
            <StressTestSimulator
              simulationResults={simulationResults}
              portfolioValue={portfolioValue}
              onRunSimulation={handleRunSimulation}
            />
          </TabsContent>
          
          <TabsContent value="avancado">
            <AdvancedRiskAnalysis clienteId={clienteId ? parseInt(clienteId) : undefined} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default RiskAnalysisView; 