import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  ArrowLeft, 
  PieChart, 
  BarChart4, 
  Sliders, 
  DollarSign, 
  TrendingUp,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AssetClass {
  name: string;
  allocation: number;
  color: string;
  expectedReturn?: {
    pessimistic: number;
    baseline: number;
    optimistic: number;
  };
  regulatoryInfo?: {
    suitabilityProfiles: string[];
    requiredDisclosures: string[];
    regulatoryCategory: string;
    taxEfficiency: number;
  };
}

interface AssetAllocationStepProps {
  initialData?: {
    allocation: AssetClass[];
  };
  clientRiskProfile: string;
  investmentStrategy: string;
  onUpdateAssetAllocation: (data: {
    allocation: AssetClass[];
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Definir classes de ativos disponíveis
const ASSET_CLASSES: AssetClass[] = [
  {
    name: "Tesouro Direto",
    allocation: 0,
    color: "#4CAF50",
    expectedReturn: {
      pessimistic: 7.0,
      baseline: 8.5,
      optimistic: 10.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["conservador", "moderado", "agressivo"],
      requiredDisclosures: ["Garantido pelo Tesouro Nacional"],
      regulatoryCategory: "Renda Fixa",
      taxEfficiency: 0.85
    }
  },
  {
    name: "Renda Fixa",
    allocation: 0,
    color: "#8BC34A",
    expectedReturn: {
      pessimistic: 7.5,
      baseline: 9.0,
      optimistic: 10.5
    },
    regulatoryInfo: {
      suitabilityProfiles: ["conservador", "moderado", "agressivo"],
      requiredDisclosures: ["Sujeito a risco de crédito do emissor"],
      regulatoryCategory: "Renda Fixa",
      taxEfficiency: 0.8
    }
  },
  {
    name: "Fundos Imobiliários",
    allocation: 0,
    color: "#FF9800",
    expectedReturn: {
      pessimistic: 6.0,
      baseline: 10.0,
      optimistic: 14.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["moderado", "agressivo"],
      requiredDisclosures: ["Sujeito a oscilações do mercado imobiliário"],
      regulatoryCategory: "Fundo de Investimento",
      taxEfficiency: 1.0
    }
  },
  {
    name: "Renda Variável",
    allocation: 0,
    color: "#F44336",
    expectedReturn: {
      pessimistic: 0.0,
      baseline: 12.0,
      optimistic: 25.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["moderado", "agressivo"],
      requiredDisclosures: ["Alta volatilidade", "Possibilidade de perda do capital investido"],
      regulatoryCategory: "Renda Variável",
      taxEfficiency: 0.75
    }
  },
  {
    name: "Fundos Multimercado",
    allocation: 0,
    color: "#9C27B0",
    expectedReturn: {
      pessimistic: 4.0,
      baseline: 10.0,
      optimistic: 16.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["moderado", "agressivo"],
      requiredDisclosures: ["Estratégias complexas", "Diversas classes de ativos"],
      regulatoryCategory: "Fundo de Investimento",
      taxEfficiency: 0.7
    }
  },
  {
    name: "Investimentos Internacionais",
    allocation: 0,
    color: "#2196F3",
    expectedReturn: {
      pessimistic: 2.0,
      baseline: 11.0,
      optimistic: 20.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["agressivo"],
      requiredDisclosures: ["Risco cambial", "Regras tributárias específicas"],
      regulatoryCategory: "Investimento no Exterior",
      taxEfficiency: 0.65
    }
  },
  {
    name: "Criptomoedas",
    allocation: 0,
    color: "#607D8B",
    expectedReturn: {
      pessimistic: -30.0,
      baseline: 15.0,
      optimistic: 100.0
    },
    regulatoryInfo: {
      suitabilityProfiles: ["agressivo"],
      requiredDisclosures: [
        "Altíssima volatilidade", 
        "Ativo não regulamentado pela CVM", 
        "Risco de perda total"
      ],
      regulatoryCategory: "Ativo Alternativo",
      taxEfficiency: 0.6
    }
  }
];

// Modelos de alocação pré-definidos baseados no perfil de risco
const ALLOCATION_MODELS = {
  conservador: {
    "Tesouro Direto": 45,
    "Renda Fixa": 40,
    "Fundos Imobiliários": 10,
    "Renda Variável": 5,
    "Fundos Multimercado": 0,
    "Investimentos Internacionais": 0,
    "Criptomoedas": 0
  },
  moderado: {
    "Tesouro Direto": 25,
    "Renda Fixa": 30,
    "Fundos Imobiliários": 15,
    "Renda Variável": 20,
    "Fundos Multimercado": 7,
    "Investimentos Internacionais": 3,
    "Criptomoedas": 0
  },
  agressivo: {
    "Tesouro Direto": 10,
    "Renda Fixa": 15,
    "Fundos Imobiliários": 15,
    "Renda Variável": 35,
    "Fundos Multimercado": 10,
    "Investimentos Internacionais": 10,
    "Criptomoedas": 5
  }
};

// Estratégias e suas alocações recomendadas
const STRATEGY_ALLOCATIONS = {
  "renda-fixa-conservadora": {
    "Tesouro Direto": 40,
    "Renda Fixa": 45,
    "Fundos Imobiliários": 10,
    "Renda Variável": 5,
    "Fundos Multimercado": 0,
    "Investimentos Internacionais": 0,
    "Criptomoedas": 0
  },
  "renda-balance": {
    "Tesouro Direto": 20,
    "Renda Fixa": 35,
    "Fundos Imobiliários": 15,
    "Renda Variável": 20,
    "Fundos Multimercado": 5,
    "Investimentos Internacionais": 5,
    "Criptomoedas": 0
  },
  "crescimento-acelerado": {
    "Tesouro Direto": 10,
    "Renda Fixa": 20,
    "Fundos Imobiliários": 15,
    "Renda Variável": 35,
    "Fundos Multimercado": 10,
    "Investimentos Internacionais": 7,
    "Criptomoedas": 3
  },
  "renda-passiva": {
    "Tesouro Direto": 15,
    "Renda Fixa": 30,
    "Fundos Imobiliários": 30,
    "Renda Variável": 20,
    "Fundos Multimercado": 5,
    "Investimentos Internacionais": 0,
    "Criptomoedas": 0
  },
  "protecao-inflacionaria": {
    "Tesouro Direto": 30,
    "Renda Fixa": 25,
    "Fundos Imobiliários": 20,
    "Renda Variável": 15,
    "Fundos Multimercado": 5,
    "Investimentos Internacionais": 5,
    "Criptomoedas": 0
  },
  "diversificacao-global": {
    "Tesouro Direto": 10,
    "Renda Fixa": 15,
    "Fundos Imobiliários": 10,
    "Renda Variável": 25,
    "Fundos Multimercado": 15,
    "Investimentos Internacionais": 25,
    "Criptomoedas": 0
  },
  "oportunista": {
    "Tesouro Direto": 5,
    "Renda Fixa": 10,
    "Fundos Imobiliários": 10,
    "Renda Variável": 40,
    "Fundos Multimercado": 15,
    "Investimentos Internacionais": 15,
    "Criptomoedas": 5
  }
};

const AssetAllocationStep: React.FC<AssetAllocationStepProps> = ({
  initialData,
  clientRiskProfile,
  investmentStrategy,
  onUpdateAssetAllocation,
  onNext,
  onBack
}) => {
  // Normalizar o perfil de risco
  const normalizedProfile = clientRiskProfile.toLowerCase() as "conservador" | "moderado" | "agressivo";
  
  // Estado para o tipo de alocação (recomendada ou personalizada)
  const [allocationType, setAllocationType] = useState<"recomendada" | "personalizada">(
    initialData ? "personalizada" : "recomendada"
  );
  
  // Estado para a alocação de ativos
  const [allocation, setAllocation] = useState<AssetClass[]>(() => {
    if (initialData?.allocation && initialData.allocation.length > 0) {
      return initialData.allocation;
    }
    
    // Determinar modelo de alocação apropriado
    let model = ALLOCATION_MODELS[normalizedProfile];
    
    // Se tiver uma estratégia definida, usar a alocação da estratégia
    if (investmentStrategy && STRATEGY_ALLOCATIONS[investmentStrategy]) {
      model = STRATEGY_ALLOCATIONS[investmentStrategy];
    }
    
    // Criar alocação baseada no modelo
    return ASSET_CLASSES.map(assetClass => ({
      ...assetClass,
      allocation: model[assetClass.name] || 0
    }));
  });
  
  // Atualizar o componente pai quando a alocação mudar
  useEffect(() => {
    onUpdateAssetAllocation({ allocation });
  }, [allocation]);
  
  // Verificar se a alocação total é 100%
  const isAllocationValid = (): boolean => {
    const total = allocation.reduce((sum, asset) => sum + asset.allocation, 0);
    return Math.abs(total - 100) < 0.01; // Permitir uma pequena margem de erro
  };
  
  // Aplicar modelo de alocação recomendado
  const applyRecommendedAllocation = () => {
    let model = ALLOCATION_MODELS[normalizedProfile];
    
    // Se tiver uma estratégia definida, usar a alocação da estratégia
    if (investmentStrategy && STRATEGY_ALLOCATIONS[investmentStrategy]) {
      model = STRATEGY_ALLOCATIONS[investmentStrategy];
    }
    
    setAllocation(ASSET_CLASSES.map(assetClass => ({
      ...assetClass,
      allocation: model[assetClass.name] || 0
    })));
    
    setAllocationType("recomendada");
  };
  
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
  
  // Calcular estatísticas da alocação
  const calculateAllocationStats = () => {
    const baselineReturn = allocation.reduce(
      (sum, asset) => sum + (asset.expectedReturn?.baseline || 0) * asset.allocation / 100,
      0
    );
    
    const pessimisticReturn = allocation.reduce(
      (sum, asset) => sum + (asset.expectedReturn?.pessimistic || 0) * asset.allocation / 100,
      0
    );
    
    const optimisticReturn = allocation.reduce(
      (sum, asset) => sum + (asset.expectedReturn?.optimistic || 0) * asset.allocation / 100,
      0
    );
    
    const volatility = Math.sqrt(
      allocation.reduce((sum, asset) => {
        // Estimativa de volatilidade baseada na diferença entre retornos otimistas e pessimistas
        const assetVolatility = 
          ((asset.expectedReturn?.optimistic || 0) - (asset.expectedReturn?.pessimistic || 0)) / 4;
        return sum + Math.pow(assetVolatility * asset.allocation / 100, 2);
      }, 0)
    ) * 100;
    
    // Verificar se a alocação é adequada ao perfil de risco
    const isConservadorCompatible = allocation.every(asset => 
      !asset.regulatoryInfo || asset.regulatoryInfo.suitabilityProfiles.includes("conservador")
    );
    
    const isModeradoCompatible = allocation.every(asset => 
      !asset.regulatoryInfo || asset.regulatoryInfo.suitabilityProfiles.includes("moderado")
    );
    
    // Verificar se há ativos de alto risco em proporção significativa
    const highRiskAssets = allocation.filter(asset => 
      asset.regulatoryInfo?.suitabilityProfiles.includes("agressivo") && 
      !asset.regulatoryInfo.suitabilityProfiles.includes("moderado")
    );
    
    const highRiskAllocation = highRiskAssets.reduce((sum, asset) => sum + asset.allocation, 0);
    
    let profileCompatibility: 'compatible' | 'warning' | 'incompatible' = 'compatible';
    
    if (normalizedProfile === "conservador") {
      if (!isConservadorCompatible) {
        profileCompatibility = 'incompatible';
      } else if (highRiskAllocation > 5) {
        profileCompatibility = 'warning';
      }
    } else if (normalizedProfile === "moderado") {
      if (!isModeradoCompatible) {
        profileCompatibility = 'warning';
      } else if (highRiskAllocation > 15) {
        profileCompatibility = 'warning';
      }
    }
    
    return {
      baselineReturn,
      pessimisticReturn,
      optimisticReturn,
      volatility,
      profileCompatibility,
      highRiskAllocation
    };
  };
  
  const stats = calculateAllocationStats();
  const totalAllocation = allocation.reduce((sum, asset) => sum + asset.allocation, 0);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Alocação de Ativos</h2>
          <p className="text-muted-foreground">
            Distribua a alocação entre as diferentes classes de ativos
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className="text-xs">
            Perfil: {clientRiskProfile}
          </Badge>
          {investmentStrategy && (
            <Badge variant="outline" className="text-xs">
              Estratégia: {investmentStrategy}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Seleção do tipo de alocação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tipo de Alocação</CardTitle>
          <CardDescription>
            Escolha entre a alocação recomendada pelo sistema ou personalize a distribuição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={allocationType}
            onValueChange={(value) => {
              if (value === "recomendada") {
                applyRecommendedAllocation();
              } else {
                setAllocationType("personalizada");
              }
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div className={`flex items-center space-x-2 rounded-md border p-4 transition-colors ${
              allocationType === "recomendada" ? "border-primary bg-primary/5" : ""
            }`}>
              <RadioGroupItem value="recomendada" id="recomendada" />
              <Label htmlFor="recomendada" className="flex flex-col cursor-pointer">
                <span className="font-medium">Alocação Recomendada</span>
                <span className="text-sm text-muted-foreground">
                  Baseada no perfil e estratégia selecionados
                </span>
              </Label>
            </div>
            
            <div className={`flex items-center space-x-2 rounded-md border p-4 transition-colors ${
              allocationType === "personalizada" ? "border-primary bg-primary/5" : ""
            }`}>
              <RadioGroupItem value="personalizada" id="personalizada" />
              <Label htmlFor="personalizada" className="flex flex-col cursor-pointer">
                <span className="font-medium">Alocação Personalizada</span>
                <span className="text-sm text-muted-foreground">
                  Ajuste manualmente a distribuição de ativos
                </span>
              </Label>
            </div>
          </RadioGroup>
          
          {allocationType === "recomendada" && (
            <div className="mt-4">
              <Button variant="outline" onClick={() => setAllocationType("personalizada")}>
                Personalizar esta alocação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alocação de ativos */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  <span>Distribuição de Ativos</span>
                </CardTitle>
                <Badge 
                  variant={totalAllocation === 100 ? "default" : "destructive"} 
                  className="text-xs"
                >
                  Total: {totalAllocation}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {allocation.map((asset, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: asset.color }} 
                      />
                      <Label className="text-sm font-medium">{asset.name}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{asset.allocation}%</Badge>
                      <span className="text-xs text-muted-foreground">
                        Retorno: {asset.expectedReturn?.baseline}%
                      </span>
                    </div>
                  </div>
                  
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[asset.allocation]}
                    onValueChange={(values) => updateAssetAllocation(asset.name, values[0])}
                    disabled={allocationType === "recomendada"}
                    className="py-1"
                  />
                  
                  {asset.regulatoryInfo && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Perfis adequados: {asset.regulatoryInfo.suitabilityProfiles.join(", ")}</span>
                      <span>Eficiência fiscal: {(asset.regulatoryInfo.taxEfficiency * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  
                  {index < allocation.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
              
              {totalAllocation !== 100 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A soma da alocação deve ser igual a 100%. Ajuste os valores para continuar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Resumo e estatísticas */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <span>Visualização</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full bg-gradient-to-b from-primary/5 to-primary/10 rounded-lg p-4 flex items-center justify-center">
                <p className="text-center text-muted-foreground">
                  Gráfico de pizza com alocação <br />
                  (Seria renderizado aqui)
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart4 className="h-5 w-5 text-primary" />
                <span>Estatísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Retorno Esperado (Baseline)</Label>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">{stats.baselineReturn.toFixed(1)}%</span>
                  <Badge variant="outline" className="text-xs">
                    a.a.
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Faixa de Retorno</Label>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-red-500">{stats.pessimisticReturn.toFixed(1)}%</span>
                  <span>a</span>
                  <span className="text-green-500">{stats.optimisticReturn.toFixed(1)}%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Volatilidade Estimada</Label>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{stats.volatility.toFixed(1)}%</span>
                  <Badge 
                    variant={
                      stats.volatility < 5 ? "outline" : 
                      stats.volatility < 10 ? "secondary" : 
                      "default"
                    } 
                    className="text-xs"
                  >
                    {stats.volatility < 5 ? "Baixa" : 
                     stats.volatility < 10 ? "Média" : 
                     "Alta"}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-sm">Compatibilidade com Perfil</Label>
                
                {stats.profileCompatibility === 'compatible' && (
                  <Alert className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription>
                      Alocação adequada ao perfil {clientRiskProfile}.
                    </AlertDescription>
                  </Alert>
                )}
                
                {stats.profileCompatibility === 'warning' && (
                  <Alert variant="default" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Alocação possui {stats.highRiskAllocation}% em ativos de alto risco.
                      Requer declaração adicional de ciência.
                    </AlertDescription>
                  </Alert>
                )}
                
                {stats.profileCompatibility === 'incompatible' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Alocação incompatível com o perfil {clientRiskProfile}.
                      Contém ativos não recomendados para este perfil.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
          disabled={!isAllocationValid()}
          className="flex items-center gap-2"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AssetAllocationStep; 