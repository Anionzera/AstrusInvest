import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";
import { Users, PieChart, AlertTriangle } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const ClientAnalytics = () => {
  const [riskProfileData, setRiskProfileData] = useState<any[]>([]);
  const [clientsWithoutRecommendations, setClientsWithoutRecommendations] =
    useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadClientAnalytics = async () => {
      setIsLoading(true);
      try {
        // Carregar clientes
        const clients = await db.clientes.toArray();

        // Carregar recomendações
        const recommendations = await db.recomendacoes.toArray();

        // Distribuição por perfil de risco
        const riskProfiles = recommendations.reduce((acc, rec) => {
          const profile = rec.perfilRisco || "Não definido";
          acc[profile] = (acc[profile] || 0) + 1;
          return acc;
        }, {});

        const riskProfileChartData = Object.entries(riskProfiles).map(
          ([name, value]) => ({
            name,
            value,
          }),
        );

        setRiskProfileData(riskProfileChartData);

        // Clientes sem recomendações
        const clientIds = new Set(clients.map((client) => client.id));
        const clientsWithRecs = new Set(
          recommendations
            .filter((rec) => rec.clienteId)
            .map((rec) => rec.clienteId),
        );

        const withoutRecs = clients.filter(
          (client) => !clientsWithRecs.has(client.id),
        );

        setClientsWithoutRecommendations(withoutRecs);
      } catch (error) {
        console.error("Erro ao carregar análise de clientes:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar análise",
          description:
            "Não foi possível carregar os dados de análise de clientes.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadClientAnalytics();
  }, [toast]);

  const COLORS = ["#4f46e5", "#10b981", "#f97316", "#8b5cf6", "#f59e0b"];

  if (isLoading) {
    return (
      <Card className="w-full h-[400px] animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-1/2"></div>
        </CardHeader>
        <CardContent className="h-full">
          <div className="h-full bg-gray-200 rounded dark:bg-gray-700"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Análise de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Distribuição por Perfil de Risco */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Distribuição por Perfil de Risco
            </h3>
            <div className="h-[250px]">
              {riskProfileData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={riskProfileData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskProfileData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, "Clientes"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        border: "none",
                        color: "#333",
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Sem dados disponíveis
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Clientes sem Recomendações */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Clientes sem Recomendações ({clientsWithoutRecommendations.length}
              )
            </h3>

            {clientsWithoutRecommendations.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[250px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {clientsWithoutRecommendations.map((client) => (
                        <tr
                          key={client.id}
                          className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {client.nome}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {client.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center border rounded-md bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400">
                  Todos os clientes possuem recomendações
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientAnalytics;
