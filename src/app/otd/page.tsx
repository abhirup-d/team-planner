"use client";

import { useMemo, useState } from "react";
import { useData } from "@/hooks/use-data";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CORE_TEAM } from "@/lib/constants";
import { parseDate } from "@/lib/date-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Task } from "@/lib/types";
import { Clock, CheckCircle, AlertTriangle, Timer } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonthKeyFromDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = parseDate(dateStr);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function shortMonthLabel(monthKey: string): string {
  const [, month] = monthKey.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[parseInt(month) - 1];
}

const TERMINAL_STATUSES = new Set(["Completed"]);
const OVERDUE_ELIGIBLE_STATUSES = new Set([
  "In process",
  "Under Review (Internal)",
  "Revision Required (Internal)",
  "Under Review (Client)",
  "Revision Required (Client)",
  "Pending Client Input",
  "Yet to start",
  "Backlog",
]);

function isOnTime(task: Task): boolean {
  if (!task.completionDate || !task.dueDate) return false;
  const comp = parseDate(task.completionDate);
  const due = parseDate(task.dueDate);
  if (!comp || !due) return false;
  const dueplus1 = new Date(due.getTime() + 86400000);
  return comp <= dueplus1;
}

function isLateCompleted(task: Task): boolean {
  if (!task.completionDate || !task.dueDate) return false;
  const comp = parseDate(task.completionDate);
  const due = parseDate(task.dueDate);
  if (!comp || !due) return false;
  const dueplus1 = new Date(due.getTime() + 86400000);
  return comp > dueplus1;
}

function isOverdueOpen(task: Task): boolean {
  if (TERMINAL_STATUSES.has(task.status)) return false;
  if (!task.dueDate) return false;
  if (!OVERDUE_ELIGIBLE_STATUSES.has(task.status)) return false;
  const due = parseDate(task.dueDate);
  if (!due) return false;
  return new Date() > new Date(due.getTime() + 86400000);
}

interface OtdStats {
  onTime: number;
  late: number;
  overdueOpen: number;
  total: number;
  rate: number | null;
  avgDelay: number | null;
}

function computeOtd(tasks: Task[]): OtdStats {
  let onTime = 0;
  let late = 0;
  let overdueOpen = 0;
  let totalDelayDays = 0;
  let delayCount = 0;

  for (const t of tasks) {
    if (isOnTime(t)) {
      onTime++;
    } else if (isLateCompleted(t)) {
      late++;
      const comp = parseDate(t.completionDate)!;
      const due = parseDate(t.dueDate)!;
      const days = Math.round((comp.getTime() - due.getTime()) / 86400000);
      totalDelayDays += days;
      delayCount++;
    } else if (isOverdueOpen(t)) {
      overdueOpen++;
      const due = parseDate(t.dueDate)!;
      const days = Math.round((new Date().getTime() - due.getTime()) / 86400000);
      totalDelayDays += days;
      delayCount++;
    }
  }

  const denominator = onTime + late + overdueOpen;
  return {
    onTime,
    late: late + overdueOpen,
    overdueOpen,
    total: denominator,
    rate: denominator > 0 ? (onTime / denominator) * 100 : null,
    avgDelay: delayCount > 0 ? totalDelayDays / delayCount : null,
  };
}

// ── Color helpers ────────────────────────────────────────────────────────────

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600 dark:text-green-400";
  if (rate >= 70) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function barFill(rate: number, isCurrent: boolean): string {
  if (isCurrent) return "#6366f1";
  if (rate >= 80) return "#22c55e";
  if (rate >= 70) return "#f59e0b";
  return "#ef4444";
}

