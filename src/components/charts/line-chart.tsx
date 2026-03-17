"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color: string }[];
  height?: number;
  yDomain?: [number, number];
  yFormatter?: (v: number) => string;
}

export function LineChartComponent({
  data,
  xKey,
  lines,
  height = 350,
  yDomain,
  yFormatter,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          domain={yDomain}
          tickFormatter={yFormatter}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
          formatter={(value) => [yFormatter ? yFormatter(value as number) : value]}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
