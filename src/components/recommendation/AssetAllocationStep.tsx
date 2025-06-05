import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PieChartIcon, BarChartIcon, LineChartIcon, RefreshCcw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";

// Importar tipos
import { AssetClass } from "../../types/assets";

// Importar componentes extraídos
import AssetAllocationChart from "./charts/AssetAllocationChart";
import RiskReturnChart from "./charts/RiskReturnChart";
import ReturnProjectionChart from "./charts/ReturnProjectionChart";
import AllocationTable from "./AllocationTable";

// Importar hook personalizado
import { useAssetAllocation } from "../../hooks/useAssetAllocation";

interface AssetAllocationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  initialAssets: AssetClass[];
  riskProfile: string;
  investmentAmount: number;
  onUpdateAssets: (assets: AssetClass[]) => void;
}

const AssetAllocationStep: React.FC<AssetAllocationStepProps> = ({
  onNext,
  onPrevious,
  initialAssets,
  riskProfile,
  investmentAmount,
  onUpdateAssets,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");
  
  // Usar o hook personalizado para gerenciar a alocação de ativos
  const {
    assets,
    totalAllocation,
    adjustmentError,
    expectedReturn,
    risk,
    returnProjections,
    riskReturnData,
    handleAllocationChange,
    resetToRecommended,
    isValidAllocation
  } = useAssetAllocation({
    initialAssets,
    riskProfile,
    investmentAmount,
    onChange: onUpdateAssets
  });

  const handleSubmit = () => {
    if (isValidAllocation) {
      onNext();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Alocação de Ativos</CardTitle>
        <CardDescription>
          Distribua seu investimento entre diferentes classes de ativos para atingir seus objetivos
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="allocation" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              <span>Alocação</span>
            </TabsTrigger>
            <TabsTrigger value="projections" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              <span>Projeções</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              <span>Detalhes</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <AssetAllocationChart assets={assets} />
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                    className="mr-2"
                  >
                    {editMode ? "Concluir Edição" : "Editar Alocação"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToRecommended}
                    className="flex items-center gap-1"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Recomendado
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">
                  Alocação por Classe de Ativo
                  <Badge
                    variant={totalAllocation === 100 ? "outline" : "destructive"}
                    className="ml-2"
                  >
                    {totalAllocation}%
                  </Badge>
                </h3>
                
                {adjustmentError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>{adjustmentError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="overflow-auto max-h-[300px]">
                  <AllocationTable
                    assets={assets}
                    onAllocationChange={handleAllocationChange}
                    editMode={editMode}
                    investmentAmount={investmentAmount}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="projections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Projeção de Valor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Baseado em um retorno anual médio de {expectedReturn.toFixed(1)}%
                </p>
                <ReturnProjectionChart projections={returnProjections} />
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Perfil de Risco/Retorno</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comparação entre seu portfólio e perfis pré-definidos
                </p>
                <RiskReturnChart data={riskReturnData} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-4">Detalhes da Alocação</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Retorno Esperado</h4>
                      <p className="text-2xl font-bold">{expectedReturn.toFixed(1)}%</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Risco Estimado</h4>
                      <p className="text-2xl font-bold">{risk.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrição do Perfil</h4>
                    <p className="text-sm">
                      {riskProfile === "conservador" && "Portfólio focado em preservação de capital com baixa volatilidade."}
                      {riskProfile === "moderado" && "Portfólio equilibrado entre crescimento e preservação de capital."}
                      {riskProfile === "agressivo" && "Portfólio focado em crescimento de capital com maior tolerância a volatilidade."}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-4">Recomendações</h3>
                <div className="space-y-2">
                  <Alert>
                    <AlertTitle>Diversificação</AlertTitle>
                    <AlertDescription>
                      {assets.length >= 4 
                        ? "Seu portfólio está bem diversificado entre diferentes classes de ativos."
                        : "Considere adicionar mais classes de ativos para melhorar a diversificação."}
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTitle>Horizonte de Investimento</AlertTitle>
                    <AlertDescription>
                      Esta alocação é mais adequada para investimentos de 
                      {riskProfile === "conservador" && " curto a médio prazo (1-3 anos)."}
                      {riskProfile === "moderado" && " médio prazo (3-5 anos)."}
                      {riskProfile === "agressivo" && " longo prazo (5+ anos)."}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!isValidAllocation}
          className="flex items-center gap-2"
        >
          Avançar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AssetAllocationStep; 