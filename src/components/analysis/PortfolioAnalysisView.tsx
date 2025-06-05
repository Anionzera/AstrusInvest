import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  ChevronsUp,
  ChevronsDown,
  MinusCircle,
  PlusCircle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  Ativo,
  Cliente,
  PortfolioAnalysis,
  Posicao,
  db,
} from "@/lib/db";
import { ScrollArea } from "@/components/ui/scroll-area";
import { analisarPortfolio } from "@/lib/portfolioAnalysis";
import { useToast } from "@/components/ui/use-toast";
import CorrelationMatrix from "./CorrelationMatrix";

interface PortfolioAnalysisViewProps {
  clienteId: number;
  onClose?: () => void;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

const PortfolioAnalysisView: React.FC<PortfolioAnalysisViewProps> = ({
  clienteId,
  onClose,
}) => {
  const [analise, setAnalise] = useState<PortfolioAnalysis | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ativos, setAtivos] = useState<Record<number, Ativo>>({});
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const { toast } = useToast();

  useEffect(() => {
    const carregarAnalise = async () => {
      try {
        setIsLoading(true);

        // Buscar cliente
        const clienteData = await db.clientes.get(clienteId);
        if (!clienteData) {
          throw new Error("Cliente não encontrado");
        }
        setCliente(clienteData);
        
        // Buscar posições do cliente
        const posicoesData = await db.posicoes
          .where("clienteId")
          .equals(clienteId)
          .toArray();
        setPosicoes(posicoesData);

        // Buscar análise mais recente ou criar uma nova
        let analiseData: PortfolioAnalysis | null = null;
        
        const analisesExistentes = await db.portfolioAnalyses
          .where("clienteId")
          .equals(clienteId)
          .reverse()
          .sortBy("data");
        
        // Verificar se há uma análise recente (nas últimas 24h)
        const agora = new Date();
        const ontem = new Date(agora);
        ontem.setDate(ontem.getDate() - 1);
        
        const analiseRecente = analisesExistentes.find(
          (a) => new Date(a.data) > ontem
        );
        
        if (analiseRecente) {
          analiseData = analiseRecente;
        } else {
          // Criar nova análise
          toast({
            title: "Analisando portfólio",
            description: "Criando nova análise de portfólio...",
          });
          
          analiseData = await analisarPortfolio(clienteId);
        }
        
        setAnalise(analiseData);

        // Buscar todos os ativos para referência
        const todosAtivos = await db.ativos.toArray();
        const ativosMap: Record<number, Ativo> = {};
        todosAtivos.forEach((ativo) => {
          if (ativo.id) {
            ativosMap[ativo.id] = ativo;
          }
        });
        setAtivos(ativosMap);
      } catch (error) {
        console.error("Erro ao carregar análise:", error);
        toast({
          variant: "destructive",
          title: "Erro ao analisar portfólio",
          description:
            "Não foi possível realizar a análise. Verifique se o cliente possui posições cadastradas.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    carregarAnalise();
  }, [clienteId, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">
            Analisando portfólio do cliente...
          </p>
        </div>
      </div>
    );
  }

  if (!analise || !cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="h-16 w-16 text-amber-500" />
        <p className="text-muted-foreground text-lg">
          Não foi possível carregar a análise ou o cliente não possui posições cadastradas.
        </p>
        <Button onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  // Preparar dados para os gráficos
  const concentracaoPorClasseData = analise.concentracaoPorClasse
    ? Object.entries(analise.concentracaoPorClasse).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const projecoesData = [
    {
      name: "Pessimista",
      valor: analise.retornoEsperado.pessimista,
      cor: "#ff4d4f",
    },
    {
      name: "Base",
      valor: analise.retornoEsperado.base,
      cor: "#1890ff",
    },
    {
      name: "Otimista",
      valor: analise.retornoEsperado.otimista,
      cor: "#52c41a",
    },
  ];

  const comparativoIndicesData = [
    {
      name: "Seu Portfólio",
      valor: analise.retornoEsperado.base,
      cor: "#1890ff",
    },
    {
      name: "Ibovespa",
      valor: analise.comparativoIndices.ibovespa || 0,
      cor: "#ff4d4f",
    },
    {
      name: "CDI",
      valor: analise.comparativoIndices.cdi || 0,
      cor: "#52c41a",
    },
    {
      name: "Poupança",
      valor: analise.comparativoIndices.poupanca || 0,
      cor: "#faad14",
    },
  ];

  const renderScoreLabel = (score: number, type: "diversificacao" | "risco") => {
    if (type === "diversificacao") {
      if (score >= 80) return "Excelente";
      if (score >= 60) return "Boa";
      if (score >= 40) return "Média";
      if (score >= 20) return "Baixa";
      return "Muito Baixa";
    } else {
      // Risco
      if (score >= 80) return "Muito Alto";
      if (score >= 60) return "Alto";
      if (score >= 40) return "Médio";
      if (score >= 20) return "Baixo";
      return "Muito Baixo";
    }
  };

  const getScoreColor = (score: number, type: "diversificacao" | "risco") => {
    if (type === "diversificacao") {
      if (score >= 80) return "bg-green-500";
      if (score >= 60) return "bg-green-400";
      if (score >= 40) return "bg-yellow-400";
      if (score >= 20) return "bg-orange-400";
      return "bg-red-500";
    } else {
      // Risco - cores inversas (alto risco = vermelho)
      if (score >= 80) return "bg-red-500";
      if (score >= 60) return "bg-orange-400";
      if (score >= 40) return "bg-yellow-400";
      if (score >= 20) return "bg-green-400";
      return "bg-green-500";
    }
  };

  const renderActionIcon = (acao: "comprar" | "vender" | "manter") => {
    switch (acao) {
      case "comprar":
        return <PlusCircle className="h-5 w-5 text-green-500" />;
      case "vender":
        return <MinusCircle className="h-5 w-5 text-red-500" />;
      case "manter":
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatValor = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Análise de Portfólio
          </h2>
          <p className="text-muted-foreground">
            Cliente: {cliente.nome} • Análise realizada em{" "}
            {new Date(analise.data).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Button onClick={onClose} variant="outline">
          Voltar
        </Button>
      </div>

      <Tabs defaultValue="visao-geral" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full mb-4">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="composicao">Composição</TabsTrigger>
          <TabsTrigger value="correlacoes">Correlações</TabsTrigger>
          <TabsTrigger value="riscos">Riscos</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="rebalanceamento">Rebalanceamento</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scores de Portfólio</CardTitle>
                <CardDescription>
                  Avaliação da diversificação e nível de risco
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">
                        Score de Diversificação
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {analise.diversificacaoScore}
                        </span>
                        <Badge variant="outline">
                          {renderScoreLabel(
                            analise.diversificacaoScore,
                            "diversificacao"
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={analise.diversificacaoScore}
                    className={getScoreColor(
                      analise.diversificacaoScore,
                      "diversificacao"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">
                        Score de Risco
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">
                          {analise.riskScore}
                        </span>
                        <Badge variant="outline">
                          {renderScoreLabel(analise.riskScore, "risco")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={analise.riskScore}
                    className={getScoreColor(analise.riskScore, "risco")}
                  />
                </div>

                {analise.sharpeRatio && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">Índice Sharpe</span>
                    <span
                      className={`font-medium ${
                        analise.sharpeRatio > 0.5
                          ? "text-green-600"
                          : analise.sharpeRatio > 0
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {analise.sharpeRatio.toFixed(2)}
                    </span>
                  </div>
                )}

                {analise.volatilidade && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm">Volatilidade Estimada</span>
                    <span className="font-medium">
                      {(analise.volatilidade).toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projeções de Retorno */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Projeções de Retorno Anual
                </CardTitle>
                <CardDescription>
                  Estimativas de retorno em diferentes cenários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projecoesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis
                        domain={[-15, 30]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Retorno Anual"]}
                      />
                      <Bar dataKey="valor" name="Retorno">
                        {projecoesData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.cor}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Pessimista
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        analise.retornoEsperado.pessimista < 0
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {formatValor(analise.retornoEsperado.pessimista)}%
                    </div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">Base</div>
                    <div className="text-lg font-bold text-blue-500">
                      {formatValor(analise.retornoEsperado.base)}%
                    </div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Otimista
                    </div>
                    <div className="text-lg font-bold text-green-500">
                      {formatValor(analise.retornoEsperado.otimista)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparativo com índices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comparativo com Índices de Mercado
              </CardTitle>
              <CardDescription>
                Desempenho projetado comparado a benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparativoIndicesData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      domain={[0, 'dataMax']}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => [`${value}%`, "Retorno Anual"]} />
                    <Bar dataKey="valor" name="Retorno Esperado">
                      {comparativoIndicesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composicao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Composição por Classe de Ativo
              </CardTitle>
              <CardDescription>
                Distribuição atual do portfólio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={concentracaoPorClasseData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {concentracaoPorClasseData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classe de Ativo</TableHead>
                        <TableHead className="text-right">Alocação (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {concentracaoPorClasseData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              ></div>
                              {item.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.value.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlacoes" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <CorrelationMatrix 
              posicoes={posicoes} 
              ativos={Object.values(ativos) as Ativo[]} 
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Sobre Correlação de Ativos
                  </div>
                </CardTitle>
                <CardDescription>
                  Entenda como a correlação afeta a diversificação do seu portfólio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p>
                    <strong>Correlação</strong> é uma medida estatística que indica como dois ativos 
                    tendem a se movimentar em relação um ao outro. Os valores variam de -1 a +1:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong className="text-red-500">Correlação positiva alta (perto de +1)</strong>: 
                      Os ativos tendem a se movimentar na mesma direção com magnitude similar.
                      Isso <strong>reduz o benefício de diversificação</strong>.
                    </li>
                    <li>
                      <strong className="text-green-500">Correlação negativa (perto de -1)</strong>: 
                      Os ativos tendem a se movimentar em direções opostas.
                      Isso <strong>aumenta significativamente a diversificação</strong> e reduz o risco.
                    </li>
                    <li>
                      <strong>Correlação próxima de zero</strong>: 
                      Os ativos se movimentam de forma independente entre si.
                      Isso <strong>oferece bons benefícios de diversificação</strong>.
                    </li>
                  </ul>
                  <p>
                    Um portfólio ideal deve combinar ativos com baixa correlação entre si, reduzindo a 
                    volatilidade total sem necessariamente sacrificar o retorno esperado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="riscos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  Riscos Identificados
                </div>
              </CardTitle>
              <CardDescription>
                Pontos de atenção no portfólio atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analise.riscosIdentificados && analise.riscosIdentificados.length > 0 ? (
                <div className="space-y-4">
                  {analise.riscosIdentificados.map((risco, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Risco {index + 1}</AlertTitle>
                      <AlertDescription>{risco}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum risco significativo identificado no portfólio atual.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oportunidades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Oportunidades Identificadas
                </div>
              </CardTitle>
              <CardDescription>
                Sugestões para melhorar seu portfólio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analise.oportunidadesIdentificadas && analise.oportunidadesIdentificadas.length > 0 ? (
                <div className="space-y-4">
                  {analise.oportunidadesIdentificadas.map((oportunidade, index) => (
                    <Alert key={index}>
                      <Lightbulb className="h-4 w-4" />
                      <AlertTitle>Oportunidade {index + 1}</AlertTitle>
                      <AlertDescription>{oportunidade}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Não identificamos oportunidades significativas de melhoria neste momento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rebalanceamento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Sugestões de Rebalanceamento
                </div>
              </CardTitle>
              <CardDescription>
                Ajustes recomendados para otimizar seu portfólio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analise.sugestoesRebalanceamento && analise.sugestoesRebalanceamento.length > 0 ? (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Atual</TableHead>
                        <TableHead>Sugerido</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Justificativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analise.sugestoesRebalanceamento
                        .filter(s => s.acaoRecomendada !== 'manter')
                        .map((sugestao, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {ativos[sugestao.ativoId]?.nome || `Ativo #${sugestao.ativoId}`}
                          </TableCell>
                          <TableCell>{sugestao.percentualAtual.toFixed(1)}%</TableCell>
                          <TableCell>{sugestao.percentualRecomendado.toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {renderActionIcon(sugestao.acaoRecomendada)}
                              <span className="capitalize">
                                {sugestao.acaoRecomendada}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {sugestao.justificativa}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Ativos mantidos na alocação atual:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analise.sugestoesRebalanceamento
                        .filter(s => s.acaoRecomendada === 'manter')
                        .map((sugestao, index) => (
                          <Badge key={index} variant="secondary">
                            {ativos[sugestao.ativoId]?.nome || `Ativo #${sugestao.ativoId}`}{" "}
                            ({sugestao.percentualAtual.toFixed(1)}%)
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Não há sugestões de rebalanceamento neste momento.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                Gerar Ordem de Rebalanceamento
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioAnalysisView; 