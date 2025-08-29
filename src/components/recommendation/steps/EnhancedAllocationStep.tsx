import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart4, 
  PieChart, 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  Lightbulb,
  RefreshCw,
  Check,
  Info,
  DollarSign,
  Percent,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateSmartRecommendation, ClientContext, EnhancedAssetClass } from "@/lib/smartRecommendationEngine";
import { PieChartComponent } from "@/components/charts/PieChart";
import { RadarChartComponent } from "@/components/charts/RadarChart";

interface AssetAllocationStepProps {
  initialData?: {
    allocation: EnhancedAssetClass[];
  };
  clientData: {
    id?: number;
    name: string;
    age: number;
    riskProfile: string;
    income: number;
    objectives: string[];
  };
  investmentData: {
    initialAmount: number;
    monthlyContribution: number;
    targetHorizon: number;
    targetObjective: string;
  };
  investmentStrategy: string;
  onUpdateAssetAllocation: (data: {
    allocation: EnhancedAssetClass[];
    scenarioProjections?: any;
    regulatoryCompliance?: any;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

const EnhancedAllocationStep: React.FC<AssetAllocationStepProps> = ({
  initialData,
  clientData,
  investmentData,
  investmentStrategy,
  onUpdateAssetAllocation,
  onNext,
  onBack
}) => {
  // Estado para controlar se estamos usando alocação recomendada ou personalizada
  const [allocationType, setAllocationType] = useState<"recomendada" | "personalizada">(
    (initialData as any)?.allocationType || (initialData?.allocation && initialData.allocation.length > 0 ? "personalizada" : "recomendada")
  );
  
  // Estado para alocação de ativos
  const [allocation, setAllocation] = useState<EnhancedAssetClass[]>(
    initialData?.allocation || []
  );
  
  // Estado para guardar a resposta completa do motor de recomendações
  const [recommendationResult, setRecommendationResult] = useState<any>(null);
  
  // Estado para controlar o carregamento
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Estado para cenário selecionado
  const [selectedScenario, setSelectedScenario] = useState<"pessimistic" | "baseline" | "optimistic">("baseline");
  
  // Função para solicitar recomendação ao motor
  const fetchRecommendation = async () => {
    setIsLoading(true);
    
    try {
      // Preparar o contexto do cliente
      const clientContext: ClientContext = {
        id: clientData.id,
        name: clientData.name,
        profile: {
          age: clientData.age,
          riskProfile: clientData.riskProfile,
          income: clientData.income,
          objectives: clientData.objectives
        },
        investmentData: {
          initialAmount: investmentData.initialAmount,
          monthlyContribution: investmentData.monthlyContribution,
          targetHorizon: investmentData.targetHorizon,
          targetObjective: investmentData.targetObjective
        },
        investmentHorizon: investmentData.targetHorizon,
        investmentValue: investmentData.initialAmount,
        investmentObjective: investmentData.targetObjective,
        investmentStrategy: investmentStrategy
      };
      
      console.log(`Enviando estratégia ${investmentStrategy} para o motor de recomendação`);
      
      // Chamar o motor de recomendações
      const result = await generateSmartRecommendation(clientContext);
      
      // Atualizar estados
      setRecommendationResult(result);
      setAllocation(result.enhancedAllocation);
      
      // Notificar o componente pai
      onUpdateAssetAllocation({
        allocation: result.enhancedAllocation,
        scenarioProjections: result.scenarioProjections,
        regulatoryCompliance: result.regulatoryCompliance
      });
      
    } catch (error) {
      console.error("Erro ao gerar recomendação:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar recomendação apenas se a alocação atual estiver vazia
  useEffect(() => {
    if (!allocation || allocation.length === 0) {
      fetchRecommendation();
    }
  }, [investmentStrategy]);
  
  // Atualizar a alocação de um ativo
  const updateAssetAllocation = (assetName: string, newAllocation: number) => {
    setAllocationType("personalizada");
    
    setAllocation(prev => 
      prev.map(asset => 
        asset.name === assetName 
          ? { ...asset, allocation: newAllocation } 
          : asset
      )
    );
  };

  // Propagar alterações manuais para o componente pai
  useEffect(() => {
    if (allocation && allocation.length > 0) {
      onUpdateAssetAllocation({
        allocation,
        scenarioProjections: recommendationResult?.scenarioProjections,
        regulatoryCompliance: recommendationResult?.regulatoryCompliance,
      });
    }
  }, [allocation]);
  
  // Aplicar alocação recomendada
  const applyRecommendedAllocation = () => {
    if (recommendationResult && recommendationResult.enhancedAllocation) {
      setAllocation(recommendationResult.enhancedAllocation);
      setAllocationType("recomendada");
      
      // Notificar o componente pai
      onUpdateAssetAllocation({
        allocation: recommendationResult.enhancedAllocation,
        scenarioProjections: recommendationResult.scenarioProjections,
        regulatoryCompliance: recommendationResult.regulatoryCompliance,
      });
    } else {
      fetchRecommendation();
    }
  };
  
  // Verificar se a alocação totaliza 100%
  const totalAllocation = allocation.reduce((sum, asset) => sum + asset.allocation, 0);
  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.1;
  
  // Calcular métricas para o cenário selecionado
  const getScenarioMetrics = () => {
    if (!recommendationResult || !recommendationResult.scenarioProjections) {
      return {
        expectedReturn: 0,
        riskLevel: 0,
        projectedValue: { oneYear: 0, threeYears: 0, atTarget: 0 }
      };
    }
    
    return recommendationResult.scenarioProjections[selectedScenario];
  };
  
  const scenarioMetrics = getScenarioMetrics();
  
  // Gerar dados para o gráfico de pizza
  const pieChartData = allocation.map(asset => ({
    name: asset.name,
    value: asset.allocation,
    color: asset.color
  }));
  
  // Gerar dados para o gráfico radar
  const getRadarData = () => {
    const metrics = [
      { name: "Retorno", value: scenarioMetrics.expectedReturn / 20 * 100 },
      { name: "Risco", value: Math.min(100, scenarioMetrics.riskLevel * 2) },
      { name: "Liquidez", value: calculateLiquidityScore() },
      { name: "Diversificação", value: calculateDiversificationScore() },
      { name: "Eficiência Fiscal", value: calculateTaxEfficiencyScore() }
    ];
    
    return metrics;
  };
  
  // Calcular pontuações adicionais
  const calculateLiquidityScore = () => {
    // Pontuação baseada nas classes de ativos (simplificado)
    const highLiquidity = allocation.filter(asset => 
      ["Tesouro Direto", "Renda Fixa"].includes(asset.name)
    ).reduce((sum, asset) => sum + asset.allocation, 0);
    
    const mediumLiquidity = allocation.filter(asset => 
      ["Fundos Multimercado", "Renda Variável"].includes(asset.name)
    ).reduce((sum, asset) => sum + asset.allocation, 0);
    
    return (highLiquidity + mediumLiquidity * 0.7) * 0.8;
  };
  
  const calculateDiversificationScore = () => {
    // Número de classes com pelo menos 5% de alocação
    const significantClasses = allocation.filter(asset => asset.allocation >= 5).length;
    return Math.min(100, significantClasses * 15);
  };
  
  const calculateTaxEfficiencyScore = () => {
    // Média ponderada da eficiência fiscal
    const sum = allocation.reduce((acc, asset) => 
      acc + (asset.regulatoryInfo?.taxEfficiency || 0.5) * asset.allocation, 0
    );
    
    return sum;
  };
  
  // Animação para os cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Alocação de Ativos</h2>
          <p className="text-muted-foreground">
            Visualize e ajuste a alocação recomendada para o cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecommendation}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar com Estratégia
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={applyRecommendedAllocation}
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            Aplicar Recomendação
          </Button>
        </div>
      </div>
      
      {/* Seleção do tipo de alocação */}
      <Card className="overflow-hidden border-muted/40">
        <CardHeader className="bg-muted/20 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Lightbulb className="h-5 w-5 text-primary" />
            Modo de Alocação
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-center md:justify-start gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={allocationType === "recomendada"}
                onCheckedChange={(checked) => {
                  if (checked) {
                    applyRecommendedAllocation();
                  } else {
                    setAllocationType("personalizada");
                    onUpdateAssetAllocation({
                      allocation,
                      scenarioProjections: recommendationResult?.scenarioProjections,
                      regulatoryCompliance: recommendationResult?.regulatoryCompliance,
                    });
                  }
                }}
              />
              <span>Recomendação Inteligente</span>
            </div>
          </div>
          
          {allocationType === "recomendada" && recommendationResult?.personalizationFactors && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Fatores considerados na recomendação:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {recommendationResult.personalizationFactors.map((factor: string, index: number) => (
                  <Badge key={index} variant="secondary" className="font-normal">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Layout principal - grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - Alocação e ajustes */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Distribuição de Ativos
              </CardTitle>
              <Badge variant={isAllocationValid ? "outline" : "destructive"}>
                Total: {totalAllocation.toFixed(1)}%
              </Badge>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico */}
                <div className="flex justify-center items-center">
                  <div className="h-[230px] w-[230px]">
                    <PieChartComponent data={pieChartData} />
                  </div>
                </div>
                
                {/* Legenda e dados resumidos */}
                <div className="space-y-3">
                  {allocation.filter(asset => asset.allocation > 0).map((asset, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: asset.color }} />
                        <span className="text-sm">{asset.name}</span>
                      </div>
                      <div className="font-medium">{asset.allocation}%</div>
                    </div>
                  ))}
                  
                  {!isAllocationValid && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        A alocação total deve ser 100%. Atualmente: {totalAllocation.toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Ajuste de alocação */}
          <Card>
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Ajuste de Alocação
              </CardTitle>
              <CardDescription>
                {allocationType === "recomendada" 
                  ? "Alocação recomendada pelo motor inteligente" 
                  : "Ajuste os valores conforme sua preferência"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-5">
              <AnimatePresence>
                {allocation.map((asset, index) => (
                  <motion.div 
                    key={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: asset.color }} 
                        />
                        <span className="font-medium">{asset.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-14 text-right">{asset.allocation}%</span>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[300px]">
                              <p className="font-semibold">{asset.name}</p>
                              <p>Retorno esperado: {asset.expectedReturn?.baseline}%</p>
                              <p>Categoria: {asset.regulatoryInfo?.regulatoryCategory}</p>
                              <p>Adequação: {asset.regulatoryInfo?.suitabilityProfiles.join(", ")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-full">
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[asset.allocation]}
                          onValueChange={(values) => updateAssetAllocation(asset.name, values[0])}
                          disabled={allocationType === "recomendada"}
                        />
                      </div>
                      
                      <div className="w-[120px] flex justify-between">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateAssetAllocation(asset.name, Math.max(0, asset.allocation - 5))}
                          disabled={allocationType === "recomendada" || asset.allocation <= 0}
                        >
                          -
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateAssetAllocation(asset.name, Math.min(100, asset.allocation + 5))}
                          disabled={allocationType === "recomendada" || asset.allocation >= 100}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    
                    {index < allocation.length - 1 && <Separator className="my-3" />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
        
        {/* Coluna direita - Estatísticas */}
        <div className="space-y-6">
          {/* Cenários */}
          <Card>
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Cenários de Retorno
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Tabs 
                value={selectedScenario} 
                onValueChange={(value) => setSelectedScenario(value as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="pessimistic" className="text-sm">Pessimista</TabsTrigger>
                  <TabsTrigger value="baseline" className="text-sm">Base</TabsTrigger>
                  <TabsTrigger value="optimistic" className="text-sm">Otimista</TabsTrigger>
                </TabsList>
                
                <div className="space-y-5 pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-muted-foreground">Retorno Anual</span>
                      <span className="font-semibold text-lg">
                        {scenarioMetrics.expectedReturn?.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, scenarioMetrics.expectedReturn * 5)} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-muted-foreground">Nível de Risco</span>
                      <Badge variant="outline">
                        {scenarioMetrics.riskLevel < 20 ? "Baixo" : 
                         scenarioMetrics.riskLevel < 35 ? "Médio" : "Alto"}
                      </Badge>
                    </div>
                    <Progress 
                      value={Math.min(100, scenarioMetrics.riskLevel * 2)} 
                      className="h-2"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="pt-1">
                    <h4 className="font-medium mb-3">Projeção de Patrimônio</h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Em 1 ano</span>
                        <span className="font-medium">
                          R$ {scenarioMetrics.projectedValue?.oneYear?.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Em 3 anos</span>
                        <span className="font-medium">
                          R$ {scenarioMetrics.projectedValue?.threeYears?.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-primary/5 p-2 rounded">
                        <span className="text-sm font-medium">No horizonte alvo</span>
                        <span className="font-semibold">
                          R$ {scenarioMetrics.projectedValue?.atTarget?.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Análise de Perfil */}
          <Card>
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Adequação ao Perfil
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="h-[200px] mb-4">
                <RadarChartComponent data={getRadarData()} />
              </div>
              
              {recommendationResult?.regulatoryCompliance && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Conformidade</span>
                    <Badge 
                      variant="outline"
                      className={`${recommendationResult.regulatoryCompliance.isCompliant ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                    >
                      {recommendationResult.regulatoryCompliance.isCompliant ? "Adequado" : "Requer Atenção"}
                    </Badge>
                  </div>
                  
                  {recommendationResult.regulatoryCompliance.warnings.length > 0 && (
                    <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Avisos de Conformidade</AlertTitle>
                      <AlertDescription className="mt-2">
                        <ul className="list-disc pl-4 space-y-1 text-sm">
                          {recommendationResult.regulatoryCompliance.warnings.map((warning: string, idx: number) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Botões de navegação */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!isAllocationValid}
          className="flex items-center gap-2"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default EnhancedAllocationStep; 