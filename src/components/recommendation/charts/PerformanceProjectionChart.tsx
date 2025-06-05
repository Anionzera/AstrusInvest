import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, ComposedChart,
  ReferenceLine
} from 'recharts';

interface DataPoint {
  period: string; // Exemplo: "1M", "6M", "1A", "2A", "5A"
  expectedReturn: number;
  pessimisticReturn?: number;
  optimisticReturn?: number;
  benchmark?: number;
  cdi?: number;
}

interface PerformanceProjectionChartProps {
  data: DataPoint[];
  title?: string;
  showRange?: boolean;
  currency?: boolean;
  showBenchmark?: boolean;
  initialInvestment?: number;
}

export const PerformanceProjectionChart: React.FC<PerformanceProjectionChartProps> = ({
  data,
  title,
  showRange = true,
  currency = false,
  showBenchmark = true,
  initialInvestment
}) => {
  // Verificar se temos dados válidos
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Não há dados de projeção disponíveis</p>
      </div>
    );
  }

  // Manipular e formatar os dados para o gráfico
  const chartData = data.map(point => {
    // Se for moeda e tiver investimento inicial, calcular valores absolutos
    if (currency && initialInvestment !== undefined) {
      const factor = (percentage: number) => 1 + (percentage / 100);
      return {
        period: point.period,
        expectedReturn: initialInvestment * factor(point.expectedReturn),
        pessimisticReturn: point.pessimisticReturn !== undefined 
          ? initialInvestment * factor(point.pessimisticReturn) 
          : undefined,
        optimisticReturn: point.optimisticReturn !== undefined 
          ? initialInvestment * factor(point.optimisticReturn) 
          : undefined,
        benchmark: point.benchmark !== undefined 
          ? initialInvestment * factor(point.benchmark) 
          : undefined,
        cdi: point.cdi !== undefined 
          ? initialInvestment * factor(point.cdi) 
          : undefined
      };
    }
    return point;
  });

  // Formatador para os valores do eixo Y e tooltip
  const formatYValue = (value: number) => {
    if (currency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else {
      return `${value.toFixed(2)}%`;
    }
  };

  // Custom tooltip renderer
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-md">
          <p className="text-sm font-medium">{`Período: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p 
              key={`item-${index}`} 
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {formatYValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="h-full w-full">
      {title && <h3 className="text-center text-sm font-medium mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        {showRange && (data.some(point => point.pessimisticReturn !== undefined || point.optimisticReturn !== undefined)) ? (
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis 
              tickFormatter={formatYValue}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            
            {data.some(point => point.pessimisticReturn !== undefined && point.optimisticReturn !== undefined) && (
              <Area 
                type="monotone" 
                dataKey="pessimisticReturn" 
                name="Cenário Pessimista" 
                fill="#FFECEC" 
                stroke="#FF8694"
                fillOpacity={0.3}
              />
            )}
            
            {data.some(point => point.optimisticReturn !== undefined) && (
              <Area 
                type="monotone" 
                dataKey="optimisticReturn" 
                name="Cenário Otimista" 
                fill="#E6F4FF" 
                stroke="#0088FE"
                fillOpacity={0.3}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="expectedReturn"
              name="Retorno Esperado"
              stroke="#00C49F"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {showBenchmark && data.some(point => point.benchmark !== undefined) && (
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Benchmark"
                stroke="#FFBB28"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            )}
            
            {data.some(point => point.cdi !== undefined) && (
              <Line
                type="monotone"
                dataKey="cdi"
                name="CDI"
                stroke="#FF8042"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 3 }}
              />
            )}
            
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          </ComposedChart>
        ) : (
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis 
              tickFormatter={formatYValue}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            
            <Line
              type="monotone"
              dataKey="expectedReturn"
              name="Retorno Esperado"
              stroke="#00C49F"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {showBenchmark && data.some(point => point.benchmark !== undefined) && (
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Benchmark"
                stroke="#FFBB28"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            )}
            
            {data.some(point => point.cdi !== undefined) && (
              <Line
                type="monotone"
                dataKey="cdi"
                name="CDI"
                stroke="#FF8042"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 3 }}
              />
            )}
            
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}; 