import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, PieChart, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";

const PerformanceMetrics = () => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const [activeChart, setActiveChart] = useState<string>("area");

  useEffect(() => {
    const loadPerformanceData = async () => {
      setIsLoading(true);
      try {
        // Carregar recomendações
        const recommendations = await db.recomendacoes.toArray();

        // Agrupar por mês
        const monthlyStats = processMonthlyData(recommendations);
        setMonthlyData(monthlyStats);
      } catch (error) {
        console.error("Erro ao carregar dados de performance:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar métricas",
          description: "Não foi possível carregar os dados de performance.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformanceData();
  }, [toast]);

  // Processar dados mensais
  const processMonthlyData = (recommendations: any[]) => {
    const months = [
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
    const monthlyStats = [];

    // Definir retornos de benchmark mensais para diferentes tipos de ativos
    // Estes valores são aproximações baseadas em dados históricos reais
    const benchmarkReturns = {
      "Renda Variável": [2.1, 1.5, 2.3, -1.2, 3.5, 1.8],
      "Renda Fixa": [0.8, 0.9, 0.7, 0.8, 0.6, 0.7],
      "Alternativo": [1.5, 1.2, 1.8, 1.3, 1.7, 1.4],
      "Criptomoeda": [5.2, -3.5, 8.1, -2.5, 4.8, 6.2],
      "Caixa": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    };

    const processMonthData = async () => {
      // Carregar todos os ativos de uma vez para evitar consultas repetidas
      const allAssets = await db.ativos.toArray();
      const assetsMap = new Map();
      allAssets.forEach(asset => {
        assetsMap.set(asset.id, asset);
      });

      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthIndex = 5 - i; // Índice para acessar os benchmarks (0-5)

        // Filtrar recomendações do mês
        const monthRecs = recommendations.filter((rec) => {
          const recDate = new Date(rec.data);
          return recDate.getMonth() === month && recDate.getFullYear() === year;
        });

        // Calcular valor total investido no mês
        const totalValue = monthRecs.reduce(
          (sum, rec) => sum + (rec.valorInvestimento || 0),
          0,
        );

        // Calcular retorno baseado em alocações de ativos
        let totalReturn = 0;
        let hasAllocation = false;

        // Processar todas as recomendações do mês
        for (const rec of monthRecs) {
          if (rec.alocacaoSugerida && rec.alocacaoSugerida.length > 0 && rec.valorInvestimento) {
            hasAllocation = true;
            
            // Processar todas as alocações desta recomendação
            for (const alocacao of rec.alocacaoSugerida) {
              const ativo = assetsMap.get(alocacao.ativoId);
              
              if (ativo) {
                const tipoAtivo = ativo.tipo;
                const benchmark = benchmarkReturns[tipoAtivo] ? 
                  benchmarkReturns[tipoAtivo][monthIndex] : 1.0;
                const percentual = alocacao.percentual / 100;
                const valorAlocado = rec.valorInvestimento * percentual;
                const retornoAtivo = valorAlocado * (benchmark / 100);
                
                totalReturn += retornoAtivo;
              }
            }
          }
        }

        // Caso não haja alocações específicas, usar retorno simulado mais realista
        let simulatedReturn = 0;
        if (!hasAllocation) {
          // Calcular um retorno médio ponderado para simular comportamento real
          // Considera-se que recomendações são diversificadas, então usamos um mix de benchmarks
          const averageReturn = 
            (benchmarkReturns["Renda Fixa"][monthIndex] * 0.4) + 
            (benchmarkReturns["Renda Variável"][monthIndex] * 0.3) + 
            (benchmarkReturns["Alternativo"][monthIndex] * 0.2) + 
            (benchmarkReturns["Caixa"][monthIndex] * 0.1);

          simulatedReturn = totalValue * (averageReturn / 100);
        } else {
          simulatedReturn = totalReturn;
        }

        monthlyStats.push({
          month: months[month],
          year: year,
          count: monthRecs.length,
          value: totalValue,
          return: simulatedReturn,
          performance: totalValue > 0 ? (simulatedReturn / totalValue) * 100 : 0,
          fullDate: new Date(year, month, 1)
        });
      }

      // Ordenar por data para garantir a sequência cronológica
      return monthlyStats.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    };

    // Retornar dados padrão enquanto processa
    // Serão atualizados após o processamento assíncrono
    const defaultData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      defaultData.push({
        month: months[date.getMonth()],
        year: date.getFullYear(),
        count: 0,
        value: 0,
        return: 0,
        performance: 0,
        fullDate: date
      });
    }

    // Iniciar o processamento assíncrono
    processMonthData().then(data => {
      setMonthlyData(data);
    }).catch(error => {
      console.error("Erro ao processar dados mensais:", error);
      toast({
        variant: "destructive",
        title: "Erro ao processar dados",
        description: "Não foi possível calcular a performance mensal.",
      });
    });

    return defaultData;
  };

  // Paleta de cores alinhada com o tema
  const getThemeColors = () => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'rgb(59, 130, 246)';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || 'rgb(96, 165, 250)';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || 'rgb(37, 99, 235)';
    
    return { primary, secondary, accent };
  };

  const themeColors = getThemeColors();

  // Função para formatar valores em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatador personalizado para Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card dark:bg-gray-800 border border-border p-3 rounded-lg shadow-md">
          <p className="font-medium text-sm text-foreground">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 my-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }} 
              />
              <p className="text-sm text-muted-foreground">
                {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Customização de eixos
  const renderAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill="currentColor"
          className="text-xs text-muted-foreground"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const formatYAxisTick = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Evolução de Valor Investido */}
      <ChartContainer
        title="Evolução de Investimentos"
        description="Valor investido nos últimos meses"
        isLoading={isLoading}
        chartTypes={["área", "linha", "barras"]}
        defaultChartType="área"
        onChartTypeChange={setActiveChart}
        expandable={true}
        borderRadius="lg"
        shadow="md"
        accentColor={themeColors.primary}
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {(() => {
              if (activeChart === "área") {
                return (
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={themeColors.accent} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={themeColors.accent} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,160,160,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={renderAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatYAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Investido"
                      stroke={themeColors.primary}
                      fillOpacity={1}
                      fill="url(#colorInvest)"
                      animationDuration={1000}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="return"
                      name="Retorno"
                      stroke={themeColors.accent}
                      fillOpacity={1}
                      fill="url(#colorReturn)"
                      animationDuration={1000}
                      strokeWidth={2}
                    />
                  </AreaChart>
                );
              } else if (activeChart === "linha") {
                return (
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,160,160,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={renderAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatYAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Investido"
                      stroke={themeColors.primary}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                      activeDot={{ r: 6, stroke: themeColors.primary, fill: "white", strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="return"
                      name="Retorno"
                      stroke={themeColors.accent}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                      activeDot={{ r: 6, stroke: themeColors.accent, fill: "white", strokeWidth: 2 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                );
              } else {
                return (
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                    barCategoryGap={8}
                    barSize={30}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,160,160,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tick={renderAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatYAxisTick} 
                      axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                    <defs>
                      <linearGradient id="barInvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={themeColors.primary} />
                        <stop offset="100%" stopColor={`${themeColors.primary}99`} />
                      </linearGradient>
                      <linearGradient id="barReturn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={themeColors.accent} />
                        <stop offset="100%" stopColor={`${themeColors.accent}99`} />
                      </linearGradient>
                    </defs>
                    <Bar
                      dataKey="value"
                      name="Investido"
                      fill="url(#barInvest)"
                      stroke={themeColors.primary}
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="return"
                      name="Retorno"
                      fill="url(#barReturn)"
                      stroke={themeColors.accent}
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1000}
                    />
                  </BarChart>
                );
              }
            })()}
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Recomendações e Crescimento Mensal */}
      <ChartContainer
        title="Atividade Mensal"
        description="Recomendações e retorno percentual mensal"
        isLoading={isLoading}
        expandable={true}
        borderRadius="lg"
        shadow="md"
        accentColor={themeColors.secondary}
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,160,160,0.1)" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={renderAxisTick} 
                axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}%`}
                axisLine={{ stroke: 'rgba(160,160,160,0.2)' }}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'currentColor' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={themeColors.secondary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={themeColors.secondary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                name="Recomendações"
                stroke={themeColors.primary}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                activeDot={{ r: 6, stroke: themeColors.primary, fill: "white", strokeWidth: 2 }}
                animationDuration={1500}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="growthPercent"
                name="Crescimento (%)"
                stroke={themeColors.secondary}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                activeDot={{ r: 6, stroke: themeColors.secondary, fill: "white", strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>
    </div>
  );
};

export default PerformanceMetrics;
