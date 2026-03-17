"use client";

import { useData } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { Header } from "@/components/layout/header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import {
  aggregateByWeek,
  aggregateByPersonWeek,
  aggregateByMonth,
  getCurrentWeekKPIs,
} from "@/lib/data-aggregator";
import { COLORS, CORE_TEAM, PERSON_COLORS } from "@/lib/constants";
import { Clock, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

export default function HomePage() {
  const { tasks, lastUpdated, isLoading } = useData();
  const { settings } = useSettings();

  const weeklyTeam = useMemo(() => aggregateByWeek(tasks, settings), [tasks, settings]);
  const weeklyPerson = useMemo(() => aggregateByPersonWeek(tasks, settings), [tasks, settings]);
  const kpis = useMemo(() => getCurrentWeekKPIs(weeklyTeam, weeklyPerson), [weeklyTeam, weeklyPerson]);

  const monthlyData = useMemo(() => aggregateByMonth(tasks), [tasks]);

  const monthlyChartData = useMemo(() => {
    return monthlyData.map((m) => {
      const row: Record<string, unknown> = { monthLabel: m.monthLabel };
      for (const person of [...CORE_TEAM, "Other"]) {
        row[person] = Math.round((m.personBreakdown[person] || 0) * 10) / 10;
      }
      return row;
    });
  }, [monthlyData]);

  const overloadedNow = useMemo(() => {
    const latest = weeklyTeam[weeklyTeam.length - 1];
    return latest?.overloadedMembers ?? [];
  }, [weeklyTeam]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Header
          title="Overview"
          description="Team resource utilisation at a glance"
        />
        {lastUpdated && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Last updated: {new Date(lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
            {new Date(lastUpdated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Total Hours (Latest Week)"
          value={`${kpis.totalHoursThisWeek.toFixed(1)}h`}
          subtitle={`of ${CORE_TEAM.length * settings.defaultCapacity}h capacity`}
          icon={<Clock className="h-5 w-5" />}
          trend={{
            data: kpis.weeklyTrend,
            direction: kpis.weeklyTrend.length >= 2
              ? kpis.weeklyTrend[kpis.weeklyTrend.length - 1].value > kpis.weeklyTrend[kpis.weeklyTrend.length - 2].value
                ? "up"
                : "down"
              : "neutral",
          }}
        />
        <KpiCard
          title="Team Utilisation"
          value={`${kpis.teamUtilisation.toFixed(1)}%`}
          subtitle={kpis.teamUtilisation >= 100 ? "Overloaded" : kpis.teamUtilisation >= 75 ? "Optimal" : "Under capacity"}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{
            data: kpis.utilisationTrend,
            direction: kpis.teamUtilisation >= 75 ? "up" : "down",
          }}
          valueColor={kpis.teamUtilisation >= 100 ? "text-red-500" : kpis.teamUtilisation >= 75 ? "text-green-500" : ""}
        />
        <KpiCard
          title="Billable Ratio"
          value={`${kpis.billableRatio.toFixed(1)}%`}
          subtitle="Billable / Total hours"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{
            data: kpis.billableTrend,
            direction: kpis.billableRatio >= 50 ? "up" : "down",
          }}
        />
        <KpiCard
          title="Overloaded Members"
          value={kpis.overloadedCount}
          subtitle={kpis.overloadedCount === 0 ? "All good" : "Need rebalancing"}
          icon={<AlertTriangle className="h-5 w-5" />}
          valueColor={kpis.overloadedCount > 0 ? "text-red-500" : "text-green-500"}
        />
      </div>

      {overloadedNow.length > 0 && (
        <Card className="p-4 mb-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-sm">Overload Alert</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {overloadedNow.map((m) => (
              <Badge key={m} variant="destructive">{m}</Badge>
            ))}
            <span className="text-sm text-muted-foreground ml-2">exceeded capacity this week</span>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-medium mb-4">Team Hours by Person (Monthly)</h2>
        <StackedBarChart
          data={monthlyChartData}
          xKey="monthLabel"
          bars={[...CORE_TEAM, "Other"].map((p) => ({
            key: p,
            name: p,
            color: PERSON_COLORS[p] || "#94a3b8",
          }))}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-3">Quick Stats</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total tasks</span>
              <span className="font-medium">{tasks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed tasks</span>
              <span className="font-medium">{tasks.filter((t) => t.status === "Completed").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">In progress</span>
              <span className="font-medium">{tasks.filter((t) => t.status === "In process").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Yet to start</span>
              <span className="font-medium">{tasks.filter((t) => t.status === "Yet to start").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weeks tracked</span>
              <span className="font-medium">{weeklyTeam.length}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium mb-3">Team Utilisation (Latest Week)</h2>
          <div className="space-y-2">
            {CORE_TEAM.map((person) => {
              const pw = weeklyPerson.filter((p) => p.person === person);
              const latest = pw[pw.length - 1];
              const pct = latest?.utilisationPct ?? 0;
              return (
                <div key={person} className="flex items-center gap-3">
                  <span className="text-sm w-20">{person}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100
                          ? "bg-red-500"
                          : pct >= 75
                          ? "bg-green-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
