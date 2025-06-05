import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import {
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  History,
  FileText,
  Settings,
  Users,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Calendar,
  Target,
  AlertCircle,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";
import QuickActions from "./QuickActions";
import RecentRecommendations from "./RecentRecommendations";
import ClientRecommendationStats from "./ClientRecommendationStats";
import PerformanceMetrics from "./PerformanceMetrics";
import ClientAnalytics from "../client/ClientAnalytics";
import { db, inicializarDB } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AnimatedContainer,
  AnimatedList,
  AnimatedSection,
} from "../ui/animated-container";
import { ChartContainer } from "../ui/chart-container";

interface DashboardContentProps {
  userName?: string;
  totalRecommendations?: number;
  activeStrategies?: number;
  monthlyGrowth?: number;
  customSettings?: {
    showQuickActions: boolean;
    showPerformanceMetrics: boolean;
    showClientStats: boolean;
    showRecentRecommendations: boolean;
    showPortfolioMetrics: boolean;
  };
}

const DashboardContent = ({
  userName = "Equipe de Investimentos",
  totalRecommendations = 0,
  activeStrategies = 0,
  monthlyGrowth = 0,
  customSettings = {
    showQuickActions: true,
    showPerformanceMetrics: true,
    showClientStats: true,
    showRecentRecommendations: true,
    showPortfolioMetrics: true
  }
}: DashboardContentProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRecomendacoes: totalRecommendations,
    estrategiasAtivas: activeStrategies,
    crescimentoMensal: monthlyGrowth,
    valorTotalInvestido: 0,
    valorMedioPorRecomendacao: 0,
    perfilDistribution: [] as { name: string; value: number }[],
    estrategiaDistribution: [] as { name: string; value: number }[],
    recomendacoesPorMes: [] as { month: string; count: number }[],
    valorInvestidoPorMes: [] as { month: string; value: number }[],
    recentRecommendations: [] as any[],
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Inicializa o banco de dados local
    inicializarDB()
      .then(() => {
        // Carrega estatísticas do banco de dados
        carregarEstatisticas();
      })
      .catch((err) => {
        console.error("Erro ao inicializar banco de dados:", err);
      });
  }, []);

  const carregarEstatisticas = async () => {
    setIsLoading(true);
    try {
      const totalRecomendacoes = await db.recomendacoes.count();

      // Busca todas as recomendações
      const todasRecomendacoes = await db.recomendacoes.toArray();

      // Conta TODAS as estratégias únicas (sem limitar a 5)
      const estrategiasUnicas = new Set(
        todasRecomendacoes.map((rec) => rec.estrategia),
      );

      // Calcula o valor total investido
      const valorTotalInvestido = todasRecomendacoes.reduce(
        (total, rec) => total + (rec.valorInvestimento || 0),
        0,
      );

      // Calcula o valor médio por recomendação
      const valorMedioPorRecomendacao =
        totalRecomendacoes > 0 ? valorTotalInvestido / totalRecomendacoes : 0;

      // Calcular distribuição por perfil de risco
      const perfilCounts = {
        Conservador: 0,
        Moderado: 0,
        Agressivo: 0,
      };

      todasRecomendacoes.forEach((rec) => {
        if (
          rec.perfilRisco &&
          perfilCounts[rec.perfilRisco as keyof typeof perfilCounts] !==
            undefined
        ) {
          perfilCounts[rec.perfilRisco as keyof typeof perfilCounts]++;
        }
      });

      const perfilDistribution = Object.entries(perfilCounts).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );

      // Calcular distribuição por estratégia - agora contabilizando TODAS
      const estrategiaCounts: Record<string, number> = {};
      todasRecomendacoes.forEach((rec) => {
        if (rec.estrategia) {
          estrategiaCounts[rec.estrategia] =
            (estrategiaCounts[rec.estrategia] || 0) + 1;
        }
      });

      // Não limitar a apenas 5 estratégias
      const estrategiaDistribution = Object.entries(estrategiaCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Calcular crescimento mensal baseado em dados reais
      const hoje = new Date();
      const umMesAtras = new Date();
      umMesAtras.setMonth(hoje.getMonth() - 1);

      const recomendacoesUltimoMes = todasRecomendacoes.filter(
        (rec) => new Date(rec.data) >= umMesAtras,
      );

      const crescimentoMensal =
        recomendacoesUltimoMes.length > 0
          ? (recomendacoesUltimoMes.length /
              Math.max(1, totalRecomendacoes - recomendacoesUltimoMes.length)) *
            100
          : 0;

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
      const recomendacoesPorMes = [];
      
      // Dados para calcular a evolução do valor investido por mês
      const valorInvestidoPorMes = [];

      for (let i = 5; i >= 0; i--) {
        const dataReferencia = new Date();
        dataReferencia.setMonth(dataReferencia.getMonth() - i);
        const mes = dataReferencia.getMonth();
        const ano = dataReferencia.getFullYear();

        const recomendacoesFiltradas = todasRecomendacoes.filter((rec) => {
          const dataRec = new Date(rec.data);
          return dataRec.getMonth() === mes && dataRec.getFullYear() === ano;
        });

        const contagem = recomendacoesFiltradas.length;
        
        // Calcular o valor investido neste mês
        const valorInvestido = recomendacoesFiltradas.reduce(
          (total, rec) => total + (rec.valorInvestimento || 0),
          0
        );

        recomendacoesPorMes.push({
          month: meses[mes],
          count: contagem,
        });
        
        valorInvestidoPorMes.push({
          month: meses[mes],
          value: valorInvestido
        });
      }

      setStats({
        totalRecomendacoes,
        estrategiasAtivas: estrategiasUnicas.size,
        crescimentoMensal: parseFloat(crescimentoMensal.toFixed(1)),
        valorTotalInvestido,
        valorMedioPorRecomendacao,
        perfilDistribution,
        estrategiaDistribution,
        recomendacoesPorMes,
        valorInvestidoPorMes,
        recentRecommendations: [],
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      // Em caso de erro, mantém os valores padrão
      setStats({
        totalRecomendacoes: 0,
        estrategiasAtivas: 0,
        crescimentoMensal: 0,
        valorTotalInvestido: 0,
        valorMedioPorRecomendacao: 0,
        perfilDistribution: [],
        estrategiaDistribution: [],
        recomendacoesPorMes: [],
        valorInvestidoPorMes: [],
        recentRecommendations: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cores para os gráficos
  const PERFIL_COLORS = ["#4f46e5", "#10b981", "#f97316"];
  const ESTRATEGIA_COLORS = [
    "#4f46e5", // Indigo
    "#3b82f6", // Blue
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#84cc16", // Lime
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
  ];

  // Dados para o gráfico de área (agora usando dados reais)
  const areaChartData = stats.valorInvestidoPorMes && stats.valorInvestidoPorMes.length > 0
    ? stats.valorInvestidoPorMes
    : [
        { month: "Jan", value: 0 },
        { month: "Fev", value: 0 },
        { month: "Mar", value: 0 },
        { month: "Abr", value: 0 },
        { month: "Mai", value: 0 },
        { month: "Jun", value: 0 },
      ];

  // Animação para os cards e elementos
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  // Função para formatar moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Função para formatar percentual
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <AnimatedContainer
      animation="fadeIn"
      className="flex flex-col gap-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
    >
      {/* Welcome Header with Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2"
      >
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Bem-vindo, {userName}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Aqui está uma visão geral da sua ferramenta de alocação de portfólio
            de investimentos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarEstatisticas}
            disabled={isLoading}
            className="flex items-center gap-1 h-9 transition-all duration-300 hover:scale-105"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-9 transition-all duration-300 hover:scale-105 hover:shadow-md"
            onClick={() => navigate("/recommendation/new")}
          >
            <Sparkles className="h-4 w-4" />
            Nova Recomendação
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4"
      >
        <motion.div
          variants={itemVariants}
          className="col-span-1"
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="bg-white dark:bg-gray-800 overflow-hidden border border-blue-100 dark:border-blue-900/30 h-full shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full z-0"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total de Recomendações
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats.totalRecomendacoes}
              </motion.div>
              <div className="flex items-center mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recomendações geradas
                </p>
                {stats.crescimentoMensal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="ml-2 flex items-center text-xs text-green-600 dark:text-green-400"
                  >
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    {formatPercentage(stats.crescimentoMensal)}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-1"
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="bg-white dark:bg-gray-800 overflow-hidden border border-emerald-100 dark:border-emerald-900/30 h-full shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full z-0"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Estratégias Ativas
              </CardTitle>
              <div className="p-2 bg-emerald-50 rounded-lg dark:bg-emerald-900/30">
                <PieChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
              >
                {stats.estrategiasAtivas}
              </motion.div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Estratégias de alocação em uso
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-1"
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="bg-white dark:bg-gray-800 overflow-hidden border border-indigo-100 dark:border-indigo-900/30 h-full shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full z-0"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor Total Investido
              </CardTitle>
              <div className="p-2 bg-indigo-50 rounded-lg dark:bg-indigo-900/30">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
              >
                {formatCurrency(stats.valorTotalInvestido)}
              </motion.div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Soma de todas as recomendações
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="col-span-1"
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="bg-white dark:bg-gray-800 overflow-hidden border border-amber-100 dark:border-amber-900/30 h-full shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-amber-50 dark:bg-amber-900/20 rounded-bl-full z-0"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor Médio por Recomendação
              </CardTitle>
              <div className="p-2 bg-amber-50 rounded-lg dark:bg-amber-900/30">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
              >
                {formatCurrency(stats.valorMedioPorRecomendacao)}
              </motion.div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Média por recomendação
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Client Stats Section - Condicionalmente exibido */}
      {customSettings.showClientStats && (
        <AnimatedSection animation="slideUp" delay={0.3} className="mt-6">
          <ClientRecommendationStats />
        </AnimatedSection>
      )}

      {/* Quick Actions Section - Condicionalmente exibido */}
      {customSettings.showQuickActions && (
        <AnimatedSection animation="slideUp" delay={0.4} className="mt-6 mb-6">
          <QuickActions
            actions={[
              {
                title: "Criar Nova Recomendação",
                description:
                  "Iniciar uma nova recomendação de alocação de investimentos",
                icon: (
                  <PieChart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                ),
                to: "/recommendation/new",
                buttonText: "Criar Nova",
                variant: "default",
              },
              {
                title: "Ver Histórico",
                description: "Acessar recomendações geradas anteriormente",
                icon: (
                  <History className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                ),
                to: "/history",
                buttonText: "Ver Histórico",
                variant: "default",
              },
              {
                title: "Gerar Relatório",
                description:
                  "Criar um relatório PDF personalizado a partir dos dados existentes",
                icon: (
                  <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                ),
                to: "/report/new",
                buttonText: "Gerar",
                variant: "default",
              },
              {
                title: "Gestão de Clientes",
                description: "Cadastrar e gerenciar clientes do escritório",
                icon: (
                  <Users className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                ),
                to: "/clients",
                buttonText: "Gerenciar",
                variant: "default",
              },
            ]}
          />
        </AnimatedSection>
      )}

      {/* Client Analytics - Condicionalmente exibido */}
      {customSettings.showClientStats && (
        <AnimatedSection animation="slideUp" delay={0.4} className="mb-6">
          <ClientAnalytics />
        </AnimatedSection>
      )}

      {/* Recent Recommendations Table - Condicionalmente exibido */}
      {customSettings.showRecentRecommendations && (
        <AnimatedSection animation="slideUp" delay={0.5}>
          <RecentRecommendations recommendations={stats.recentRecommendations || []} />
        </AnimatedSection>
      )}
      
      {/* Tabs Content */}
      {customSettings.showPerformanceMetrics && (
        <AnimatedSection animation="fadeIn" delay={0.5} className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <TabsTrigger
                  value="overview"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Performance
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview" className="mt-0 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="overview-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-6 md:grid-cols-2"
                >
                  {/* Distribuição por Perfil de Risco */}
                  <ChartContainer
                    title="Distribuição por Perfil de Risco"
                    description="Proporção de recomendações por perfil de investidor"
                    onRefresh={carregarEstatisticas}
                    isLoading={isLoading}
                    expandable={false}
                  >
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={
                              stats.perfilDistribution.length > 0
                                ? stats.perfilDistribution
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
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                            animationBegin={200}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {(stats.perfilDistribution.length > 0
                              ? stats.perfilDistribution
                              : [
                                  { name: "Conservador", value: 1 },
                                  { name: "Moderado", value: 1 },
                                  { name: "Agressivo", value: 1 },
                                ]
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PERFIL_COLORS[index % PERFIL_COLORS.length]}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
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
                          <Legend verticalAlign="bottom" height={36} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartContainer>

                  {/* Estratégias Mais Utilizadas */}
                  <ChartContainer
                    title="Estratégias Mais Utilizadas"
                    description="Distribuição de recomendações por estratégia de investimento"
                    onRefresh={carregarEstatisticas}
                    isLoading={isLoading}
                    expandable={false}
                  >
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={
                              stats.estrategiaDistribution.length > 0
                                ? stats.estrategiaDistribution.slice(0, 8)
                                : [
                                    { name: "Renda Fixa", value: 1 },
                                    { name: "Ações", value: 1 },
                                    { name: "Fundos Imobiliários", value: 1 },
                                    { name: "Multimercado", value: 1 },
                                  ]
                            }
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                            animationBegin={300}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {(stats.estrategiaDistribution.length > 0
                              ? stats.estrategiaDistribution.slice(0, 8)
                              : [
                                  { name: "Renda Fixa", value: 1 },
                                  { name: "Ações", value: 1 },
                                  { name: "Fundos Imobiliários", value: 1 },
                                  { name: "Multimercado", value: 1 },
                                ]
                            ).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  ESTRATEGIA_COLORS[
                                    index % ESTRATEGIA_COLORS.length
                                  ]
                                }
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
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
                          <Legend verticalAlign="bottom" height={36} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartContainer>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
            <TabsContent value="performance" className="mt-0 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key="performance-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-6 md:grid-cols-1"
                >
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-gray-600 dark:text-gray-300">
                      Os dados de evolução de investimentos foram movidos para a página de Análise.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate("/analysis")}
                    >
                      Ver na Análise
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </AnimatedSection>
      )}
    </AnimatedContainer>
  );
};

export default DashboardContent;
