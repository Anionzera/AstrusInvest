import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from "recharts";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  TrendingDown, TrendingUp, AlertTriangle, BarChart as BarChartIcon, 
  LineChart as LineChartIcon, PieChart as PieChartIcon
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";
import { Checkbox } from "../ui/checkbox";

interface ScenarioResult {
  name: string;
  impact: number;
  description: string;
}

interface StressTestSimulatorProps {
  simulationResults: {
    scenarios: ScenarioResult[];
    varMetrics: {
      var95: number;
      var99: number;
      cvar95: number;
      expectedReturn: number;
      worstCase: number;
      bestCase: number;
    };
  };
  portfolioValue: number;
  onRunSimulation?: (params: {
    scenarios: string[];
    simulationCount: number;
    confidenceLevel: number;
    includeHistorical: boolean;
  }) => void;
}

const predefinedScenarios = [
  "Crise Financeira 2008",
  "Pandemia COVID-19",
  "Estouro da Bolha Tecnológica",
  "Crise Brasileira 2015-2016",
  "Crise das Hipotecas",
  "Alta Inflacionária",
  "Elevação Acentuada de Juros",
  "Recessão Econômica",
  "Desvalorização Cambial"
];

const StressTestSimulator: React.FC<StressTestSimulatorProps> = ({ 
  simulationResults, 
  portfolioValue,
  onRunSimulation 
}) => {
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(
    predefinedScenarios.slice(0, 4)
  );
  const [simulationCount, setSimulationCount] = useState<number>(1000);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [includeHistorical, setIncludeHistorical] = useState<boolean>(true);
  
  // Preparar dados para o gráfico
  const prepareChartData = () => {
    return simulationResults.scenarios.map(scenario => ({
      name: scenario.name,
      impacto: scenario.impact,
      valorAjustado: portfolioValue * (1 + scenario.impact / 100)
    })).sort((a, b) => a.impacto - b.impacto);
  };
  
  const chartData = prepareChartData();
  
  const handleRunSimulation = () => {
    if (onRunSimulation) {
      onRunSimulation({
        scenarios: selectedScenarios,
        simulationCount,
        confidenceLevel,
        includeHistorical
      });
    }
  };
  
  // Formatador para valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Determinar a cor com base no valor
  const getValueColor = (value: number) => {
    if (value <= -10) return "text-red-600 font-bold";
    if (value < 0) return "text-red-500";
    if (value === 0) return "text-gray-500";
    if (value < 10) return "text-green-500";
    return "text-green-600 font-bold";
  };
  
  // Obter a classe de progresso com base no valor
  const getProgressColor = (value: number) => {
    if (value <= -15) return "bg-red-700";
    if (value <= -5) return "bg-red-500";
    if (value < 0) return "bg-red-300";
    if (value === 0) return "bg-gray-300";
    if (value < 5) return "bg-green-300";
    if (value < 15) return "bg-green-500";
    return "bg-green-700";
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulação de Cenários de Estresse</CardTitle>
          <CardDescription>
            Visualize o impacto potencial de diferentes cenários econômicos na sua carteira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Impacto nos Cenários</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'Impacto']}
                        labelFormatter={(label) => `Cenário: ${label}`}
                      />
                      <ReferenceLine y={0} stroke="#666" />
                      <Bar 
                        dataKey="impacto" 
                        name="Impacto (%)" 
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Métricas de Risco</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">VaR {confidenceLevel}%</span>
                      <span className={`text-sm ${getValueColor(simulationResults.varMetrics.var95)}`}>
                        {simulationResults.varMetrics.var95.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(simulationResults.varMetrics.var95)}`} 
                        style={{ width: `${Math.min(100, Math.max(0, 50 + simulationResults.varMetrics.var95 / 2))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Perda máxima esperada com {confidenceLevel}% de confiança
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">CVaR {confidenceLevel}%</span>
                      <span className={`text-sm ${getValueColor(simulationResults.varMetrics.cvar95)}`}>
                        {simulationResults.varMetrics.cvar95.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(simulationResults.varMetrics.cvar95)}`} 
                        style={{ width: `${Math.min(100, Math.max(0, 50 + simulationResults.varMetrics.cvar95 / 2))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Perda média nos {100 - confidenceLevel}% piores casos
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 mt-2 border-t">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Pior Caso</h4>
                    <p className={`text-lg font-bold ${getValueColor(simulationResults.varMetrics.worstCase)}`}>
                      {simulationResults.varMetrics.worstCase.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(portfolioValue * (1 + simulationResults.varMetrics.worstCase / 100))}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Melhor Caso</h4>
                    <p className={`text-lg font-bold ${getValueColor(simulationResults.varMetrics.bestCase)}`}>
                      {simulationResults.varMetrics.bestCase.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(portfolioValue * (1 + simulationResults.varMetrics.bestCase / 100))}
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 mt-2 border-t">
                  <h4 className="text-sm font-medium mb-1">Retorno Esperado</h4>
                  <p className={`text-lg font-bold ${getValueColor(simulationResults.varMetrics.expectedReturn)}`}>
                    {simulationResults.varMetrics.expectedReturn.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(portfolioValue * (1 + simulationResults.varMetrics.expectedReturn / 100))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Cenários de Estresse com Descrições */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Detalhes dos Cenários</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simulationResults.scenarios.map((scenario, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{scenario.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        scenario.impact < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {scenario.impact.toFixed(2)}%
                      </span>
                    </div>
                    <Progress 
                      className="h-1 mt-2"
                      value={Math.min(100, Math.max(0, 50 + scenario.impact / 2))} 
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {scenario.description || "Simulação de impacto baseada em dados históricos e projeções econômicas."}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Configurações de Simulação */}
          {onRunSimulation && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Configurar Nova Simulação</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Cenários a Simular</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {predefinedScenarios.map((scenario) => (
                        <div key={scenario} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`scenario-${scenario}`}
                            checked={selectedScenarios.includes(scenario)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedScenarios([...selectedScenarios, scenario]);
                              } else {
                                setSelectedScenarios(
                                  selectedScenarios.filter((s) => s !== scenario)
                                );
                              }
                            }}
                          />
                          <label 
                            htmlFor={`scenario-${scenario}`}
                            className="text-sm cursor-pointer"
                          >
                            {scenario}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Número de Simulações: {simulationCount}</Label>
                    <Slider 
                      min={100}
                      max={10000}
                      step={100}
                      value={[simulationCount]}
                      onValueChange={(values) => setSimulationCount(values[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mais simulações produzem resultados mais precisos, mas levam mais tempo.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Nível de Confiança: {confidenceLevel}%</Label>
                    <Slider 
                      min={90}
                      max={99}
                      step={1}
                      value={[confidenceLevel]}
                      onValueChange={(values) => setConfidenceLevel(values[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quanto maior o nível de confiança, mais conservadoras serão as estimativas de risco.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-historical"
                      checked={includeHistorical}
                      onCheckedChange={(checked) => 
                        setIncludeHistorical(checked as boolean)
                      }
                    />
                    <Label htmlFor="include-historical" className="cursor-pointer">
                      Incluir dados históricos na simulação
                    </Label>
                  </div>
                  
                  <Button onClick={handleRunSimulation} className="w-full">
                    Executar Simulação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <TrendingDown className="h-4 w-4" />
        <AlertTitle>Aviso Importante</AlertTitle>
        <AlertDescription className="text-sm">
          As simulações de estresse representam cenários hipotéticos baseados em eventos históricos e
          projeções econômicas. Resultados reais podem variar significativamente. Esta ferramenta deve
          ser usada apenas como parte de uma análise de risco mais abrangente.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StressTestSimulator; 