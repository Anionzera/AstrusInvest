import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMarketData, MarketData, AssetClassOutlook } from "@/lib/marketData";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

interface MarketDataSettingsProps {
  onUpdate?: () => void;
}

export default function MarketDataSettings({
  onUpdate,
}: MarketDataSettingsProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [dataSource, setDataSource] = useState<"auto" | "manual">("auto");
  const [editableData, setEditableData] = useState<MarketData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // Carregar dados de mercado ao montar o componente
  useEffect(() => {
    loadMarketData();
  }, []);

  // Função para carregar dados de mercado
  const loadMarketData = async () => {
    setLoading(true);
    try {
      const data = await getMarketData();
      setMarketData(data);
      setEditableData(JSON.parse(JSON.stringify(data))); // Clone profundo
      setLastUpdated(new Date(data.lastUpdated).toLocaleString("pt-BR"));
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados de mercado:", error);
      setLoading(false);
    }
  };

  // Função para atualizar dados de mercado
  const refreshMarketData = async () => {
    setLoading(true);
    try {
      // Forçar nova busca limpando o cache (em uma implementação real)
      // Aqui estamos apenas recarregando os dados simulados
      const data = await getMarketData();
      data.lastUpdated = new Date(); // Atualizar timestamp
      setMarketData(data);
      setEditableData(JSON.parse(JSON.stringify(data))); // Clone profundo
      setLastUpdated(new Date(data.lastUpdated).toLocaleString("pt-BR"));
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      setLoading(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar dados de mercado:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      setLoading(false);
    }
  };

  // Função para salvar dados editados manualmente
  const saveManualData = () => {
    if (!editableData) return;

    setLoading(true);
    try {
      // Em uma implementação real, você salvaria isso em um banco de dados ou API
      // Aqui estamos apenas atualizando o estado local
      editableData.lastUpdated = new Date();
      setMarketData(editableData);
      setLastUpdated(
        new Date(editableData.lastUpdated).toLocaleString("pt-BR"),
      );
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao salvar dados de mercado:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Manipuladores para edição de dados
  const handleIndicatorChange = (
    field: keyof MarketData["economicIndicators"],
    value: string,
  ) => {
    if (!editableData) return;
    setEditableData({
      ...editableData,
      economicIndicators: {
        ...editableData.economicIndicators,
        [field]: parseFloat(value) || 0,
      },
    });
  };

  const handleAssetClassChange = (
    index: number,
    field: keyof AssetClassOutlook,
    value: any,
  ) => {
    if (!editableData) return;
    const updatedAssetClasses = [...editableData.assetClasses];
    updatedAssetClasses[index] = {
      ...updatedAssetClasses[index],
      [field]: field === "riskLevel" ? parseInt(value) || 1 : value,
    };
    setEditableData({
      ...editableData,
      assetClasses: updatedAssetClasses,
    });
  };

  const handleRiskFactorChange = (index: number, value: string) => {
    if (!editableData) return;
    const updatedRiskFactors = [...editableData.riskFactors];
    updatedRiskFactors[index] = value;
    setEditableData({
      ...editableData,
      riskFactors: updatedRiskFactors,
    });
  };

  const handleMarketSentimentChange = (value: string) => {
    if (!editableData) return;
    setEditableData({
      ...editableData,
      marketSentiment: value,
    });
  };

  if (!marketData || !editableData) {
    return (
      <Card className="w-full bg-white">
        <CardHeader>
          <CardTitle>Dados de Mercado</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Dados de Mercado</span>
          {saveStatus === "success" && (
            <span className="text-sm text-green-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" /> Dados atualizados
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" /> Erro ao atualizar
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Gerencie os dados de mercado utilizados nas análises e recomendações.
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: {lastUpdated}</p>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="data-source"
            checked={dataSource === "manual"}
            onCheckedChange={(checked) =>
              setDataSource(checked ? "manual" : "auto")
            }
          />
          <Label htmlFor="data-source">Editar dados manualmente</Label>
        </div>

        <Tabs defaultValue="indicators" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="indicators">Indicadores</TabsTrigger>
            <TabsTrigger value="assets">Classes de Ativos</TabsTrigger>
            <TabsTrigger value="risks">Fatores de Risco</TabsTrigger>
            <TabsTrigger value="sentiment">Sentimento</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inflation">Inflação (%)</Label>
                <Input
                  id="inflation"
                  type="number"
                  step="0.1"
                  value={editableData.economicIndicators.inflation}
                  onChange={(e) =>
                    handleIndicatorChange("inflation", e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">Taxa de Juros (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.25"
                  value={editableData.economicIndicators.interestRate}
                  onChange={(e) =>
                    handleIndicatorChange("interestRate", e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gdpGrowth">Crescimento do PIB (%)</Label>
                <Input
                  id="gdpGrowth"
                  type="number"
                  step="0.1"
                  value={editableData.economicIndicators.gdpGrowth}
                  onChange={(e) =>
                    handleIndicatorChange("gdpGrowth", e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unemploymentRate">Taxa de Desemprego (%)</Label>
                <Input
                  id="unemploymentRate"
                  type="number"
                  step="0.1"
                  value={editableData.economicIndicators.unemploymentRate}
                  onChange={(e) =>
                    handleIndicatorChange("unemploymentRate", e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Câmbio (BRL/USD)</Label>
                <Input
                  id="currency"
                  type="number"
                  step="0.01"
                  value={editableData.economicIndicators.currency}
                  onChange={(e) =>
                    handleIndicatorChange("currency", e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            {editableData.assetClasses.map((assetClass, index) => (
              <div key={index} className="border p-4 rounded-md space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`asset-name-${index}`}>Nome da Classe</Label>
                  <Input
                    id={`asset-name-${index}`}
                    value={assetClass.name}
                    onChange={(e) =>
                      handleAssetClassChange(index, "name", e.target.value)
                    }
                    disabled={dataSource === "auto" || loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`short-term-${index}`}>
                      Perspectiva de Curto Prazo
                    </Label>
                    <select
                      id={`short-term-${index}`}
                      className="w-full p-2 border rounded-md"
                      value={assetClass.shortTermOutlook}
                      onChange={(e) =>
                        handleAssetClassChange(
                          index,
                          "shortTermOutlook",
                          e.target.value,
                        )
                      }
                      disabled={dataSource === "auto" || loading}
                    >
                      <option value="Positivo">Positivo</option>
                      <option value="Neutro">Neutro</option>
                      <option value="Negativo">Negativo</option>
                      <option value="Volátil">Volátil</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`long-term-${index}`}>
                      Perspectiva de Longo Prazo
                    </Label>
                    <select
                      id={`long-term-${index}`}
                      className="w-full p-2 border rounded-md"
                      value={assetClass.longTermOutlook}
                      onChange={(e) =>
                        handleAssetClassChange(
                          index,
                          "longTermOutlook",
                          e.target.value,
                        )
                      }
                      disabled={dataSource === "auto" || loading}
                    >
                      <option value="Positivo">Positivo</option>
                      <option value="Neutro">Neutro</option>
                      <option value="Negativo">Negativo</option>
                      <option value="Volátil">Volátil</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`risk-level-${index}`}>
                    Nível de Risco (1-5)
                  </Label>
                  <Input
                    id={`risk-level-${index}`}
                    type="number"
                    min="1"
                    max="5"
                    value={assetClass.riskLevel}
                    onChange={(e) =>
                      handleAssetClassChange(index, "riskLevel", e.target.value)
                    }
                    disabled={dataSource === "auto" || loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`commentary-${index}`}>Comentário</Label>
                  <Textarea
                    id={`commentary-${index}`}
                    value={assetClass.commentary}
                    onChange={(e) =>
                      handleAssetClassChange(
                        index,
                        "commentary",
                        e.target.value,
                      )
                    }
                    disabled={dataSource === "auto" || loading}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            {editableData.riskFactors.map((factor, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`risk-factor-${index}`}>
                  Fator de Risco {index + 1}
                </Label>
                <Input
                  id={`risk-factor-${index}`}
                  value={factor}
                  onChange={(e) =>
                    handleRiskFactorChange(index, e.target.value)
                  }
                  disabled={dataSource === "auto" || loading}
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="market-sentiment">Sentimento de Mercado</Label>
              <select
                id="market-sentiment"
                className="w-full p-2 border rounded-md"
                value={editableData.marketSentiment}
                onChange={(e) => handleMarketSentimentChange(e.target.value)}
                disabled={dataSource === "auto" || loading}
              >
                <option value="Bullish">Otimista (Bullish)</option>
                <option value="Cautiously optimistic">
                  Cautelosamente Otimista
                </option>
                <option value="Neutral">Neutro</option>
                <option value="Cautious">Cauteloso</option>
                <option value="Bearish">Pessimista (Bearish)</option>
                <option value="Volatile">Volátil</option>
              </select>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={loadMarketData} disabled={loading}>
          Cancelar
        </Button>

        {dataSource === "auto" ? (
          <Button
            onClick={refreshMarketData}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? "Atualizando..." : "Atualizar Dados"}
          </Button>
        ) : (
          <Button onClick={saveManualData} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
