import React from "react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer
} from "recharts";

interface RadarChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export const RadarChartComponent: React.FC<RadarChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid gridType="circle" />
        <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={false} 
          axisLine={false} 
          tickCount={5} 
        />
        <Radar 
          name="Métricas" 
          dataKey="value" 
          stroke="var(--primary)" 
          fill="var(--primary)" 
          fillOpacity={0.5} 
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}; 