function progressClass(rate: number): string {
  if (rate >= 80) return "bg-gradient-to-r from-green-400 to-green-500";
  if (rate >= 70) return "bg-gradient-to-r from-yellow-400 to-yellow-500";
  return "bg-gradient-to-r from-red-400 to-red-500";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OtdPage() {
  const { tasks, isLoading } = useData();
  const [monthFilter, setMonthFilter] = useState("all");

  // Get all unique months from due dates
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const t of tasks) {
      const mk = getMonthKeyFromDate(t.dueDate);
      if (mk) months.add(mk);
    }
    return [...months].sort().reverse();
  }, [tasks]);

  // Filter tasks by selected month (based on due date)
  const filteredTasks = useMemo(() => {
    if (monthFilter === "all") return tasks;
    return tasks.filter((t) => getMonthKeyFromDate(t.dueDate) === monthFilter);
  }, [tasks, monthFilter]);

  // Overall KPIs
  const stats = useMemo(() => computeOtd(filteredTasks), [filteredTasks]);

  // Previous month comparison
  const prevMonthDelta = useMemo(() => {
    if (monthFilter === "all" || availableMonths.length < 2) return null;
    const idx = availableMonths.indexOf(monthFilter);
    if (idx < 0 || idx >= availableMonths.length - 1) return null;
    const prevKey = availableMonths[idx + 1];
    const prevTasks = tasks.filter((t) => getMonthKeyFromDate(t.dueDate) === prevKey);
    const prevStats = computeOtd(prevTasks);
    if (stats.rate === null || prevStats.rate === null) return null;
    return stats.rate - prevStats.rate;
  }, [tasks, monthFilter, availableMonths, stats.rate]);

  // Monthly trend data (last 6 months with data, excluding future months)
  const trendData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthMap = new Map<string, Task[]>();
    for (const t of tasks) {
      const mk = getMonthKeyFromDate(t.dueDate);
      if (!mk || mk > currentMonthKey) continue;
      if (!monthMap.has(mk)) monthMap.set(mk, []);
      monthMap.get(mk)!.push(t);
    }
    const sortedMonths = [...monthMap.keys()].sort().slice(-6);
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    return sortedMonths.map((mk) => {
      const s = computeOtd(monthMap.get(mk)!);
      return {
        month: shortMonthLabel(mk),
        monthKey: mk,
        rate: s.rate !== null ? Math.round(s.rate * 10) / 10 : 0,
        isCurrent: mk === lastMonth,
      };
    });
  }, [tasks]);

  // By person breakdown
  const personData = useMemo(() => {
    const personMap = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      const person = t.assigneeDisplay || "Unassigned";
      if (!personMap.has(person)) personMap.set(person, []);
      personMap.get(person)!.push(t);
    }
    return [...personMap.entries()]
      .map(([person, ptasks]) => ({ person, ...computeOtd(ptasks) }))
      .filter((p) => p.total > 0)
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  }, [filteredTasks]);

  // By client breakdown — every client with at least one task (completed or pending)
  const clientData = useMemo(() => {
    const clientMap = new Map<string, Task[]>();
    for (const t of filteredTasks) {
      const client = t.customer || "Unknown";
      if (!clientMap.has(client)) clientMap.set(client, []);
      clientMap.get(client)!.push(t);
    }
    return [...clientMap.entries()]
      .map(([client, ctasks]) => {
        const s = computeOtd(ctasks);
        const pending = ctasks.filter(
          (t) => !TERMINAL_STATUSES.has(t.status) && !isOverdueOpen(t)
        ).length;
        return { client, ...s, pending };
      })
      .filter((c) => c.total > 0 || c.pending > 0)
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  const monthLabel = monthFilter === "all" ? "All Months" : formatMonthLabel(monthFilter);

  return (
    <div>
      <Header
        title="On-time Delivery Rate"
        description="Tasks grouped by due date month"
      />

      {/* Month Filter */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Month</span>
          <Select
            value={monthFilter}
            onValueChange={(v) => { if (v) setMonthFilter(v); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((mk) => (
                <SelectItem key={mk} value={mk}>
                  {formatMonthLabel(mk)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            Filters by due date month &mdash; KPIs, person &amp; client tables all update
          </span>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-5 border-indigo-200/50 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">OTD Rate</p>
              <p className="text-[28px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.rate !== null ? `${stats.rate.toFixed(1)}%` : "-"}
              </p>
              {prevMonthDelta !== null && (
                <p className={`text-xs mt-1 ${prevMonthDelta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {prevMonthDelta >= 0 ? "+" : ""}{prevMonthDelta.toFixed(1)}% vs prev month
                </p>
              )}
              {prevMonthDelta === null && (
                <p className="text-xs text-muted-foreground mt-1">Select a month to compare</p>
              )}
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-5 border-green-200/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">On-time</p>
              <p className="text-[28px] font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.onTime}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tasks delivered on time</p>
            </div>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-5 border-red-200/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Late / Overdue</p>
              <p className="text-[28px] font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.late}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Completed late + Overdue open</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-5 border-yellow-200/50 dark:border-yellow-800/30 bg-yellow-50/50 dark:bg-yellow-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Avg Delay</p>
              <p className="text-[28px] font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {stats.avgDelay !== null ? `${stats.avgDelay.toFixed(1)}d` : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg days late (late tasks only)</p>
            </div>
            <Timer className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Tabs: Monthly Trend | By Person | By Client */}
      <Tabs defaultValue="trend">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="trend">Monthly Trend</TabsTrigger>
          <TabsTrigger value="person">By Person</TabsTrigger>
          <TabsTrigger value="client">By Client</TabsTrigger>
        </TabsList>

        {/* Monthly Trend */}
        <TabsContent value="trend">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Monthly OTD Rate</h3>
              <span className="text-xs text-muted-foreground">Auto-updates as new months begin</span>
            </div>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "OTD Rate"]}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {trendData.map((entry, i) => (
                      <Cell key={i} fill={barFill(entry.rate, entry.isCurrent)} fillOpacity={entry.isCurrent ? 0.85 : 0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
            )}
          </Card>
        </TabsContent>

        {/* By Person */}
        <TabsContent value="person">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">OTD by Team Member</h3>
              <Badge variant="secondary" className="text-xs">{monthLabel}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-[13px]">Person</th>
                    <th className="text-center p-3 font-medium text-[13px]">On-time</th>
                    <th className="text-center p-3 font-medium text-[13px]">Late</th>
                    <th className="text-center p-3 font-medium text-[13px]">Total</th>
                    <th className="text-right p-3 font-medium text-[13px]">OTD Rate</th>
                    <th className="p-3 w-[200px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {personData.map((p) => (
                    <tr key={p.person} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{p.person}</td>
                      <td className="p-3 text-center text-green-600 dark:text-green-400">{p.onTime}</td>
                      <td className="p-3 text-center text-red-600 dark:text-red-400">{p.late}</td>
                      <td className="p-3 text-center text-muted-foreground">{p.total}</td>
                      <td className={`p-3 text-right font-semibold ${p.rate !== null ? rateColor(p.rate) : "text-muted-foreground"}`}>
                        {p.rate !== null ? `${p.rate.toFixed(1)}%` : "-"}
                      </td>
                      <td className="p-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          {p.rate !== null && (
                            <div
                              className={`h-full rounded-full ${progressClass(p.rate)}`}
                              style={{ width: `${p.rate}%` }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {personData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No data for selected month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* By Client */}
        <TabsContent value="client">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">OTD by Client</h3>
              <Badge variant="secondary" className="text-xs">{monthLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Shows every client with at least one task (completed or pending) in the selected month
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-[13px]">Client</th>
                    <th className="text-center p-3 font-medium text-[13px]">On-time</th>
                    <th className="text-center p-3 font-medium text-[13px]">Late</th>
                    <th className="text-center p-3 font-medium text-[13px]">Pending</th>
                    <th className="text-center p-3 font-medium text-[13px]">Total</th>
                    <th className="text-right p-3 font-medium text-[13px]">OTD Rate</th>
                    <th className="p-3 w-[180px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.map((c) => (
                    <tr key={c.client} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{c.client}</td>
                      <td className="p-3 text-center text-green-600 dark:text-green-400">{c.onTime}</td>
                      <td className="p-3 text-center text-red-600 dark:text-red-400">{c.late}</td>
                      <td className="p-3 text-center text-muted-foreground">{c.pending}</td>
                      <td className="p-3 text-center text-muted-foreground">{c.total + c.pending}</td>
                      <td className={`p-3 text-right font-semibold ${c.rate !== null ? rateColor(c.rate) : "text-muted-foreground"}`}>
                        {c.rate !== null ? `${c.rate.toFixed(1)}%` : "-"}
                      </td>
                      <td className="p-3">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          {c.rate !== null && (
                            <div
                              className={`h-full rounded-full ${progressClass(c.rate)}`}
                              style={{ width: `${c.rate}%` }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clientData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No data for selected month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
