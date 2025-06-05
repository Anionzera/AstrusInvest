import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Skeleton } from "../ui/skeleton";
import {
  marketScenarios,
  getScenarioRecommendations,
} from "@/lib/marketDataScenarios";

interface MarketScenarioSelectorProps {
  selectedScenario: string;
  onScenarioChange: (scenarioId: string) => void;
  riskProfile?: string;
}

const MarketScenarioSelector: React.FC<MarketScenarioSelectorProps> = ({
  selectedScenario = "baseline",
  onScenarioChange,
  riskProfile = "moderado",
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carregar cenário salvo no localStorage ao inicializar
  useEffect(() => {
    const loadSavedScenario = async () => {
      try {
        setIsLoading(true);
        const savedScenario = localStorage.getItem("selectedMarketScenario");
        if (savedScenario && savedScenario !== selectedScenario) {
          onScenarioChange(savedScenario);
        }
      } catch (error) {
        console.error("Erro ao carregar cenário salvo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedScenario();
  }, [onScenarioChange, selectedScenario]);

  const handleScenarioChange = (value: string) => {
    setIsLoading(true);
    try {
      onScenarioChange(value);
      // Atualizar o localStorage para persistir a seleção do cenário
      localStorage.setItem("selectedMarketScenario", value);
    } catch (error) {
      console.error("Erro ao mudar cenário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentScenario =
    marketScenarios.find((scenario) => scenario.id === selectedScenario) ||
    marketScenarios[0];

  const recommendations = getScenarioRecommendations(
    selectedScenario,
    riskProfile,
  );

  // Preparar dados para gráficos
  const economicData = [
    {
      name: "Crescimento PIB",
      valor: currentScenario.economicIndicators.gdpGrowth,
    },
    {
      name: "Inflação",
      valor: currentScenario.economicIndicators.inflation,
    },
    {
      name: "Desemprego",
      valor: currentScenario.economicIndicators.unemploymentRate,
    },
    {
      name: "Taxa de Juros",
      valor: currentScenario.economicIndicators.interestRate,
    },
    {
      name: "Confiança do Consumidor",
      valor: currentScenario.economicIndicators.consumerConfidence / 10, // Normalizar para escala similar
    },
  ];

  const returnData = Object.entries(currentScenario.assetPerformance)
    .map(([key, value]) => ({
      name: key
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .replace("Acoes", "Ações")
        .replace("Cdbs", "CDBs"),
      retorno: value.expectedReturn,
      volatilidade: value.volatility,
    }))
    .sort((a, b) => b.retorno - a.retorno)
    .slice(0, 6); // Mostrar apenas os 6 principais

  // Adicionar dados para recomendações específicas
  const assetsToBuy = [
    "Empresas com forte geração de caixa",
    "Títulos indexados à inflação",
    "Fundos imobiliários com contratos atípicos",
  ];

  const strategyAdjustments = [
    "Aumentar exposição a ativos de proteção",
    "Reduzir duration em renda fixa",
    "Diversificar geograficamente",
    "Manter reserva de oportunidade",
  ];

  // Adicionar propriedades faltantes ao objeto recommendations
  const enhancedRecommendations = {
    ...recommendations,
    assetsToBuy: assetsToBuy,
    strategyAdjustments: strategyAdjustments,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Cenário de Mercado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Label className="text-base font-medium mb-3 block">
              Selecione o Cenário
            </Label>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md border border-gray-200"
                  >
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={selectedScenario}
                onValueChange={handleScenarioChange}
                className="space-y-2"
              >
                {marketScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`flex items-start space-x-2 p-3 rounded-md border ${selectedScenario === scenario.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                  >
                    <RadioGroupItem
                      value={scenario.id}
                      id={scenario.id}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor={scenario.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {scenario.name}
                      </label>
                      <p className="text-xs text-gray-500">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="md:col-span-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="returns">Retornos Esperados</TabsTrigger>
                <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="pt-4">
                <div className="space-y-4">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-7 w-48 mb-2" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <div className="h-64 flex items-center justify-center">
                        <Skeleton className="h-52 w-full rounded-md" />
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium">
                        {currentScenario.name}
                      </h3>
                      <p className="text-gray-600">
                        {currentScenario.description}
                      </p>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={economicData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Legend />
                            <Bar
                              dataKey="valor"
                              name="Valor (%)"
                              fill="#4f46e5"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {isLoading ? (
                      <>
                        <div>
                          <Skeleton className="h-6 w-32 mb-2" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                        <div>
                          <Skeleton className="h-6 w-32 mb-2" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">Fatores de Risco</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {currentScenario.riskFactors.map(
                              (factor, index) => (
                                <li key={index} className="text-gray-700">
                                  {factor}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Oportunidades</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {currentScenario.opportunities.map(
                              (opportunity, index) => (
                                <li key={index} className="text-gray-700">
                                  {opportunity}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="returns" className="pt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Retornos Esperados por Classe de Ativo
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={returnData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Bar
                          dataKey="retorno"
                          name="Retorno Esperado (%)"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="volatilidade"
                          name="Volatilidade (%)"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">
                      Correlações com o Mercado
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ativo
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Correlação
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Interpretação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Object.entries(currentScenario.assetPerformance)
                            .sort(
                              (a, b) =>
                                b[1].correlationToMarket -
                                a[1].correlationToMarket,
                            )
                            .map(([key, value]) => (
                              <tr key={key}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  {key
                                    .split("-")
                                    .map(
                                      (word) =>
                                        word.charAt(0).toUpperCase() +
                                        word.slice(1),
                                    )
                                    .join(" ")
                                    .replace("Acoes", "Ações")
                                    .replace("Cdbs", "CDBs")}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  {value.correlationToMarket.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  {value.correlationToMarket > 0.7
                                    ? "Alta correlação positiva"
                                    : value.correlationToMarket > 0.3
                                      ? "Correlação positiva moderada"
                                      : value.correlationToMarket > -0.3
                                        ? "Baixa correlação"
                                        : value.correlationToMarket > -0.7
                                          ? "Correlação negativa moderada"
                                          : "Alta correlação negativa"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="pt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Recomendações para {currentScenario.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Baseado no seu perfil de risco{" "}
                    {riskProfile === "conservador"
                      ? "Conservador"
                      : riskProfile === "moderado"
                        ? "Moderado"
                        : "Agressivo"}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-blue-800">
                        Ativos Recomendados
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {enhancedRecommendations.recommendedAssets.map(
                          (asset, index) => (
                            <li key={index} className="text-gray-700">
                              {asset
                                .split("-")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")
                                .replace("Acoes", "Ações")
                                .replace("Cdbs", "CDBs")}
                            </li>
                          ),
                        )}
                      </ul>

                      <h4 className="font-medium mb-3 mt-6 text-green-800">
                        O que Comprar
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {enhancedRecommendations.assetsToBuy.map(
                          (asset, index) => (
                            <li key={index} className="text-gray-700">
                              {asset}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-red-800">
                        O que Evitar
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {enhancedRecommendations.assetsToAvoid.map(
                          (asset, index) => (
                            <li key={index} className="text-gray-700">
                              {asset
                                .split("-")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")
                                .replace("Acoes", "Ações")
                                .replace("Cdbs", "CDBs")}
                            </li>
                          ),
                        )}
                      </ul>

                      <h4 className="font-medium mb-3 mt-6 text-purple-800">
                        Ajustes de Estratégia
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-2">
                        {enhancedRecommendations.strategyAdjustments.map(
                          (adjustment, index) => (
                            <li key={index} className="text-gray-700">
                              {adjustment}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketScenarioSelector;
