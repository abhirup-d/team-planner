"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { data: { value: number }[]; direction?: "up" | "down" | "neutral" };
  icon?: React.ReactNode;
  className?: string;
  valueColor?: string;
}

function MiniSparkline({ data, color = "currentColor" }: { data: { value: number }[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.value - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ title, value, subtitle, trend, icon, className, valueColor }: KpiCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", valueColor)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          {trend?.data && trend.data.length > 1 && (
            <div className="flex items-center gap-1">
              <MiniSparkline data={trend.data} color={trend.direction === "down" ? "#ef4444" : "#22c55e"} />
              <TrendIcon className={cn("h-3 w-3", trend.direction === "up" ? "text-green-500" : trend.direction === "down" ? "text-red-500" : "text-muted-foreground")} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
