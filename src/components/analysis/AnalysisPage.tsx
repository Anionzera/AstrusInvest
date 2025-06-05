import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Percent,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removing the problematic import
// import AppLayout from "../layout/AppLayout";
import { db } from "@/lib/db";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { AnimatedList } from "@/components/ui/animated-container";
import { useNavigate } from "react-router-dom";
import PortfolioOptimizer from "./PortfolioOptimizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface para os dados de estatísticas
interface EstatisticasDetalhadas {
  totalRecommendations: number;
  byRiskProfile: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  byStatus: {
    draft: number;
    final: number;
  };
  byStrategy: {
    permanentPortfolio: number;
    allWeather: number;
    custom: number;
  };
  estrategiasDetalhadas: Record<string, number>;
}

const AnalysisPage = () => {
  const [totalInvestido, setTotalInvestido] = useState(0);
  const [totalRecomendacoes, setTotalRecomendacoes] = useState(0);
  const [perfilDistribuicao, setPerfilDistribuicao] = useState([]);
  const [estrategiaDistribuicao, setEstrategiaDistribuicao] = useState([]);
  const [timeframe, setTimeframe] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [recomendacoesPorMes, setRecomendacoesPorMes] = useState([]);
  const [valorInvestidoPorMes, setValorInvestidoPorMes] = useState([]);
  // Novo estado para estatísticas detalhadas
  const [estatisticasDetalhadas, setEstatisticasDetalhadas] = useState<EstatisticasDetalhadas>({
    totalRecommendations: 0,
    byRiskProfile: {
      conservative: 0,
      moderate: 0,
      aggressive: 0,
    },
    byStatus: {
      draft: 0,
      final: 0,
    },
    byStrategy: {
      permanentPortfolio: 0,
      allWeather: 0,
      custom: 0,
    },
    estrategiasDetalhadas: {} as Record<string, number>,
  });

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  const navigate = useNavigate();

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const todasRecomendacoes = await db.recomendacoes.toArray();
      const recomendacoesFiltradas = filtrarPorTimeframe(
        todasRecomendacoes,
        timeframe,
      );

      // Calcular total investido
      const total = recomendacoesFiltradas.reduce(
        (sum, rec) => sum + (rec.valorInvestimento || 0),
        0,
      );
      setTotalInvestido(total);

      // Calcular total de recomendações
      setTotalRecomendacoes(recomendacoesFiltradas.length);

      // Calcular distribuição por perfil de risco
      const perfilCount = {};
      recomendacoesFiltradas.forEach((rec) => {
        const perfil = rec.perfilRisco || "Não definido";
        perfilCount[perfil] = (perfilCount[perfil] || 0) + 1;
      });

      const perfilData = Object.entries(perfilCount).map(([name, value]) => ({
        name,
        value,
      }));
      setPerfilDistribuicao(perfilData);

      // Calcular distribuição por estratégia
      const estrategiaCount = {};
      recomendacoesFiltradas.forEach((rec) => {
        const estrategia = rec.estrategia || "Não definida";
        estrategiaCount[estrategia] = (estrategiaCount[estrategia] || 0) + 1;
      });

      const estrategiaData = Object.entries(estrategiaCount).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );
      setEstrategiaDistribuicao(estrategiaData);

      // Calcular e atualizar alocação média
      const novaAlocacaoMedia = calcularAlocacaoMedia(recomendacoesFiltradas);
      if (novaAlocacaoMedia && novaAlocacaoMedia.length > 0) {
        setAlocacaoMediaData(novaAlocacaoMedia);
      }

      // Calcular dados de desempenho baseados em recomendações reais
      calcularDadosDesempenho(recomendacoesFiltradas);

      // Calcular recomendações por mês (últimos 6 meses)
      const meses = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      const recomendacoesPorMesData = [];
      
      // Dados para calcular a evolução do valor investido por mês
      const valorInvestidoPorMesData = [];

      for (let i = 5; i >= 0; i--) {
        const dataReferencia = new Date();
        dataReferencia.setMonth(dataReferencia.getMonth() - i);
        const mes = dataReferencia.getMonth();
        const ano = dataReferencia.getFullYear();

        const recomendacoesMes = recomendacoesFiltradas.filter((rec) => {
          const dataRec = new Date(rec.data);
          return dataRec.getMonth() === mes && dataRec.getFullYear() === ano;
        });

        const contagem = recomendacoesMes.length;
        
        // Calcular o valor investido neste mês
        const valorInvestido = recomendacoesMes.reduce(
          (total, rec) => total + (rec.valorInvestimento || 0),
          0
        );

        recomendacoesPorMesData.push({
          month: meses[mes],
          count: contagem,
        });
        
        valorInvestidoPorMesData.push({
          month: meses[mes],
          value: valorInvestido
        });
      }
      
      setRecomendacoesPorMes(recomendacoesPorMesData);
      setValorInvestidoPorMes(valorInvestidoPorMesData);

      // Carregar estatísticas detalhadas
      await carregarEstatisticasDetalhadas(recomendacoesFiltradas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [timeframe]);

  // Efeito para calcular a alocação média quando as recomendações são carregadas
  useEffect(() => {
    const calcularDadosAlocacaoMedia = async () => {
      try {
        const todasRecomendacoes = await db.recomendacoes.toArray();
        const recomendacoesFiltradas = filtrarPorTimeframe(
          todasRecomendacoes,
          timeframe,
        );

        // Calcular e atualizar alocação média
        const novaAlocacaoMedia = calcularAlocacaoMedia(recomendacoesFiltradas);
        if (novaAlocacaoMedia && novaAlocacaoMedia.length > 0) {
          setAlocacaoMediaData(novaAlocacaoMedia);
        }

        // Calcular dados de desempenho baseados em recomendações reais
        // Esta é uma simulação - em um ambiente real, você usaria dados de desempenho real
        calcularDadosDesempenho(recomendacoesFiltradas);
      } catch (error) {
        console.error("Erro ao calcular dados de alocação média:", error);
      }
    };

    calcularDadosAlocacaoMedia();
  }, [timeframe]);

  // Função para calcular dados de desempenho simulados baseados nas recomendações
  const calcularDadosDesempenho = (recomendacoes) => {
    if (!recomendacoes || recomendacoes.length === 0) return;

    // Contar recomendações por perfil
    const contagem = {
      Conservador: 0,
      Moderado: 0,
      Agressivo: 0,
    };

    recomendacoes.forEach((rec) => {
      if (rec.perfilRisco && contagem[rec.perfilRisco] !== undefined) {
        contagem[rec.perfilRisco]++;
      }
    });

    // Gerar dados de desempenho mais realistas baseados na distribuição de perfis
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    const novosDados = meses.map((mes, index) => {
      // Base de desempenho com alguma variação aleatória
      const baseConservador = 0.5 + Math.random() * 0.3;
      const baseModerado = 0.8 + Math.random() * 0.5;
      const baseAgressivo = 1.2 + Math.random() * 1.0;

      // Adicionar alguma volatilidade para o perfil agressivo
      const volatilidade = index % 3 === 0 ? -1 : 1;

      return {
        name: mes,
        conservador: parseFloat(
          (baseConservador * (1 + contagem.Conservador / 10)).toFixed(1),
        ),
        moderado: parseFloat(
          (baseModerado * (1 + contagem.Moderado / 10)).toFixed(1),
        ),
        agressivo: parseFloat(
          (
            baseAgressivo *
            volatilidade *
            (1 + contagem.Agressivo / 10)
          ).toFixed(1),
        ),
      };
    });

    setPerformanceData(novosDados);
  };

  const filtrarPorTimeframe = (recomendacoes, timeframe) => {
    if (timeframe === "all") return recomendacoes;

    const hoje = new Date();
    const dataLimite = new Date();

    switch (timeframe) {
      case "month":
        dataLimite.setMonth(hoje.getMonth() - 1);
        break;
      case "quarter":
        dataLimite.setMonth(hoje.getMonth() - 3);
        break;
      case "year":
        dataLimite.setFullYear(hoje.getFullYear() - 1);
        break;
      default:
        return recomendacoes;
    }

    return recomendacoes.filter((rec) => new Date(rec.data) >= dataLimite);
  };

  // Dados para o gráfico de desempenho baseados em dados reais ou simulados
  const [performanceData, setPerformanceData] = useState([
    { name: "Jan", conservador: 2.1, moderado: 3.2, agressivo: 4.5 },
    { name: "Fev", conservador: 2.3, moderado: 3.0, agressivo: -2.1 },
    { name: "Mar", conservador: 1.8, moderado: 2.8, agressivo: 5.2 },
    { name: "Abr", conservador: 2.0, moderado: 3.5, agressivo: 6.1 },
    { name: "Mai", conservador: 1.5, moderado: 2.1, agressivo: -1.8 },
    { name: "Jun", conservador: 1.9, moderado: 3.0, agressivo: 4.2 },
  ]);

  // Dados para o gráfico de alocação média baseados em dados reais
  const [alocacaoMediaData, setAlocacaoMediaData] = useState([
    { name: "Ações", value: 35 },
    { name: "Renda Fixa", value: 40 },
    { name: "Alternativos", value: 15 },
    { name: "Caixa", value: 10 },
  ]);

  // Calcular alocação média baseada nas recomendações existentes
  const calcularAlocacaoMedia = (recomendacoes) => {
    if (!recomendacoes || recomendacoes.length === 0) return;

    // Mapear todas as classes de ativos únicas
    const todasClasses = new Set();
    recomendacoes.forEach((rec) => {
      if (rec.alocacaoAtivos && rec.alocacaoAtivos.length > 0) {
        rec.alocacaoAtivos.forEach((ativo) => {
          todasClasses.add(ativo.nome);
        });
      }
    });

    // Inicializar contadores para cada classe
    const somaPorClasse = {};
    const contagemPorClasse = {};
    todasClasses.forEach((classe) => {
      somaPorClasse[classe] = 0;
      contagemPorClasse[classe] = 0;
    });

    // Somar percentuais para cada classe
    recomendacoes.forEach((rec) => {
      if (rec.alocacaoAtivos && rec.alocacaoAtivos.length > 0) {
        rec.alocacaoAtivos.forEach((ativo) => {
          somaPorClasse[ativo.nome] += ativo.percentual;
          contagemPorClasse[ativo.nome]++;
        });
      }
    });

    // Calcular média e formatar dados
    const mediaPorClasse = Array.from(todasClasses).map((classe) => ({
      name: classe,
      value: Math.round(
        somaPorClasse[classe] / Math.max(1, contagemPorClasse[classe]),
      ),
    }));

    // Ordenar por valor e limitar a 6 classes para melhor visualização
    return mediaPorClasse.sort((a, b) => b.value - a.value).slice(0, 6);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Função para formatar percentual
  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  // Nova função para carregar estatísticas detalhadas (movida do HistoryManager)
  const carregarEstatisticasDetalhadas = async (recomendacoes) => {
    try {
      // Contagem total
      const totalRecommendations = recomendacoes.length;

      // Contagem por perfil de risco
      const byRiskProfile = {
        conservative: 0,
        moderate: 0,
        aggressive: 0,
      };

      // Contagem por status
      const byStatus = {
        draft: 0,
        final: 0,
      };

      // Contagem por estratégia - substituindo o objeto fixo por um Map dinâmico
      const estrategiasMap = new Map();

      // Processar cada recomendação
      recomendacoes.forEach((rec) => {
        // Perfil de risco
        if (rec.perfilRisco === "Conservador") byRiskProfile.conservative++;
        else if (rec.perfilRisco === "Moderado") byRiskProfile.moderate++;
        else if (rec.perfilRisco === "Agressivo") byRiskProfile.aggressive++;

        // Status
        if (rec.status === "Rascunho") byStatus.draft++;
        else if (rec.status === "Final") byStatus.final++;

        // Estratégia - contabilizando dinamicamente todas as estratégias
        const estrategia = rec.estrategia || "Não definida";
        estrategiasMap.set(estrategia, (estrategiasMap.get(estrategia) || 0) + 1);
      });

      // Convertendo o Map em um objeto para facilitar o uso nos componentes
      const byStrategy = Object.fromEntries(estrategiasMap);

      // Mantendo as categorias específicas para compatibilidade com o código existente
      const estrategiasMapeadas = {
        permanentPortfolio: byStrategy["Portfólio Permanente"] || 0,
        allWeather: byStrategy["Portfólio All Weather"] || 0,
        custom: recomendacoes.length - 
               (byStrategy["Portfólio Permanente"] || 0) - 
               (byStrategy["Portfólio All Weather"] || 0),
      };

      setEstatisticasDetalhadas({
        totalRecommendations,
        byRiskProfile,
        byStatus,
        byStrategy: estrategiasMapeadas,
        estrategiasDetalhadas: byStrategy,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas detalhadas:", error);
    }
  };

  // Função para determinar a estratégia mais usada
  const getMostUsedStrategy = () => {
    const { permanentPortfolio, allWeather, custom } = estatisticasDetalhadas.byStrategy;
    
    // Se temos dados detalhados, usamos eles para determinar a estratégia mais usada
    if (estatisticasDetalhadas.estrategiasDetalhadas && Object.keys(estatisticasDetalhadas.estrategiasDetalhadas).length > 0) {
      let maxCount = 0;
      let maxEstrategia = "Personalizada";
      
      Object.entries(estatisticasDetalhadas.estrategiasDetalhadas).forEach(([estrategia, count]) => {
        if (Number(count) > maxCount) {
          maxCount = Number(count);
          maxEstrategia = estrategia;
        }
      });
      
      return maxEstrategia;
    }
    
    // Fallback para o método antigo
    if (permanentPortfolio > allWeather && permanentPortfolio > custom)
      return "Portfólio Permanente";
    if (allWeather > custom) return "All Weather";
    return "Personalizada";
  };

  // Função para calcular a taxa de conclusão
  const getCompletionRate = () => {
    if (estatisticasDetalhadas.totalRecommendations === 0) return "0%";
    const rate =
      (estatisticasDetalhadas.byStatus.final / estatisticasDetalhadas.totalRecommendations) * 100;
    return `${Math.round(isNaN(rate) ? 0 : rate)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight dark:text-white">
              Análise de Portfólio
            </h1>
            <p className="text-muted-foreground dark:text-gray-300">
              Análise detalhada das recomendações de investimento e desempenho.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={timeframe}
              onValueChange={setTimeframe}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[180px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
              onClick={carregarDados}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">
                Total Investido
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {formatCurrency(totalInvestido)}
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Valor total em recomendações
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">
                Recomendações
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {totalRecomendacoes}
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Total de recomendações
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">
                Retorno Médio
              </CardTitle>
              <ArrowUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">+8.2%</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Nos últimos 12 meses
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">
                Volatilidade
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">12.5%</div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Desvio padrão anualizado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Distribuição por Perfil de Risco
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Quantidade de recomendações por perfil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={
                        perfilDistribuicao.length > 0
                          ? perfilDistribuicao
                          : [
                              { name: "Conservador", value: 1 },
                              { name: "Moderado", value: 1 },
                              { name: "Agressivo", value: 1 },
                            ]
                      }
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
                      {(perfilDistribuicao.length > 0
                        ? perfilDistribuicao
                        : [
                            { name: "Conservador", value: 1 },
                            { name: "Moderado", value: 1 },
                            { name: "Agressivo", value: 1 },
                          ]
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Distribuição por Estratégia
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Quantidade de recomendações por estratégia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={
                        estrategiaDistribuicao.length > 0
                          ? estrategiaDistribuicao
                          : [
                              { name: "All Weather", value: 1 },
                              { name: "Permanente", value: 1 },
                              { name: "60/40", value: 1 },
                            ]
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name.length > 10 ? name.substring(0, 10) + "..." : name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(estrategiaDistribuicao.length > 0
                        ? estrategiaDistribuicao
                        : [
                            { name: "All Weather", value: 1 },
                            { name: "Permanente", value: 1 },
                            { name: "60/40", value: 1 },
                          ]
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Alocação Média por Classe de Ativos
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Distribuição média das recomendações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={alocacaoMediaData}
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
                      {alocacaoMediaData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Desempenho por Perfil de Risco
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Retorno mensal por perfil (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={performanceData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="conservador"
                      stroke="#0088FE"
                      activeDot={{ r: 8 }}
                    />
                    <Line type="monotone" dataKey="moderado" stroke="#00C49F" />
                    <Line
                      type="monotone"
                      dataKey="agressivo"
                      stroke="#FF8042"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adicionar gráfico de Evolução de Investimentos */}
        <div className="grid grid-cols-1 gap-6 mt-8">
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Evolução de Investimentos
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Crescimento do valor total investido nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      valorInvestidoPorMes.length > 0
                        ? valorInvestidoPorMes
                        : [
                            { month: "Jan", value: 0 },
                            { month: "Fev", value: 0 },
                            { month: "Mar", value: 0 },
                            { month: "Abr", value: 0 },
                            { month: "Mai", value: 0 },
                            { month: "Jun", value: 0 },
                          ]
                    }
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4f46e5"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4f46e5"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(value),
                        "Valor Investido"
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        border: "none",
                        color: "#333",
                      }}
                      animationDuration={300}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Valor Investido"
                      stroke="#4f46e5"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      animationBegin={200}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Adicionar seção de Recomendações por Mês */}
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Recomendações por Mês
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Número de recomendações geradas nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={
                      recomendacoesPorMes.length > 0
                        ? recomendacoesPorMes
                        : [
                            { month: "Jan", count: 0 },
                            { month: "Fev", count: 0 },
                            { month: "Mar", count: 0 },
                            { month: "Abr", count: 0 },
                            { month: "Mai", count: 0 },
                            { month: "Jun", count: 0 },
                          ]
                    }
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [value, "Recomendações"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        border: "none",
                        color: "#333",
                      }}
                      animationDuration={300}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Recomendações"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      animationBegin={200}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Alertas e Insights */}
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Alertas e Insights
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Informações importantes sobre seu portfólio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedList
                animation="slideUp"
                staggerDelay={0.15}
                className="space-y-4"
              >
                {totalRecomendacoes === 0
                  ? [
                      <div
                        key="no-recommendations"
                        className="flex items-start p-4 border border-blue-100 dark:border-blue-900/30 rounded-lg bg-blue-50 dark:bg-blue-900/10 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="mr-3 mt-0.5">
                          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            Comece a usar o sistema
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                            Você ainda não possui recomendações. Crie sua
                            primeira recomendação para começar a
                            visualizar estatísticas e insights.
                          </p>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-blue-700 dark:text-blue-300 p-0 h-auto mt-2 transition-all duration-200 hover:translate-x-1"
                            onClick={() =>
                              navigate("/recommendation/new")
                            }
                          >
                            Criar primeira recomendação
                          </Button>
                        </div>
                      </div>,
                    ]
                  : [
                      <div
                        key="growth"
                        className="flex items-start p-4 border border-emerald-100 dark:border-emerald-900/30 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="mr-3 mt-0.5">
                          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                            Crescimento positivo
                          </h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                            {totalRecomendacoes > 0 
                              ? `Suas recomendações estão em crescimento. Continue acompanhando o desempenho.`
                              : `Comece a criar recomendações para visualizar dados de crescimento.`
                            }
                          </p>
                        </div>
                      </div>,
                      <div
                        key="diversification"
                        className="flex items-start p-4 border border-amber-100 dark:border-amber-900/30 rounded-lg bg-amber-50 dark:bg-amber-900/10 transition-all duration-300 hover:shadow-md"
                      >
                        <div className="mr-3 mt-0.5">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Diversificação de portfólio
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Considere diversificar mais seu portfólio para
                            reduzir riscos. Analise a distribuição de
                            estratégias para identificar oportunidades.
                          </p>
                        </div>
                      </div>,
                    ]}
              </AnimatedList>
            </CardContent>
          </Card>

          {/* Estatísticas Detalhadas - Movidas do HistoryManager */}
          <Card className="col-span-1 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">
                Estatísticas Detalhadas
              </CardTitle>
              <CardDescription className="dark:text-gray-300">
                Análise detalhada por perfil de risco, status e estratégias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Profile Distribution */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg dark:text-white">Perfil de Risco</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Conservador</span>
                      <span>{estatisticasDetalhadas.byRiskProfile.conservative}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            estatisticasDetalhadas.totalRecommendations > 0
                              ? (estatisticasDetalhadas.byRiskProfile.conservative /
                                  estatisticasDetalhadas.totalRecommendations) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between">
                      <span>Moderado</span>
                      <span>{estatisticasDetalhadas.byRiskProfile.moderate}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${
                            estatisticasDetalhadas.totalRecommendations > 0
                              ? (estatisticasDetalhadas.byRiskProfile.moderate /
                                  estatisticasDetalhadas.totalRecommendations) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between">
                      <span>Agressivo</span>
                      <span>{estatisticasDetalhadas.byRiskProfile.aggressive}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{
                          width: `${
                            estatisticasDetalhadas.totalRecommendations > 0
                              ? (estatisticasDetalhadas.byRiskProfile.aggressive /
                                  estatisticasDetalhadas.totalRecommendations) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg dark:text-white">Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Rascunho</span>
                      <span>{estatisticasDetalhadas.byStatus.draft}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${
                            estatisticasDetalhadas.totalRecommendations > 0
                              ? (estatisticasDetalhadas.byStatus.draft /
                                  estatisticasDetalhadas.totalRecommendations) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between">
                      <span>Final</span>
                      <span>{estatisticasDetalhadas.byStatus.final}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            estatisticasDetalhadas.totalRecommendations > 0
                              ? (estatisticasDetalhadas.byStatus.final /
                                  estatisticasDetalhadas.totalRecommendations) *
                                100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>

                    <div className="mt-4 pt-4 border-t dark:border-gray-600">
                      <div className="flex justify-between font-medium">
                        <span>Taxa de Conclusão</span>
                        <span>{getCompletionRate()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Distribution */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg dark:text-white">Estratégias</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {estatisticasDetalhadas.estrategiasDetalhadas ? (
                      // Renderizar todas as estratégias dinamicamente
                      Object.entries(estatisticasDetalhadas.estrategiasDetalhadas).map(([estrategia, count], index) => {
                        return (
                          <React.Fragment key={estrategia}>
                            <div className="flex justify-between">
                              <span>{estrategia}</span>
                              <span>{Number(count)}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${index % 6 === 0 ? "bg-purple-500" : 
                                          index % 6 === 1 ? "bg-indigo-500" : 
                                          index % 6 === 2 ? "bg-cyan-500" : 
                                          index % 6 === 3 ? "bg-emerald-500" : 
                                          index % 6 === 4 ? "bg-amber-500" : 
                                          "bg-rose-500"}`}
                                style={{
                                  width: `${
                                    estatisticasDetalhadas.totalRecommendations > 0
                                      ? (Number(count) / estatisticasDetalhadas.totalRecommendations) * 100
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      // Fallback para o método antigo
                      <>
                        <div className="flex justify-between">
                          <span>Portfólio Permanente</span>
                          <span>{estatisticasDetalhadas.byStrategy.permanentPortfolio}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{
                              width: `${
                                estatisticasDetalhadas.totalRecommendations > 0
                                  ? (estatisticasDetalhadas.byStrategy.permanentPortfolio /
                                      estatisticasDetalhadas.totalRecommendations) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>

                        <div className="flex justify-between">
                          <span>All Weather</span>
                          <span>{estatisticasDetalhadas.byStrategy.allWeather}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${
                                estatisticasDetalhadas.totalRecommendations > 0
                                  ? (estatisticasDetalhadas.byStrategy.allWeather /
                                      estatisticasDetalhadas.totalRecommendations) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>

                        <div className="flex justify-between">
                          <span>Personalizada</span>
                          <span>{estatisticasDetalhadas.byStrategy.custom}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{
                              width: `${
                                estatisticasDetalhadas.totalRecommendations > 0
                                  ? (estatisticasDetalhadas.byStrategy.custom /
                                      estatisticasDetalhadas.totalRecommendations) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="md:col-span-3 mt-4 pt-4 border-t dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium dark:text-white">
                        Total de Recomendações
                      </h3>
                      <p className="text-3xl font-bold dark:text-white">
                        {estatisticasDetalhadas.totalRecommendations}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium dark:text-white">Perfil Mais Comum</h3>
                      <p className="text-3xl font-bold dark:text-white">
                        {(() => {
                          const { conservative, moderate, aggressive } = estatisticasDetalhadas.byRiskProfile;
                          if (conservative > moderate && conservative > aggressive)
                            return "Conservador";
                          if (moderate > aggressive) return "Moderado";
                          return "Agressivo";
                        })()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium dark:text-white">
                        Estratégia Mais Usada
                      </h3>
                      <p className="text-3xl font-bold dark:text-white">
                        {getMostUsedStrategy()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="optimizer" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="optimizer">Otimização de Portfólio</TabsTrigger>
          </TabsList>
          <TabsContent value="optimizer" className="space-y-6">
            <PortfolioOptimizer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalysisPage;
