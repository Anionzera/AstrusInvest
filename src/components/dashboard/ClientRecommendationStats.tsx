import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";
import { Users, FileText, AlertTriangle } from "lucide-react";

const ClientRecommendationStats = () => {
  const [clientCount, setClientCount] = useState<number>(0);
  const [recommendationCount, setRecommendationCount] = useState<number>(0);
  const [clientsWithoutRecommendations, setClientsWithoutRecommendations] =
    useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        // Carregar contagem de clientes
        const clients = await db.clientes.toArray();
        setClientCount(clients.length);

        // Carregar contagem de recomendações
        const recommendations = await db.recomendacoes.toArray();
        setRecommendationCount(recommendations.length);

        // Calcular clientes sem recomendações
        const clientIds = new Set(clients.map((client) => client.id));
        const clientsWithRecommendations = new Set(
          recommendations
            .filter((rec) => rec.clienteId)
            .map((rec) => rec.clienteId),
        );

        let withoutRecs = 0;
        clientIds.forEach((id) => {
          if (!clientsWithRecommendations.has(id)) {
            withoutRecs++;
          }
        });

        setClientsWithoutRecommendations(withoutRecs);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar estatísticas",
          description: "Não foi possível carregar as estatísticas do sistema.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-6 bg-gray-200 rounded dark:bg-gray-700 w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-gray-200 rounded dark:bg-gray-700 w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-500 mr-2" />
            <div className="text-2xl font-bold">{clientCount}</div>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Clientes cadastrados no sistema
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-green-500 mr-2" />
            <div className="text-2xl font-bold">{recommendationCount}</div>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Recomendações de investimento ativas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Clientes sem Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
            <div className="text-2xl font-bold">
              {clientsWithoutRecommendations}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Clientes que precisam de recomendações
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientRecommendationStats;
