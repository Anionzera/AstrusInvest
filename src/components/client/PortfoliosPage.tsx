import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { db, Cliente, Posicao } from "@/lib/db";
import { Search, BarChart3, PieChart, DollarSign, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

type ClienteComPortfolio = Cliente & {
  valorTotal: number;
  numAtivos: number;
  scoreRisco?: number;
  scoreDiversificacao?: number;
};

const PortfoliosPage: React.FC = () => {
  const { toast } = useToast();
  const [clientesComPortfolio, setClientesComPortfolio] = useState<ClienteComPortfolio[]>([]);
  const [clientesSemPortfolio, setClientesSemPortfolio] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        // Buscar todos os clientes
        const clientes = await db.clientes.toArray();
        
        // Buscar todas as posições
        const todasPosicoes = await db.posicoes.toArray();
        
        // Agrupar posições por cliente
        const posicoesPorCliente: Record<number, Posicao[]> = {};
        todasPosicoes.forEach(pos => {
          if (!posicoesPorCliente[pos.clienteId]) {
            posicoesPorCliente[pos.clienteId] = [];
          }
          posicoesPorCliente[pos.clienteId].push(pos);
        });

        // Buscar análises de portfólio existentes
        const analises = await db.portfolioAnalyses.toArray();
        const analisesPorCliente: Record<number, any> = {};
        analises.forEach(analise => {
          analisesPorCliente[analise.clienteId] = analise;
        });
        
        // Separar clientes com e sem portfólio
        const comPortfolio: ClienteComPortfolio[] = [];
        const semPortfolio: Cliente[] = [];
        
        clientes.forEach(cliente => {
          const posicoesCliente = posicoesPorCliente[cliente.id || 0] || [];
          
          if (posicoesCliente.length > 0) {
            // Calcular valor total e número de ativos
            const valorTotal = posicoesCliente.reduce((sum, pos) => sum + (pos.valorTotal || 0), 0);
            const clienteComPortfolio: ClienteComPortfolio = {
              ...cliente,
              valorTotal,
              numAtivos: posicoesCliente.length,
            };
            
            // Adicionar scores de análise se disponíveis
            const analiseCliente = analisesPorCliente[cliente.id || 0];
            if (analiseCliente) {
              clienteComPortfolio.scoreRisco = analiseCliente.riskScore;
              clienteComPortfolio.scoreDiversificacao = analiseCliente.diversificacaoScore;
            }
            
            comPortfolio.push(clienteComPortfolio);
          } else {
            semPortfolio.push(cliente);
          }
        });
        
        // Ordenar por valor total (maior primeiro)
        comPortfolio.sort((a, b) => b.valorTotal - a.valorTotal);
        
        setClientesComPortfolio(comPortfolio);
        setClientesSemPortfolio(semPortfolio);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar portfólios",
          description: "Não foi possível carregar os dados dos portfólios. Tente novamente mais tarde.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    carregarDados();
  }, [toast]);

  // Navegar para o gerenciador de portfólio de um cliente específico
  const navegarParaPortfolio = (clienteId: number) => {
    navigate(`/clients/${clienteId}/portfolio`);
  };

  // Formatar valor monetário
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  // Filtrar clientes com base na busca
  const clientesFiltrados = clientesComPortfolio.filter(cliente => {
    if (!searchTerm) return true;
    
    const termoLowerCase = searchTerm.toLowerCase();
    return (
      cliente.nome?.toLowerCase().includes(termoLowerCase) ||
      cliente.email?.toLowerCase().includes(termoLowerCase)
    );
  });

  // Renderizar cores baseadas no score
  const getScoreColor = (score: number | undefined, tipo: "risco" | "diversificacao") => {
    if (score === undefined) return "bg-gray-300";
    
    if (tipo === "risco") {
      if (score < 30) return "bg-green-500";
      if (score < 60) return "bg-yellow-500";
      return "bg-red-500";
    } else {
      // diversificação
      if (score > 70) return "bg-green-500";
      if (score > 40) return "bg-yellow-500";
      return "bg-red-500";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólios</h1>
          <p className="text-muted-foreground">
            Visão geral de todos os portfólios de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/clients")}>
            <Users className="mr-2 h-4 w-4" />
            Gerenciar Clientes
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Portfólios
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {clientesComPortfolio.length}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {formatarMoeda(
                clientesComPortfolio.reduce((sum, cliente) => sum + cliente.valorTotal, 0)
              )}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maior Portfólio
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {clientesComPortfolio.length > 0
                ? formatarMoeda(clientesComPortfolio[0].valorTotal)
                : "R$ 0,00"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfólio Médio
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {clientesComPortfolio.length > 0
                ? formatarMoeda(
                    clientesComPortfolio.reduce((sum, cliente) => sum + cliente.valorTotal, 0) /
                      clientesComPortfolio.length
                  )
                : "R$ 0,00"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Portfólios */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Carregando portfólios...</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum portfólio encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm
                ? "Nenhum portfólio corresponde aos termos da busca."
                : "Nenhum cliente possui portfólio. Vá para a página de clientes para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">Ativos</TableHead>
                  <TableHead className="text-muted-foreground">Valor Total</TableHead>
                  <TableHead className="text-muted-foreground">Risco</TableHead>
                  <TableHead className="text-muted-foreground">Diversificação</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium text-foreground">
                      <div>
                        <div className="text-foreground">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">{cliente.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{cliente.numAtivos}</TableCell>
                    <TableCell className="text-foreground">{formatarMoeda(cliente.valorTotal)}</TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={cliente.scoreRisco || 0} 
                          className={`h-2 w-16 ${getScoreColor(cliente.scoreRisco, "risco")}`} 
                        />
                        <span>{cliente.scoreRisco || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={cliente.scoreDiversificacao || 0} 
                          className={`h-2 w-16 ${getScoreColor(cliente.scoreDiversificacao, "diversificacao")}`} 
                        />
                        <span>{cliente.scoreDiversificacao || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navegarParaPortfolio(cliente.id!)}
                      >
                        <BarChart3 className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clientes sem Portfólio */}
      {clientesSemPortfolio.length > 0 && !searchTerm && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Clientes sem Portfólio</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesSemPortfolio.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium text-foreground">{cliente.nome}</TableCell>
                      <TableCell className="text-foreground">{cliente.email}</TableCell>
                      <TableCell className="text-foreground">{cliente.telefone}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navegarParaPortfolio(cliente.id!)}
                        >
                          <PieChart className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PortfoliosPage; 