"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface StackedBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color: string }[];
  height?: number;
  referenceLine?: { y: number; label: string };
}

export function StackedBarChart({
  data,
  xKey,
  bars,
  height = 350,
  referenceLine,
}: StackedBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            border: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.y}
            stroke={COLORS.overload}
            strokeDasharray="5 5"
            label={{ value: referenceLine.label, position: "right", fontSize: 11 }}
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            stackId="stack"
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
