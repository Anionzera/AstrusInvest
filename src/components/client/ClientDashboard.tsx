import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { db, Cliente, Posicao, PortfolioAnalysis } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDown,
  Calendar,
  Target,
  RefreshCw,
  ChevronRight,
  MoveRight,
  LineChart as LineChartIcon,
  PercentIcon
} from "lucide-react";

interface ClientDashboardProps {
  clienteId: number;
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
  "#8884d8", "#82ca9d", "#ffc658", "#FF6B6B"
];

const ClientDashboard: React.FC<ClientDashboardProps> = ({ clienteId }) => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [analise, setAnalise] = useState<PortfolioAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [valorTotal, setValorTotal] = useState(0);
  const [rentabilidadeTotal, setRentabilidadeTotal] = useState(0);
  const [performance, setPerformance] = useState<any[]>([]);
  const [alocacao, setAlocacao] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar dados do cliente e portfólio
  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        // Buscar cliente
        const clienteData = await db.clientes.get(clienteId);
        if (!clienteData) {
          throw new Error("Cliente não encontrado");
        }
        setCliente(clienteData);

        // Buscar posições
        const posicoesData = await db.posicoes
          .where("clienteId")
          .equals(clienteId)
          .toArray();
        setPosicoes(posicoesData);

        // Calcular valor total
        const total = posicoesData.reduce(
          (sum, pos) => sum + (pos.quantidade * pos.precoMedio || 0),
          0
        );
        setValorTotal(total);

        // Buscar análise mais recente
        const analises = await db.portfolioAnalyses
          .where("clienteId")
          .equals(clienteId)
          .reverse()
          .sortBy("data");
          
        if (analises.length > 0) {
          setAnalise(analises[0]);
          setRentabilidadeTotal(analises[0].retornoEsperado.base);
        }

        // Gerar dados de performance simulados
        gerarDadosPerformance();
        
        // Gerar dados de alocação
        gerarDadosAlocacao(posicoesData);
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do cliente."
        });
      } finally {
        setIsLoading(false);
      }
    };

    carregarDados();
  }, [clienteId, toast]);

  // Gerar dados de performance simulados
  const gerarDadosPerformance = () => {
    const meses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    
    const data = [];
    let valor = 100;
    
    for (let i = 0; i < 12; i++) {
      const variacao = (Math.random() * 0.08) - 0.02; // Entre -2% e +6%
      valor = valor * (1 + variacao);
      
      data.push({
        name: meses[i],
        portfolio: Math.round(valor * 100) / 100,
        cdi: Math.round((100 * (1 + (0.008 * (i + 1)))) * 100) / 100,
        ibovespa: Math.round((100 * (1 + (0.003 * (i + 1)) + (Math.random() * 0.12) - 0.06)) * 100) / 100
      });
    }
    
    setPerformance(data);
  };
  
  // Gerar dados de alocação por classe de ativo
  const gerarDadosAlocacao = async (posicoes: Posicao[]) => {
    try {
      // Em um cenário real, você calcularia isso com base nas posições reais
      // e na classificação dos ativos
      
      // Este é um exemplo simplificado
      const ativosMap = {};
      
      // Buscar todos os ativos para classificação
      const todosAtivos = await db.ativos.toArray();
      
      // Criar mapa de ativos por ID
      todosAtivos.forEach(ativo => {
        if (ativo.id) {
          ativosMap[ativo.id] = ativo;
        }
      });
      
      // Agrupar por categoria
      const categorias = {};
      
      posicoes.forEach(posicao => {
        const ativo = ativosMap[posicao.ativoId];
        const categoria = ativo?.categoria || "Outros";
        const valor = posicao.quantidade * posicao.precoMedio;
        
        categorias[categoria] = (categorias[categoria] || 0) + valor;
      });
      
      // Converter para formato do gráfico
      const alocacaoData = Object.entries(categorias).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }));
      
      setAlocacao(alocacaoData);
    } catch (error) {
      console.error("Erro ao gerar dados de alocação:", error);
      // Dados de fallback
      setAlocacao([
        { name: "Renda Fixa", value: 40, color: COLORS[0] },
        { name: "Ações", value: 30, color: COLORS[1] },
        { name: "Fundos Imobiliários", value: 15, color: COLORS[2] },
        { name: "Internacional", value: 10, color: COLORS[3] },
        { name: "Outros", value: 5, color: COLORS[4] }
      ]);
    }
  };

  // Formatar valor monetário
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar percentual
  const formatarPercentual = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-20" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>
        <Skeleton className="w-full h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações do cliente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold">{cliente?.nome}</h2>
            <p className="text-blue-100">
              {cliente?.email} • {cliente?.telefone}
            </p>
            <div className="flex items-center mt-1">
              <Badge variant="outline" className="bg-blue-500/20 border-blue-300 text-white">
                {cliente?.perfilRisco || "Perfil não definido"}
              </Badge>
              <span className="mx-2">•</span>
              <span className="text-sm text-blue-100">
                Cliente desde {cliente?.dataCadastro ? new Date(cliente.dataCadastro).toLocaleDateString('pt-BR') : "N/A"}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-700"
              onClick={() => navigate(`/risk-analysis/${clienteId}`)}>
              Análise de Risco
            </Button>
            <Button 
              className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => navigate(`/clients/${clienteId}/portfolio`)}>
              Gerenciar Portfólio
            </Button>
          </div>
        </div>
      </div>

      {/* Cards com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patrimônio Total */}
        <Card className="overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-1 text-blue-500" />
              Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatarValor(valorTotal)}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {posicoes.length} posições ativas
            </p>
          </CardContent>
        </Card>

        {/* Rentabilidade */}
        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-1 text-green-500" />
              Rentabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-3xl font-bold">
                {rentabilidadeTotal > 0 ? "+" : ""}
                {rentabilidadeTotal.toFixed(2)}%
              </span>
              <span className={`ml-2 flex items-center text-sm ${rentabilidadeTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {rentabilidadeTotal >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                  <ArrowDownRight className="h-4 w-4 mr-1" />}
                YTD
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              vs. CDI +14.25%
            </p>
          </CardContent>
        </Card>

        {/* Risco */}
        <Card className="overflow-hidden border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-1 text-amber-500" />
              Nível de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-2xl font-bold">
                  {analise?.riskScore || 50}/100
                </span>
                <Badge variant={analise?.riskScore && analise.riskScore > 70 ? "destructive" : 
                                analise?.riskScore && analise.riskScore > 40 ? "default" : "outline"}>
                  {analise?.riskScore && analise.riskScore > 70 ? "Alto" : 
                   analise?.riskScore && analise.riskScore > 40 ? "Médio" : "Baixo"}
                </Badge>
              </div>
              <Progress value={analise?.riskScore || 50} className="h-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Volatilidade: {analise?.volatilidade?.toFixed(2) || "N/A"}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="performance" className="flex items-center">
            <LineChartIcon className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="alocacao" className="flex items-center">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Alocação
          </TabsTrigger>
          <TabsTrigger value="metas" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Metas Financeiras
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Tabs */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance do Portfólio</CardTitle>
              <CardDescription>
                Comparação do desempenho do portfólio com benchmarks de mercado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-1">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCDI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="portfolio" stroke="#8884d8" fillOpacity={1} fill="url(#colorPortfolio)" name="Portfólio" />
                    <Area type="monotone" dataKey="cdi" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCDI)" name="CDI" />
                    <Line type="monotone" dataKey="ibovespa" stroke="#ff7300" name="Ibovespa" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Mudar Período
              </Button>
              <Button variant="outline" className="flex items-center" onClick={() => navigate(`/analysis`)}>
                Análise Avançada
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="alocacao">
          <Card>
            <CardHeader>
              <CardTitle>Alocação por Classe de Ativos</CardTitle>
              <CardDescription>
                Distribuição atual do portfólio por classe de ativos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center justify-around p-6">
              <div className="w-full md:w-1/2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alocacao}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {alocacao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatarValor(Number(value)), '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 mt-6 md:mt-0 space-y-4">
                {analise?.concentracaoPorClasse && Object.entries(analise.concentracaoPorClasse).map(([categoria, percentual], index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{categoria}</span>
                      <span className="text-sm">{formatarPercentual(percentual as number)}</span>
                    </div>
                    <Progress value={percentual as number} className="h-2" />
                  </div>
                ))}

                {/* Se não houver dados de análise, mostrar mensagem */}
                {(!analise?.concentracaoPorClasse || Object.keys(analise?.concentracaoPorClasse || {}).length === 0) && (
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                    <p>Não há dados detalhados de concentração disponíveis</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/analysis`)}>
                      Realizar Análise
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => navigate(`/clients/${clienteId}/portfolio`)} className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rebalancear Portfólio
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="metas">
          <Card>
            <CardHeader>
              <CardTitle>Metas Financeiras</CardTitle>
              <CardDescription>
                Acompanhamento das metas financeiras e objetivos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Exemplo de metas financeiras */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="font-medium">Aposentadoria</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Meta: {formatarValor(2500000)} até 2045
                      </p>
                    </div>
                    <span className="text-sm font-medium">45% completo</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="font-medium">Educação dos filhos</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Meta: {formatarValor(400000)} até 2035
                      </p>
                    </div>
                    <span className="text-sm font-medium">25% completo</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="font-medium">Reserva de emergência</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Meta: {formatarValor(50000)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">80% completo</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
              </div>

              {/* Mensagem para metas não definidas */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-blue-600 dark:text-blue-400">
                <p>
                  Defina objetivos financeiros claros para otimizar sua estratégia de investimentos.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button className="flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Adicionar Nova Meta
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Seção de alertas e recomendações */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle>Alertas e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analise?.riscosIdentificados && analise.riscosIdentificados.length > 0 ? (
              analise.riscosIdentificados.slice(0, 3).map((risco, index) => (
                <div key={index} className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                  <p>{risco}</p>
                </div>
              ))
            ) : (
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                <p>Concentração acima de 30% em um único ativo. Considere diversificar seu portfólio.</p>
              </div>
            )}

            {analise?.oportunidadesIdentificadas && analise.oportunidadesIdentificadas.length > 0 ? (
              analise.oportunidadesIdentificadas.slice(0, 2).map((oportunidade, index) => (
                <div key={index} className="flex items-start">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <p>{oportunidade}</p>
                </div>
              ))
            ) : (
              <div className="flex items-start">
                <TrendingUp className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <p>Potencial para melhorar o retorno adicionando exposição internacional ao portfólio.</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full flex items-center justify-center" onClick={() => navigate(`/clients/${clienteId}/portfolio`)}>
            <MoveRight className="h-4 w-4 mr-2" />
            Ver todas as recomendações
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientDashboard; 