import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ArrowRight,
  Download,
  Edit,
  ListChecks,
  Clock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface AssetAllocation {
  nome: string;
  percentual: number;
  cor: string;
}

interface RecommendationPreviewProps {
  clientName: string;
  clientAge?: number;
  investmentObjective?: string;
  investmentValue: number;
  title?: string;
  description?: string;
  riskProfile?: string;
  investmentHorizon?: string;
  strategy?: string;
  allocations?: AssetAllocation[];
  assetClasses?: string[];
  onEdit?: () => void;
  onContinue?: () => void;
}

const RecommendationPreview = ({
  clientName,
  clientAge,
  investmentObjective,
  investmentValue,
  title = "Recomendação de Alocação de Investimentos",
  description = "Com base no seu perfil de risco e horizonte de investimento selecionados, aqui está a alocação de ativos recomendada.",
  riskProfile = "",
  investmentHorizon = "",
  strategy = "",
  allocations = [],
  assetClasses = [],
  onEdit = () => {},
  onContinue = () => {},
}: RecommendationPreviewProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Função para obter cor e nome legível para cada ativo
  const getAssetInfo = (asset: string) => {
    const assetMap = {
      "acoes-brasileiras-large-cap": {
        name: "Ações Brasileiras (Large Cap)",
        shortName: "Ações BR (Large Cap)",
        color: "#4f46e5", // indigo
        bgColor: "bg-indigo-100",
        textColor: "text-indigo-800",
        category: "Ações",
        description:
          "Empresas brasileiras de grande capitalização, como as que compõem o Ibovespa",
      },
      "acoes-brasileiras-small-cap": {
        name: "Ações Brasileiras (Small Cap)",
        shortName: "Ações BR (Small Cap)",
        color: "#8b5cf6", // violet
        bgColor: "bg-violet-100",
        textColor: "text-violet-800",
        category: "Ações",
        description:
          "Empresas brasileiras de pequena capitalização, com maior potencial de crescimento",
      },
      "acoes-internacionais": {
        name: "Ações Internacionais",
        shortName: "Ações Internacionais",
        color: "#a855f7", // purple
        bgColor: "bg-purple-100",
        textColor: "text-purple-800",
        category: "Ações",
        description:
          "Ações de empresas estrangeiras, proporcionando diversificação geográfica",
      },
      "tesouro-direto": {
        name: "Tesouro Direto",
        shortName: "Tesouro Direto",
        color: "#10b981", // green
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        category: "Renda Fixa",
        description:
          "Títulos públicos federais com diferentes indexadores e prazos",
      },
      cdbs: {
        name: "CDBs",
        shortName: "CDBs",
        color: "#059669", // emerald
        bgColor: "bg-emerald-100",
        textColor: "text-emerald-800",
        category: "Renda Fixa",
        description:
          "Certificados de Depósito Bancário, títulos emitidos por bancos",
      },
      "fundos-imobiliarios": {
        name: "Fundos Imobiliários",
        shortName: "Fundos Imobiliários",
        color: "#06b6d4", // cyan
        bgColor: "bg-cyan-100",
        textColor: "text-cyan-800",
        category: "Híbrido",
        description:
          "Fundos que investem em imóveis comerciais, residenciais ou títulos do setor",
      },
      "fundos-multimercado": {
        name: "Fundos Multimercado",
        shortName: "Fundos Multimercado",
        color: "#0ea5e9", // sky
        bgColor: "bg-sky-100",
        textColor: "text-sky-800",
        category: "Híbrido",
        description:
          "Fundos com estratégias diversificadas e flexíveis em diferentes mercados",
      },
      ouro: {
        name: "Ouro",
        shortName: "Ouro",
        color: "#f59e0b", // amber
        bgColor: "bg-amber-100",
        textColor: "text-amber-800",
        category: "Commodities",
        description:
          "Metal precioso utilizado como reserva de valor e proteção contra inflação",
      },
      criptomoedas: {
        name: "Criptomoedas",
        shortName: "Criptomoedas",
        color: "#d946ef", // fuchsia
        bgColor: "bg-fuchsia-100",
        textColor: "text-fuchsia-800",
        category: "Alternativo",
        description:
          "Ativos digitais baseados em blockchain, como Bitcoin e Ethereum",
      },
    };

    return (
      assetMap[asset] || {
        name: asset,
        shortName: asset,
        color: "#6b7280", // gray
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
        category: "Outros",
        description: "Ativo selecionado para alocação",
      }
    );
  };

  return (
    <div className="w-full p-6 bg-white">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl text-blue-800">{title}</CardTitle>
              <CardDescription className="mt-2">{description}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="hover:bg-white hover:text-blue-600 transition-colors"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Parâmetros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Cliente</h3>
              <p className="text-lg font-semibold mt-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 text-blue-500"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {clientName || "Cliente não informado"}
                {clientAge ? ` (${clientAge} anos)` : ""}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">
                Valor do Investimento
              </h3>
              <p className="text-lg font-semibold mt-1 text-blue-700">
                {formatCurrency(investmentValue)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">
                Perfil de Risco
              </h3>
              <p className="text-lg font-semibold mt-1 flex items-center">
                {riskProfile === "Conservador" ? (
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                ) : riskProfile === "Moderado" ? (
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                ) : (
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                )}
                {riskProfile}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">
                Horizonte de Investimento
              </h3>
              <p className="text-lg font-semibold mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                {investmentHorizon}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Objetivo</h3>
              <p className="text-lg font-semibold mt-1 flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                {investmentObjective === "retirement"
                  ? "Aposentadoria"
                  : investmentObjective === "reserve"
                    ? "Reserva de Emergência"
                    : investmentObjective === "education"
                      ? "Educação"
                      : investmentObjective === "property"
                        ? "Compra de Imóvel"
                        : investmentObjective === "wealth"
                          ? "Crescimento de Patrimônio"
                          : investmentObjective === "income"
                            ? "Geração de Renda"
                            : investmentObjective === "travel"
                              ? "Viagens"
                              : "Outro Objetivo"}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-500">Estratégia</h3>
              <p className="text-lg font-semibold mt-1 flex items-center">
                <PieChartIcon className="h-4 w-4 mr-2 text-blue-500" />
                {strategy}
              </p>
            </div>
          </div>

          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100">
              <TabsTrigger value="chart">
                <PieChartIcon className="mr-2 h-4 w-4" />
                Gráfico de Pizza
              </TabsTrigger>
              <TabsTrigger value="bar">
                <BarChartIcon className="mr-2 h-4 w-4" />
                Gráfico de Barras
              </TabsTrigger>
              <TabsTrigger value="table">
                <ListChecks className="mr-2 h-4 w-4" />
                Visualização em Tabela
              </TabsTrigger>
              <TabsTrigger value="selected-assets">
                <ListChecks className="mr-2 h-4 w-4" />
                Ativos Selecionados
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="mt-6">
              <div className="flex justify-center items-center h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocations}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentual"
                      nameKey="nome"
                      label={({ nome, percentual }) =>
                        `${nome}: ${percentual}%`
                      }
                    >
                      {allocations.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {allocations.map((asset) => (
                  <div
                    key={asset.nome}
                    className="flex items-center p-2 rounded-md hover:bg-slate-50"
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: asset.cor }}
                    />
                    <span className="text-sm font-medium">{asset.nome}</span>
                    <span className="ml-auto font-semibold">
                      {asset.percentual}%
                    </span>
                    <span className="ml-2 text-xs text-blue-600 font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format((investmentValue * asset.percentual) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="bar" className="mt-6">
              <div className="flex justify-center items-center h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="percentual" name="Alocação (%)">
                      {allocations.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="table" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-3 px-4">Classe de Ativo</th>
                      <th className="text-right py-3 px-4">Alocação</th>
                      <th className="text-right py-3 px-4">Faixa Alvo</th>
                      <th className="text-right py-3 px-4">Valor Alocado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((asset) => (
                      <tr
                        key={asset.nome}
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: asset.cor }}
                          />
                          {asset.nome}
                        </td>
                        <td className="text-right py-3 px-4 font-medium bg-blue-50">
                          {asset.percentual}%
                        </td>
                        <td className="text-right py-3 px-4 text-slate-500">
                          {Math.max(0, asset.percentual - 5)}% -{" "}
                          {Math.min(100, asset.percentual + 5)}%
                        </td>
                        <td className="text-right py-3 px-4 font-medium text-blue-600">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format((investmentValue * asset.percentual) / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="selected-assets" className="mt-6">
              <div className="bg-white p-6 rounded-lg mb-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-800 mb-4 border-b pb-2">
                  Ativos Selecionados para Alocação
                </h3>

                <div className="flex flex-wrap gap-2 mb-6">
                  {assetClasses.map((asset) => {
                    const assetInfo = getAssetInfo(asset);
                    return (
                      <span
                        key={asset}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${assetInfo.bgColor} ${assetInfo.textColor} shadow-sm hover:shadow transition-all duration-200`}
                      >
                        {assetInfo.name}
                      </span>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 p-4 rounded-lg shadow-sm h-72">
                    <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center">
                      <PieChartIcon className="h-4 w-4 mr-2 text-blue-500" />
                      Distribuição de Ativos
                    </h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={assetClasses.map((asset) => {
                            const assetInfo = getAssetInfo(asset);
                            return {
                              nome: assetInfo.shortName,
                              valor: 1,
                              cor: assetInfo.color,
                            };
                          })}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="valor"
                          nameKey="nome"
                          label={({ nome }) => nome}
                        >
                          {assetClasses.map((asset, index) => {
                            const assetInfo = getAssetInfo(asset);
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={assetInfo.color}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} ativo(s)`} />
                        <Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg shadow-sm h-72">
                    <h4 className="text-md font-medium text-slate-700 mb-3 flex items-center">
                      <BarChartIcon className="h-4 w-4 mr-2 text-blue-500" />
                      Ativos por Categoria
                    </h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart
                        data={assetClasses.map((asset) => {
                          const assetInfo = getAssetInfo(asset);
                          return {
                            nome: assetInfo.shortName,
                            categoria: assetInfo.category,
                            valor: 1,
                            cor: assetInfo.color,
                          };
                        })}
                        margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="nome"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => `${value} ativo(s)`} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar
                          dataKey="valor"
                          name="Ativos"
                          radius={[4, 4, 0, 0]}
                        >
                          {assetClasses.map((asset, index) => {
                            const assetInfo = getAssetInfo(asset);
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={assetInfo.color}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-medium text-slate-700 mb-4 flex items-center border-b pb-2">
                    <ListChecks className="h-4 w-4 mr-2 text-blue-500" />
                    Detalhes dos Ativos Selecionados
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assetClasses.map((asset) => {
                      const assetInfo = getAssetInfo(asset);
                      return (
                        <div
                          key={asset}
                          className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${assetInfo.bgColor.replace("bg-", "border-")} ${assetInfo.bgColor}`}
                        >
                          <h5 className="font-medium text-gray-800 flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: assetInfo.color }}
                            />
                            {assetInfo.name}
                          </h5>
                          <div className="text-xs font-medium text-gray-500 mt-2 mb-2 inline-block px-2 py-1 bg-white bg-opacity-50 rounded">
                            Categoria: {assetInfo.category}
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {assetInfo.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="hover:bg-blue-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-colors"
          >
            Continuar para Relatório
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RecommendationPreview;
