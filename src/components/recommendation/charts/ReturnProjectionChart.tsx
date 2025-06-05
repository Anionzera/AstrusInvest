import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "../../../utils/formatters";

interface ReturnProjection {
  year: number;
  value: number;
}

interface ReturnProjectionChartProps {
  projections: ReturnProjection[];
}

const ReturnProjectionChart: React.FC<ReturnProjectionChartProps> = ({ projections }) => {
  return (
    <div className="h-72 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={projections}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year"
            label={{ value: "Anos", position: "bottom" }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value, { decimals: 0 })}
            label={{ value: "Valor Projetado", angle: -90, position: "left" }}
          />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.3}
            name="Valor Projetado"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ReturnProjectionChart; 