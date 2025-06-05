import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PortfolioOptimizer from "../analysis/PortfolioOptimizer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/db";

const PortfolioOptimizerPage: React.FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clienteNome, setClienteNome] = useState<string | null>(null);

  React.useEffect(() => {
    // Carregar dados do cliente se clienteId estiver disponível
    const carregarDadosCliente = async () => {
      if (clienteId && !isNaN(Number(clienteId))) {
        try {
          const cliente = await db.clientes.get(Number(clienteId));
          if (cliente) {
            setClienteNome(cliente.nome || "Cliente");
          }
        } catch (error) {
          console.error("Erro ao carregar dados do cliente:", error);
        }
      }
    };

    carregarDadosCliente();
  }, [clienteId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSavePortfolio = async (weights: Record<string, number>) => {
    if (!clienteId || isNaN(Number(clienteId))) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar portfólio",
        description: "ID do cliente inválido",
      });
      return;
    }

    try {
      // Salvar os pesos na base de dados
      // Esta é uma implementação de exemplo - adapte conforme necessário para o seu modelo de dados
      await db.portfolios.put({
        clienteId: Number(clienteId),
        weights,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "Portfólio Otimizado",
        description: "Gerado pelo otimizador de portfólio"
      });

      toast({
        title: "Portfólio salvo",
        description: "O portfólio otimizado foi salvo com sucesso.",
      });

      // Voltar para a página do portfólio
      setTimeout(() => {
        navigate(`/clients/${clienteId}/portfolio`);
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar portfólio:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar portfólio",
        description: "Não foi possível salvar o portfólio. Tente novamente mais tarde.",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Otimizador de Portfólio
          </h1>
          {clienteNome && (
            <p className="text-muted-foreground">
              Cliente: {clienteNome}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Otimização Avançada</CardTitle>
          <CardDescription>
            Aplique técnicas de otimização matemática para encontrar a melhor alocação para este portfólio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PortfolioOptimizer 
            clienteId={clienteId ? Number(clienteId) : undefined} 
            onSavePortfolio={handleSavePortfolio}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioOptimizerPage; 