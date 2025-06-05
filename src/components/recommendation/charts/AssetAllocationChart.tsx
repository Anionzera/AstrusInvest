import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';

// Tipagem mínima para asset
interface Asset {
  name: string;
  allocation: number;
  color?: string;
  type?: string;
  category?: string;
  assetClass?: string;
}

interface AssetAllocationChartProps {
  allocation: Asset[];
}

// Cores para as classes de ativos
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28BFC', 
  '#FF6B8B', '#4BC0C0', '#B885FF', '#FF9D54', '#5CBAE6'
];

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({ allocation }) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Garantir que a alocação tem dados válidos
  if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">Não há dados de alocação disponíveis</p>
      </div>
    );
  }

  // Processar dados para o gráfico
  const chartData = allocation.map((asset, index) => ({
    name: asset.name,
    value: asset.allocation,
    color: asset.color || COLORS[index % COLORS.length]
  }));

  // Ordenar por tamanho de alocação (decrescente)
  chartData.sort((a, b) => b.value - a.value);

  // Calcular alocação total
  const totalAllocation = chartData.reduce((sum, asset) => sum + asset.value, 0);

  // Formatador de valores para o Tooltip
  const formatTooltipValue = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Renderizador para o setor ativo (hover)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 13}
          fill={fill}
          opacity={0.3}
        />
      </g>
    );
  };

  // Manipulador para o mouse over no gráfico
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Manipulador para o mouse leave no gráfico
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  // Renderizador personalizado para o Legend
  const renderCustomizedLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center">
            <div
              className="h-3 w-3 rounded-sm mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs">{entry.value} ({formatTooltipValue(chartData[index].value)})</span>
          </div>
        ))}
      </div>
    );
  };

  // Se a alocação não totalizar 100%, adicionar um alerta
  const allocationAlert = totalAllocation !== 100 ? (
    <div className={`text-center text-xs mt-2 ${Math.abs(totalAllocation - 100) > 1 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
      Alocação total: {totalAllocation.toFixed(2)}% {totalAllocation !== 100 ? '(não totaliza 100%)' : ''}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={1}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={formatTooltipValue}
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              backgroundColor: 'var(--background)',
              fontSize: '12px'
            }}
          />
          <Legend 
            content={renderCustomizedLegend}
            verticalAlign="bottom"
            align="center"
          />
        </PieChart>
      </ResponsiveContainer>
      {allocationAlert}
    </div>
  );
}; 