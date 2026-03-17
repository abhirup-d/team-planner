"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useData } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { LineChartComponent } from "@/components/charts/line-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aggregateByPersonWeek, aggregateByWeek } from "@/lib/data-aggregator";
import { getMonthKey, getMonthLabel, getWeekMonday, sortWeekKeys } from "@/lib/date-utils";
import { CORE_TEAM, COLORS, PERSON_COLORS } from "@/lib/constants";
import { DateRangePicker } from "@/components/date-range-picker";

export default function WeeklyPage() {
  const { tasks, isLoading } = useData();
  const { settings } = useSettings();
  const [weekRange, setWeekRange] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const weeklyPerson = useMemo(() => aggregateByPersonWeek(tasks, settings), [tasks, settings]);
  const weeklyTeam = useMemo(() => aggregateByWeek(tasks, settings), [tasks, settings]);

  const allWeekKeys = useMemo(() => {
    return sortWeekKeys(weeklyTeam.map((w) => w.weekKey));
  }, [weeklyTeam]);

  const displayWeeks = useMemo(() => {
    if (startDate || endDate) {
      return weeklyTeam.filter((w) => {
        const monday = getWeekMonday(w.weekKey);
        const dateStr = monday.toISOString().split("T")[0];
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      });
    }
    const n = parseInt(weekRange);
    return weeklyTeam.slice(-n);
  }, [weeklyTeam, weekRange, startDate, endDate]);

  const syncDateRange = (value: string) => {
    if (value === "month") {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(firstOfMonth);
      setEndDate(now.toISOString().split("T")[0]);
      return;
    }
    const n = parseInt(value);
    if (isNaN(n) || allWeekKeys.length === 0) return;
    const sliced = allWeekKeys.slice(-n);
    const firstMonday = getWeekMonday(sliced[0]);
    const lastMonday = getWeekMonday(sliced[sliced.length - 1]);
    const lastFriday = new Date(lastMonday.getTime());
    lastFriday.setUTCDate(lastMonday.getUTCDate() + 4);
    setStartDate(firstMonday.toISOString().split("T")[0]);
    setEndDate(lastFriday.toISOString().split("T")[0]);
  };

  useEffect(() => {
    if (allWeekKeys.length > 0 && !startDate && !endDate) {
      syncDateRange(weekRange);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWeekKeys]);

  const barData = useMemo(() => {
    return displayWeeks.map((w) => {
      const row: Record<string, unknown> = { weekLabel: w.weekLabel };
      for (const person of [...CORE_TEAM, "Other"]) {
        row[`${person}_billable`] = w.personBreakdown[person]?.billable ?? 0;
        row[`${person}_internal`] = w.personBreakdown[person]?.internal ?? 0;
      }
      row.billable = w.billableHours;
      row.internal = w.internalHours;
      return row;
    });
  }, [displayWeeks]);

  const lineData = useMemo(() => {
    const weekKeys = displayWeeks.map((w) => w.weekKey);
    return weekKeys.map((wk) => {
      const row: Record<string, unknown> = {
        weekLabel: displayWeeks.find((w) => w.weekKey === wk)?.weekLabel || wk,
      };
      for (const person of CORE_TEAM) {
        const pd = weeklyPerson.find((p) => p.weekKey === wk && p.person === person);
        row[person] = pd?.utilisationPct ?? 0;
      }
      return row;
    });
  }, [displayWeeks, weeklyPerson]);

  const tableWeeks = displayWeeks.slice().reverse();

  const groupedByMonth = useMemo(() => {
    const groups: { monthLabel: string; weeks: typeof tableWeeks }[] = [];
    let currentMonth = "";
    for (const w of tableWeeks) {
      const mk = getMonthKey(w.weekKey);
      const ml = getMonthLabel(mk);
      if (ml !== currentMonth) {
        currentMonth = ml;
        groups.push({ monthLabel: ml, weeks: [] });
      }
      groups[groups.length - 1].weeks.push(w);
    }
    return groups;
  }, [tableWeeks]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading data...</div></div>;
  }

  return (
    <div>
      <Header title="Weekly Utilisation" description="Track hours and utilisation trends over time" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select value={weekRange} onValueChange={(v) => { if (v) { setWeekRange(v); syncDateRange(v); } }}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="1">1 week</SelectItem>
            <SelectItem value="8">8 weeks</SelectItem>
            <SelectItem value="12">12 weeks</SelectItem>
            <SelectItem value="26">26 weeks</SelectItem>
            <SelectItem value="52">All</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={(v) => setStartDate(v)}
          onEndChange={(v) => setEndDate(v)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Team Hours (Billable vs Internal)</h2>
          <StackedBarChart
            data={barData}
            xKey="weekLabel"
            bars={[
              { key: "billable", name: "Billable", color: COLORS.billable },
              { key: "internal", name: "Internal", color: COLORS.internal },
            ]}
            referenceLine={{ y: CORE_TEAM.length * settings.defaultCapacity, label: "Capacity" }}
          />
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Utilisation % by Person</h2>
          <LineChartComponent
            data={lineData}
            xKey="weekLabel"
            lines={CORE_TEAM.map((p) => ({
              key: p,
              name: p,
              color: PERSON_COLORS[p],
            }))}
            yDomain={[0, 150]}
            yFormatter={(v) => `${v}%`}
          />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-medium">Weekly Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Week</th>
                {CORE_TEAM.map((p) => (
                  <th key={p} className="text-right p-3 font-medium">{p}</th>
                ))}
                <th className="text-right p-3 font-medium">Team Total</th>
                <th className="text-right p-3 font-medium">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {groupedByMonth.map((group) => (
                <Fragment key={group.monthLabel}>
                  <tr className="bg-muted/40">
                    <td colSpan={CORE_TEAM.length + 3} className="p-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.monthLabel}
                    </td>
                  </tr>
                  {group.weeks.map((w) => (
                    <tr key={w.weekKey} className="border-b hover:bg-muted/30">
                      <td className="p-3 pl-5 font-medium">{w.weekLabel}</td>
                      {CORE_TEAM.map((p) => {
                        const total = w.personBreakdown[p]?.total ?? 0;
                        const pct = settings.defaultCapacity > 0 ? (total / settings.defaultCapacity) * 100 : 0;
                        return (
                          <td key={p} className="p-3 text-right">
                            <span className={pct >= 100 ? "text-red-500 font-medium" : pct >= 75 ? "text-green-600" : ""}>
                              {total > 0 ? total.toFixed(1) : "-"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-3 text-right font-medium">{w.totalHours.toFixed(1)}h</td>
                      <td className="p-3 text-right">
                        <Badge variant={w.avgUtilisation >= 100 ? "destructive" : w.avgUtilisation >= 60 ? "default" : "secondary"}>
                          {w.avgUtilisation.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
