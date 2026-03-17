"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/hooks/use-data";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChartComponent } from "@/components/charts/pie-chart";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLORS } from "@/lib/constants";
import { aggregateByClient } from "@/lib/data-aggregator";
import { sortWeekKeys, getWeekMonday } from "@/lib/date-utils";
import { DateRangePicker } from "@/components/date-range-picker";

export default function ClientsPage() {
  const { tasks, isLoading } = useData();
  const [weekRange, setWeekRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortCol, setSortCol] = useState<"totalHours" | "taskCount" | "billableHours">("totalHours");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const allWeekKeys = useMemo(() => {
    return sortWeekKeys([...new Set(tasks.filter((t) => t.weekKey).map((t) => t.weekKey!))]);
  }, [tasks]);

  const syncDateRange = (value: string) => {
    if (value === "month") {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(firstOfMonth);
      setEndDate(now.toISOString().split("T")[0]);
      return;
    }
    if (value === "all") {
      if (allWeekKeys.length === 0) return;
      const firstMonday = getWeekMonday(allWeekKeys[0]);
      const lastMonday = getWeekMonday(allWeekKeys[allWeekKeys.length - 1]);
      const lastFriday = new Date(lastMonday.getTime());
      lastFriday.setUTCDate(lastMonday.getUTCDate() + 4);
      setStartDate(firstMonday.toISOString().split("T")[0]);
      setEndDate(lastFriday.toISOString().split("T")[0]);
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

  const filteredTasks = useMemo(() => {
    if (startDate || endDate) {
      return tasks.filter((t) => {
        const d = t.effectiveDate || "";
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    if (weekRange === "all") return tasks;
    const n = parseInt(weekRange);
    const recentWeeks = new Set(allWeekKeys.slice(-n));
    return tasks.filter((t) => t.weekKey && recentWeeks.has(t.weekKey));
  }, [tasks, weekRange, startDate, endDate, allWeekKeys]);

  const clientData = useMemo(() => aggregateByClient(filteredTasks), [filteredTasks]);

  const pieData = useMemo(() => {
    const top10 = clientData.slice(0, 10);
    const otherHours = clientData.slice(10).reduce((s, c) => s + c.totalHours, 0);
    const result = top10.map((c) => ({ name: c.customer, value: c.totalHours }));
    if (otherHours > 0) result.push({ name: "Other", value: otherHours });
    return result;
  }, [clientData]);

  const barData = useMemo(() => {
    return clientData.slice(0, 15).map((c) => ({
      customer: c.customer.length > 12 ? c.customer.slice(0, 12) + "..." : c.customer,
      billable: c.billableHours,
      internal: c.internalHours,
    }));
  }, [clientData]);

  const sorted = useMemo(() => {
    return [...clientData].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [clientData, sortCol, sortDir]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading data...</div></div>;
  }

  const totalBillable = clientData.reduce((s, c) => s + c.billableHours, 0);
  const totalInternal = clientData.reduce((s, c) => s + c.internalHours, 0);
  const totalHours = totalBillable + totalInternal;

  return (
    <div>
      <Header title="Client Dashboard" description={`${clientData.length} clients tracked`} />

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
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={(v) => setStartDate(v)}
          onEndChange={(v) => setEndDate(v)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Client Hours</p>
          <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Billable Hours</p>
          <p className="text-2xl font-bold text-blue-500">{totalBillable.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">{totalHours > 0 ? ((totalBillable / totalHours) * 100).toFixed(1) : 0}% of total</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Internal Hours</p>
          <p className="text-2xl font-bold text-slate-500">{totalInternal.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">{totalHours > 0 ? ((totalInternal / totalHours) * 100).toFixed(1) : 0}% of total</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Hours by Client (Top 10)</h2>
          <PieChartComponent data={pieData} />
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Billable vs Internal by Client (Top 15)</h2>
          <StackedBarChart
            data={barData}
            xKey="customer"
            bars={[
              { key: "billable", name: "Billable", color: COLORS.billable },
              { key: "internal", name: "Internal", color: COLORS.internal },
            ]}
          />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-medium">All Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-right p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("totalHours")}>
                  Total Hours {sortCol === "totalHours" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("billableHours")}>
                  Billable {sortCol === "billableHours" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right p-3 font-medium">Internal</th>
                <th className="text-right p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("taskCount")}>
                  Tasks {sortCol === "taskCount" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right p-3 font-medium">Avg Hrs/Task</th>
                <th className="text-left p-3 font-medium">Primary Owner</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.customer} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.customer}</td>
                  <td className="p-3 text-right">{c.totalHours.toFixed(1)}</td>
                  <td className="p-3 text-right text-blue-600">{c.billableHours.toFixed(1)}</td>
                  <td className="p-3 text-right text-slate-500">{c.internalHours.toFixed(1)}</td>
                  <td className="p-3 text-right">{c.taskCount}</td>
                  <td className="p-3 text-right">{c.taskCount > 0 ? (c.totalHours / c.taskCount).toFixed(1) : "-"}</td>
                  <td className="p-3"><Badge variant="outline">{c.primaryAssignee}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
