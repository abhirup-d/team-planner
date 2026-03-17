"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface HeatmapCell {
  person: string;
  weekKey: string;
  weekLabel: string;
  hours: number;
  capacity: number;
  utilisationPct: number;
  loadStatus: "under" | "optimal" | "over";
}

interface HeatmapProps {
  data: HeatmapCell[];
  persons: string[];
  weeks: string[];
  weekLabels: Record<string, string>;
}

function getCellColor(loadStatus: string, pct: number): string {
  if (loadStatus === "over") return "bg-red-500/80 text-white";
  if (loadStatus === "optimal") {
    if (pct >= 85) return "bg-yellow-500/70 text-black";
    return "bg-green-500/70 text-white";
  }
  if (pct > 0) return "bg-slate-300/50 dark:bg-slate-600/50";
  return "bg-muted/30";
}

export function Heatmap({ data, persons, weeks, weekLabels }: HeatmapProps) {
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of data) {
    cellMap.set(`${cell.person}|${cell.weekKey}`, cell);
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `120px repeat(${weeks.length}, minmax(56px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="text-xs font-medium text-muted-foreground p-1" />
          {weeks.map((w) => (
            <div key={w} className="text-xs text-center text-muted-foreground p-1 truncate">
              {weekLabels[w] || w}
            </div>
          ))}

          {/* Data rows */}
          {persons.map((person) => (
            <Fragment key={person}>
              <div className="text-sm font-medium p-1 flex items-center">
                {person}
              </div>
              {weeks.map((weekKey) => {
                const cell = cellMap.get(`${person}|${weekKey}`);
                const hours = cell?.hours ?? 0;
                const capacity = cell?.capacity ?? 40;
                const pct = cell?.utilisationPct ?? 0;
                const status = cell?.loadStatus ?? "under";

                return (
                  <Tooltip key={`${person}-${weekKey}`}>
                    <TooltipTrigger
                      className={cn(
                        "rounded text-xs font-medium text-center p-1.5 cursor-default transition-colors flex items-center justify-center min-h-[36px]",
                        getCellColor(status, pct)
                      )}
                    >
                      {hours > 0 ? hours.toFixed(0) : "-"}
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium">{person} - {weekLabels[weekKey]}</p>
                        <p>Hours: {hours.toFixed(1)}</p>
                        <p>Capacity: {capacity}h</p>
                        <p>Utilisation: {pct.toFixed(1)}%</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted/30" />
            <span>No data</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-slate-300/50" />
            <span>Under</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500/70" />
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-yellow-500/70" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500/80" />
            <span>Overloaded</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
