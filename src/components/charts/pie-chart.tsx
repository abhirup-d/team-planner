"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#fb923c", "#a78bfa",
  "#94a3b8",
];

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  innerRadius?: number;
}

export function PieChartComponent({ data, height = 350, innerRadius = 60 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
          label={// eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((props: any) => {
            const percent = props.percent ?? 0;
            const name = props.name ?? "";
            return percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : "";
          }) as any}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
          formatter={(value) => [`${(value as number).toFixed(1)} hrs`]}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
