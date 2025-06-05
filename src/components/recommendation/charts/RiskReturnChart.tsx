import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface RiskReturnDataPoint {
  name: string;
  risk: number;
  return: number;
  current?: boolean;
}

interface RiskReturnChartProps {
  data: RiskReturnDataPoint[];
}

const RiskReturnChart: React.FC<RiskReturnChartProps> = ({ data }) => {
  return (
    <div className="h-72 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="risk"
            name="Risco"
            label={{ value: "Risco (%)", position: "bottom" }}
            domain={[0, 25]}
          />
          <YAxis
            type="number"
            dataKey="return"
            name="Retorno"
            label={{ value: "Retorno (%)", angle: -90, position: "left" }}
            domain={[0, 20]}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            labelFormatter={(index: number) => `${data[index].name}`}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter
            name="Risco/Retorno"
            data={data}
            fill="#8884d8"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.current ? "#f56565" : "#8884d8"}
                stroke={entry.current ? "#e53e3e" : "#7c65d1"}
                strokeWidth={entry.current ? 2 : 1}
                r={entry.current ? 8 : 6}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskReturnChart; 