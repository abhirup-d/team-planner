"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/hooks/use-data";
import { useSettings } from "@/hooks/use-settings";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heatmap } from "@/components/charts/heatmap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { aggregateByPersonWeek } from "@/lib/data-aggregator";
import { CORE_TEAM, COLORS } from "@/lib/constants";
import { sortWeekKeys, getWeekLabel, getWeekMonday, getISOWeekKey, parseDate } from "@/lib/date-utils";
import { DateRangePicker } from "@/components/date-range-picker";
import { Settings2 } from "lucide-react";

export default function ManagerPage() {
  const { tasks, isLoading } = useData();
  const { settings, setCapacityOverride, removeCapacityOverride } = useSettings();
  const [weekRange, setWeekRange] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overridePerson, setOverridePerson] = useState(CORE_TEAM[0]);
  const [overrideWeek, setOverrideWeek] = useState("");
  const [overrideCapacity, setOverrideCapacity] = useState("0");
  const [overrideNote, setOverrideNote] = useState("");

  const weeklyPerson = useMemo(() => aggregateByPersonWeek(tasks, settings), [tasks, settings]);

  const allWeeks = useMemo(() => {
    const wks = new Set(weeklyPerson.map((p) => p.weekKey));
    return sortWeekKeys(Array.from(wks));
  }, [weeklyPerson]);

  const currentWeekKey = useMemo(() => getISOWeekKey(new Date()), []);

  const syncDateRange = (value: string) => {
    if (value === "month") {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const currentMonday = getWeekMonday(currentWeekKey);
      const currentFriday = new Date(currentMonday.getTime());
      currentFriday.setUTCDate(currentMonday.getUTCDate() + 4);
      setStartDate(firstOfMonth);
      setEndDate(currentFriday.toISOString().split("T")[0]);
      return;
    }
    const n = parseInt(value);
    if (isNaN(n) || allWeeks.length === 0) return;
    const filtered = allWeeks.filter((wk) => wk <= currentWeekKey);
    const sliced = filtered.slice(-n);
    if (sliced.length === 0) return;
    const firstMonday = getWeekMonday(sliced[0]);
    const lastMonday = getWeekMonday(sliced[sliced.length - 1]);
    const lastFriday = new Date(lastMonday.getTime());
    lastFriday.setUTCDate(lastMonday.getUTCDate() + 4);
    setStartDate(firstMonday.toISOString().split("T")[0]);
    setEndDate(lastFriday.toISOString().split("T")[0]);
  };

  useEffect(() => {
    if (allWeeks.length > 0 && !startDate && !endDate) {
      syncDateRange(weekRange);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWeeks]);

  const displayWeeks = useMemo(() => {
    if (startDate || endDate) {
      return allWeeks.filter((wk) => {
        const monday = getWeekMonday(wk);
        const dateStr = monday.toISOString().split("T")[0];
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
        return true;
      });
    }
    if (weekRange === "month") {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return allWeeks.filter((wk) => {
        const monday = getWeekMonday(wk);
        const dateStr = monday.toISOString().split("T")[0];
        return dateStr >= firstOfMonth && wk <= currentWeekKey;
      });
    }
    const n = parseInt(weekRange);
    return allWeeks.filter((wk) => wk <= currentWeekKey).slice(-n);
  }, [allWeeks, weekRange, startDate, endDate, currentWeekKey]);

  const weekLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const w of displayWeeks) m[w] = getWeekLabel(w);
    return m;
  }, [displayWeeks]);

  const persons = [...CORE_TEAM, "Other"];

  const heatmapData = useMemo(() => {
    return weeklyPerson
      .filter((p) => displayWeeks.includes(p.weekKey))
      .map((p) => ({
        person: p.person,
        weekKey: p.weekKey,
        weekLabel: p.weekLabel,
        hours: p.totalHours,
        capacity: p.capacity,
        utilisationPct: p.utilisationPct,
        loadStatus: p.loadStatus,
      }));
  }, [weeklyPerson, displayWeeks]);

  const capacityGapData = useMemo(() => {
    const targetWeek = currentWeekKey;
    if (!targetWeek) return [];
    return persons.map((person) => {
      const pd = weeklyPerson.find((p) => p.weekKey === targetWeek && p.person === person);
      const hours = pd?.totalHours ?? 0;
      const capacity = pd?.capacity ?? settings.defaultCapacity;
      return { person, hours, capacity, gap: capacity - hours };
    });
  }, [weeklyPerson, currentWeekKey, persons, settings]);

  // Hours of tasks added (by created time) within display period
  const tasksAddedData = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const effectiveStart = startDate || "";
    const effectiveEnd = endDate || todayStr;
    const personMap: Record<string, { billable: number; internal: number }> = {};
    for (const person of persons) personMap[person] = { billable: 0, internal: 0 };

    for (const task of tasks) {
      const created = task.createdTime || task.startDate;
      if (!created) continue;
      const createdDate = parseDate(created);
      if (!createdDate) continue;
      const createdStr = createdDate.toISOString().split("T")[0];
      if (effectiveStart && createdStr < effectiveStart) continue;
      if (effectiveEnd && createdStr > effectiveEnd) continue;

      const person = CORE_TEAM.includes(task.assigneeDisplay) ? task.assigneeDisplay : "Other";
      if (task.isBillable) {
        personMap[person].billable += task.tentativeHours;
      } else {
        personMap[person].internal += task.tentativeHours;
      }
    }
    return persons.map((p) => ({
      person: p,
      billable: Math.round(personMap[p].billable * 10) / 10,
      internal: Math.round(personMap[p].internal * 10) / 10,
      total: Math.round((personMap[p].billable + personMap[p].internal) * 10) / 10,
    }));
  }, [tasks, persons, startDate, endDate]);

  // Hours of overdue tasks (backlog): non-completed, due date before today
  const backlogData = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const personMap: Record<string, { billable: number; internal: number }> = {};
    for (const person of persons) personMap[person] = { billable: 0, internal: 0 };

    for (const task of tasks) {
      if (task.status === "Completed") continue;
      const due = parseDate(task.dueDate);
      if (!due) continue;
      const dueStr = due.toISOString().split("T")[0];
      if (dueStr >= todayStr) continue;

      const person = CORE_TEAM.includes(task.assigneeDisplay) ? task.assigneeDisplay : "Other";
      if (task.isBillable) {
        personMap[person].billable += task.tentativeHours;
      } else {
        personMap[person].internal += task.tentativeHours;
      }
    }
    return persons.map((p) => ({
      person: p,
      billable: Math.round(personMap[p].billable * 10) / 10,
      internal: Math.round(personMap[p].internal * 10) / 10,
      total: Math.round((personMap[p].billable + personMap[p].internal) * 10) / 10,
    }));
  }, [tasks, persons]);

  const handleAddOverride = () => {
    if (!overrideWeek) return;
    setCapacityOverride({
      person: overridePerson,
      weekKey: overrideWeek,
      capacity: parseFloat(overrideCapacity) || 0,
      note: overrideNote,
    });
    setOverrideNote("");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading data...</div></div>;
  }

  return (
    <div>
      <Header title="Manager Dashboard" description="Identify overloads and rebalance work" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select value={weekRange} onValueChange={(v) => { if (v) { setWeekRange(v); syncDateRange(v); } }}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="1">1 week</SelectItem>
            <SelectItem value="8">8 weeks</SelectItem>
            <SelectItem value="12">12 weeks</SelectItem>
            <SelectItem value="26">26 weeks</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={(v) => setStartDate(v)}
          onEndChange={(v) => setEndDate(v)}
        />

        <Dialog>
          <DialogTrigger className="ml-auto inline-flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Settings2 className="h-4 w-4" />
            Capacity Overrides
            {settings.capacityOverrides.length > 0 && (
              <Badge className="ml-1" variant="secondary">{settings.capacityOverrides.length}</Badge>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Capacity Overrides</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set reduced capacity for leaves, holidays, etc.</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Person</label>
                  <Select value={overridePerson} onValueChange={(v) => v && setOverridePerson(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CORE_TEAM.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Week</label>
                  <Select value={overrideWeek} onValueChange={(v) => v && setOverrideWeek(v)}>
                    <SelectTrigger><SelectValue placeholder="Select week" /></SelectTrigger>
                    <SelectContent>
                      {allWeeks.slice(-12).map((w) => (
                        <SelectItem key={w} value={w}>{getWeekLabel(w)} ({w})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Capacity (hrs)</label>
                  <Input type="number" value={overrideCapacity} onChange={(e) => setOverrideCapacity(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Note</label>
                  <Input placeholder="e.g. On leave" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
                </div>
              </div>
              <Button size="sm" onClick={handleAddOverride} disabled={!overrideWeek}>Add Override</Button>

              {settings.capacityOverrides.length > 0 && (
                <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                  {settings.capacityOverrides.map((o, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{o.person}</span>
                        <span className="text-muted-foreground mx-2">{getWeekLabel(o.weekKey)}</span>
                        <span>{o.capacity}h</span>
                        {o.note && <span className="text-muted-foreground ml-2">({o.note})</span>}
                      </div>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => removeCapacityOverride(o.person, o.weekKey)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Overload Heatmap</h2>
        <Heatmap
          data={heatmapData}
          persons={persons}
          weeks={displayWeeks}
          weekLabels={weekLabels}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Hours of Tasks Added</h2>
          <div className="space-y-3">
            {(() => {
              const maxAdded = Math.max(...tasksAddedData.map((d) => d.total), 1);
              return tasksAddedData.map((d) => (
                <div key={d.person} className="flex items-center gap-3">
                  <span className="text-sm w-20 font-medium">{d.person}</span>
                  <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-l"
                      style={{ width: `${(d.billable / maxAdded) * 100}%`, backgroundColor: COLORS.billable }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-r"
                      style={{ left: `${(d.billable / maxAdded) * 100}%`, width: `${(d.internal / maxAdded) * 100}%`, backgroundColor: COLORS.internal }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {d.total > 0 ? `${d.billable}h + ${d.internal}h` : "-"}
                    </span>
                  </div>
                  <Badge variant="secondary" className="w-16 justify-center">
                    {d.total > 0 ? `${d.total}h` : "-"}
                  </Badge>
                </div>
              ));
            })()}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.billable }} /> Billable</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.internal }} /> Internal</span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Hours of Tasks Overdue</h2>
          <div className="space-y-3">
            {(() => {
              const maxOverdue = Math.max(...backlogData.map((d) => d.total), 1);
              return backlogData.map((d) => (
                <div key={d.person} className="flex items-center gap-3">
                  <span className="text-sm w-20 font-medium">{d.person}</span>
                  <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-l"
                      style={{ width: `${(d.billable / maxOverdue) * 100}%`, backgroundColor: COLORS.billable }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-r"
                      style={{ left: `${(d.billable / maxOverdue) * 100}%`, width: `${(d.internal / maxOverdue) * 100}%`, backgroundColor: COLORS.internal }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {d.total > 0 ? `${d.billable}h + ${d.internal}h` : "-"}
                    </span>
                  </div>
                  <Badge variant={d.total > 0 ? "destructive" : "secondary"} className="w-16 justify-center">
                    {d.total > 0 ? `${d.total}h` : "-"}
                  </Badge>
                </div>
              ));
            })()}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.billable }} /> Billable</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.internal }} /> Internal</span>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-medium mb-4">Capacity Gap ({getWeekLabel(currentWeekKey)})</h2>
        <div className="space-y-3">
          {capacityGapData.map((d) => (
            <div key={d.person} className="flex items-center gap-3">
              <span className="text-sm w-20 font-medium">{d.person}</span>
              <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded transition-all ${
                    d.gap < 0 ? "bg-red-500" : d.gap < 10 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min((d.hours / d.capacity) * 100, 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {d.hours.toFixed(1)}h / {d.capacity}h
                </span>
              </div>
              <Badge variant={d.gap < 0 ? "destructive" : d.gap < 10 ? "default" : "secondary"} className="w-20 justify-center">
                {d.gap >= 0 ? `+${d.gap.toFixed(0)}h` : `${d.gap.toFixed(0)}h`}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
