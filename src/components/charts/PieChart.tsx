import React, { useState } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

// Função para garantir que cada fatia do gráfico tenha uma cor distinta
const ensureUniqueColors = (data: PieChartProps['data']) => {
  // Mapeamento padrão de cores distintas para categorias comuns
  const defaultColors: Record<string, string> = {
    "Renda Variável": "#0088FE",          // Azul
    "Fundos Imobiliários": "#FF8042",     // Laranja
    "Fundos Multimercado": "#FFBB28",     // Amarelo
    "Investimentos Internacionais": "#82ca9d", // Verde
    "Criptomoedas": "#8884d8",            // Roxo
    "Renda Fixa": "#00C49F",              // Verde água
    "Commodities": "#D264B6",             // Rosa
    "Liquidez": "#6a5acd",                // Violeta
    "Tesouro Direto": "#4299E1",          // Azul claro
    "Ações": "#38A169",                   // Verde escuro
    "FII": "#ED8936",                     // Laranja escuro
    "Reserva de Emergência": "#D53F8C",   // Rosa escuro
    "Imóveis": "#805AD5",                 // Roxo escuro
    "Private Equity": "#667EEA",          // Indigo
    "Ouro": "#F6E05E",                    // Amarelo
    "Internacional": "#0BC5EA"            // Ciano
  };

  // Cores de fallback para garantir que todos os itens tenham cores distintas
  const fallbackColors = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
    "#8884d8", "#82ca9d", "#ff6b6b", "#6a5acd",
    "#D264B6", "#26C6DA", "#EF6C00", "#283593",
    "#4CAF50", "#FFC107", "#F44336", "#9C27B0"
  ];

  // Copiar o array original para não modificá-lo diretamente
  const processedData = [...data];
  const usedColors = new Set();

  // Garantir que cada item tenha uma cor definida e única
  return processedData.map((item, index) => {
    // Se já tem uma cor definida e não foi usada ainda, manter
    if (item.color && !usedColors.has(item.color)) {
      usedColors.add(item.color);
      return item;
    }

    // Tentar usar cor padrão para a categoria
    if (defaultColors[item.name] && !usedColors.has(defaultColors[item.name])) {
      const newColor = defaultColors[item.name];
      usedColors.add(newColor);
      return { ...item, color: newColor };
    }

    // Procurar correspondência parcial no nome
    for (const [key, color] of Object.entries(defaultColors)) {
      if (item.name.includes(key) && !usedColors.has(color)) {
        usedColors.add(color);
        return { ...item, color };
      }
    }

    // Usar cores de fallback se necessário
    let colorIndex = 0;
    while (colorIndex < fallbackColors.length) {
      const potentialColor = fallbackColors[colorIndex];
      if (!usedColors.has(potentialColor)) {
        usedColors.add(potentialColor);
        return { ...item, color: potentialColor };
      }
      colorIndex++;
    }

    // Se todas as cores já foram usadas, gerar uma cor aleatória
    const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    return { ...item, color: randomColor };
  });
};

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;
  
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <text
        x={cx}
        y={cy}
        dy={0}
        textAnchor="middle"
        fill="#333"
        style={{ fontSize: '14px', fontWeight: 'bold' }}
      >
        {`${payload.name}`}
      </text>
      <text
        x={cx}
        y={cy}
        dy={20}
        textAnchor="middle"
        fill="#666"
        style={{ fontSize: '16px', fontWeight: 'bold' }}
      >
        {`${value}%`}
      </text>
    </g>
  );
};

export const PieChartComponent: React.FC<PieChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Filtrar dados apenas para valores maiores que zero
  const filteredData = data.filter(item => item.value > 0);
  
  // Garantir que cada categoria tenha cores distintas
  const processedData = ensureUniqueColors(filteredData);

  // Remover log que pode afetar a performance
  // console.log("Dados do gráfico de pizza:", processedData);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={processedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          dataKey="value"
          onMouseEnter={onPieEnter}
          labelLine={false}
        >
          {processedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color} 
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => `${value}%`} 
          labelFormatter={(label) => `${label}`}
        />
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right"
          formatter={(value, entry, index) => <span style={{color: processedData[index]?.color}}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}; 