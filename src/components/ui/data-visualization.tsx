import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

interface ChartProps {
  data: DataPoint[];
  type: "pie" | "bar" | "line" | "area";
  height?: number;
  width?: string;
  colors?: string[];
  dataKey?: string;
  nameKey?: string;
  showLegend?: boolean;
  legendPosition?: "top" | "right" | "bottom" | "left";
  className?: string;
}

const DEFAULT_COLORS = [
  "#0088FE", // Azul
  "#00C49F", // Verde
  "#FFBB28", // Amarelo
  "#FF8042", // Laranja
  "#8884d8", // Roxo
  "#82ca9d", // Verde claro
  "#ff6b6b", // Vermelho
  "#6a5acd", // Azul escuro
];

const DataVisualization: React.FC<ChartProps> = ({
  data,
  type,
  height = 300,
  width = "100%",
  colors = DEFAULT_COLORS,
  dataKey = "value",
  nameKey = "name",
  showLegend = true,
  legendPosition = "right",
  className = "",
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          Sem dados disponíveis
        </p>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={height / 3}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}`} />
            {showLegend && (
              <Legend
                layout={
                  legendPosition === "left" || legendPosition === "right"
                    ? "vertical"
                    : "horizontal"
                }
                verticalAlign={
                  legendPosition === "top"
                    ? "top"
                    : legendPosition === "bottom"
                      ? "bottom"
                      : "middle"
                }
                align={
                  legendPosition === "left"
                    ? "left"
                    : legendPosition === "right"
                      ? "right"
                      : "center"
                }
              />
            )}
          </PieChart>
        );

      case "bar":
        return (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis type="category" dataKey={nameKey} width={80} />
            <Tooltip formatter={(value) => `${value}`} />
            {showLegend && <Legend />}
            <Bar
              dataKey={dataKey}
              name="Valor"
              fill="#4f46e5"
              radius={[0, 4, 4, 0]}
              barSize={30}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        );

      case "line":
        return (
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#4f46e5"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <Tooltip />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke="#4f46e5"
              fill="#4f46e5"
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width={width} height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default DataVisualization;
