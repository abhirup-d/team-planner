"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useData } from "@/hooks/use-data";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CORE_TEAM } from "@/lib/constants";
import { sortWeekKeys, parseDate, getWeekMonday } from "@/lib/date-utils";
import { DateRangePicker } from "@/components/date-range-picker";
import type { Task } from "@/lib/types";
import { Search, X, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

interface SavedView {
  name: string;
  weekRange: string;
  startDate: string;
  endDate: string;
  personFilter: string;
  clientFilter: string;
  statusFilter: string;
  sortCol: string;
  sortDir: "asc" | "desc";
}

const SAVED_VIEWS_KEY = "team-analytics-saved-views";

function loadSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistSavedViews(views: SavedView[]) {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

function getStretchedDays(task: Task): number | null {
  if (!task.dueDate || !task.plannedDueDate) return null;
  const due = parseDate(task.dueDate);
  const planned = parseDate(task.plannedDueDate);
  if (!due || !planned) return null;
  const diff = Math.round((due.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

const PAGE_SIZE = 20;

function statusBadge(status: string) {
  switch (status) {
    case "Completed":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
    case "In process":
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">In Process</Badge>;
    case "Yet to start":
      return <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">Yet to Start</Badge>;
    case "Revision Required (Client)":
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Revision</Badge>;
    default:
      return <Badge variant="secondary">{status || "N/A"}</Badge>;
  }
}

export default function TasksPage() {
  const { tasks, meta, isLoading } = useData();
  const [search, setSearch] = useState("");
  const [weekRange, setWeekRange] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sortCol, setSortCol] = useState<string>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => { setSavedViews(loadSavedViews()); }, []);

  const saveCurrentView = useCallback(() => {
    if (!viewName.trim()) return;
    const view: SavedView = {
      name: viewName.trim(),
      weekRange, startDate, endDate,
      personFilter, clientFilter, statusFilter,
      sortCol, sortDir,
    };
    const updated = [...savedViews.filter((v) => v.name !== view.name), view];
    setSavedViews(updated);
    persistSavedViews(updated);
    setViewName("");
    setShowSaveInput(false);
  }, [viewName, weekRange, startDate, endDate, personFilter, clientFilter, statusFilter, sortCol, sortDir, savedViews]);

  const loadView = useCallback((view: SavedView) => {
    setWeekRange(view.weekRange);
    setStartDate(view.startDate);
    setEndDate(view.endDate);
    setPersonFilter(view.personFilter);
    setClientFilter(view.clientFilter);
    setStatusFilter(view.statusFilter);
    setSortCol(view.sortCol);
    setSortDir(view.sortDir);
    setPage(0);
  }, []);

  const deleteView = useCallback((name: string) => {
    const updated = savedViews.filter((v) => v.name !== name);
    setSavedViews(updated);
    persistSavedViews(updated);
  }, [savedViews]);

  const allWeekKeys = useMemo(() => {
    return sortWeekKeys([...new Set(tasks.filter((t) => t.weekKey).map((t) => t.weekKey!))]);
  }, [tasks]);

  const syncDateRange = (value: string) => {
    if (value === "month") {
      const now = new Date();
      const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstOfMonth);
      setEndDate(lastOfMonth.toISOString().split("T")[0]);
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

  const filtered = useMemo(() => {
    let result = tasks;
    if (startDate || endDate) {
      result = result.filter((t) => {
        const d = t.effectiveDate || "";
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    } else if (weekRange !== "all" && weekRange !== "month") {
      const n = parseInt(weekRange);
      const recentWeeks = new Set(allWeekKeys.slice(-n));
      result = result.filter((t) => t.weekKey && recentWeeks.has(t.weekKey));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.deliverable.toLowerCase().includes(s) ||
          t.taskDescription.toLowerCase().includes(s) ||
          t.customer.toLowerCase().includes(s) ||
          t.assigneeDisplay.toLowerCase().includes(s)
      );
    }
    if (personFilter !== "all") {
      result = result.filter((t) => t.assigneeDisplay === personFilter);
    }
    if (clientFilter !== "all") {
      result = result.filter((t) => t.customer === clientFilter);
    }
    if (statusFilter === "ongoing") {
      result = result.filter((t) => t.status !== "Completed");
    } else if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortCol) {
        case "dueDate":
          va = a.effectiveDate || "";
          vb = b.effectiveDate || "";
          break;
        case "hours":
          va = a.tentativeHours;
          vb = b.tentativeHours;
          break;
        case "deliverable":
          va = a.deliverable.toLowerCase();
          vb = b.deliverable.toLowerCase();
          break;
        case "customer":
          va = a.customer.toLowerCase();
          vb = b.customer.toLowerCase();
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, search, personFilter, clientFilter, statusFilter, sortCol, sortDir, weekRange, startDate, endDate]);

  // Dynamic filter options based on currently filtered tasks (excluding the filter's own selection)
  const filterOptions = useMemo(() => {
    const applyFilters = (excludeFilter: string) => {
      let result = tasks;
      if (startDate || endDate) {
        result = result.filter((t) => {
          const d = t.effectiveDate || "";
          if (!d) return false;
          if (startDate && d < startDate) return false;
          if (endDate && d > endDate) return false;
          return true;
        });
      } else if (weekRange !== "all" && weekRange !== "month") {
        const n = parseInt(weekRange);
        const recentWeeks = new Set(allWeekKeys.slice(-n));
        result = result.filter((t) => t.weekKey && recentWeeks.has(t.weekKey));
      }
      if (search) {
        const s = search.toLowerCase();
        result = result.filter(
          (t) => t.deliverable.toLowerCase().includes(s) || t.taskDescription.toLowerCase().includes(s) || t.customer.toLowerCase().includes(s) || t.assigneeDisplay.toLowerCase().includes(s)
        );
      }
      if (excludeFilter !== "person" && personFilter !== "all") result = result.filter((t) => t.assigneeDisplay === personFilter);
      if (excludeFilter !== "client" && clientFilter !== "all") result = result.filter((t) => t.customer === clientFilter);
      if (excludeFilter !== "status" && statusFilter === "ongoing") result = result.filter((t) => t.status !== "Completed");
      else if (excludeFilter !== "status" && statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
      return result;
    };
    const personTasks = applyFilters("person");
    const clientTasks = applyFilters("client");
    const statusTasks = applyFilters("status");
    return {
      persons: [...new Set(personTasks.map((t) => t.assigneeDisplay))].sort(),
      clients: [...new Set(clientTasks.map((t) => t.customer))].sort(),
      statuses: [...new Set(statusTasks.map((t) => t.status))].filter(Boolean).sort(),
    };
  }, [tasks, search, weekRange, startDate, endDate, personFilter, clientFilter, statusFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };

  const clearFilters = () => {
    setSearch(""); setWeekRange("all"); setStartDate(""); setEndDate("");
    setPersonFilter("all"); setClientFilter("all"); setStatusFilter("all"); setPage(0);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground">Loading data...</div></div>;
  }

  const hasFilters = search || weekRange !== "all" || startDate || endDate || personFilter !== "all" || clientFilter !== "all" || statusFilter !== "all";

  return (
    <div>
      <Header title="Task View" description={`${filtered.length} of ${tasks.length} tasks`} />

      {/* Filters */}
      <Card className="p-4 mb-6 space-y-3">
        {/* Row 1: Search, Period, Date Range */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Period</label>
            <Select value={weekRange} onValueChange={(v) => { if (v) { setWeekRange(v); syncDateRange(v); setPage(0); } }}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="1">1 week</SelectItem>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
                <SelectItem value="26">26 weeks</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date Range</label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={(v) => { setStartDate(v); setPage(0); }}
              onEndChange={(v) => { setEndDate(v); setPage(0); }}
            />
          </div>
        </div>

        {/* Row 2: Person, Client, Status, Clear, Save View */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Person</label>
            <Select value={personFilter} onValueChange={(v) => { if (v) { setPersonFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {filterOptions.persons.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Client</label>
            <Select value={clientFilter} onValueChange={(v) => { if (v) { setClientFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {filterOptions.clients.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                {filterOptions.statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 pb-2">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-end gap-2">
            {showSaveInput ? (
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">View Name</label>
                  <Input
                    placeholder="My view..."
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveCurrentView(); if (e.key === "Escape") setShowSaveInput(false); }}
                    className="w-[140px] h-9"
                    autoFocus
                  />
                </div>
                <button
                  onClick={saveCurrentView}
                  disabled={!viewName.trim()}
                  className="px-3 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveInput(false)}
                  className="px-2 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="flex items-center gap-1 px-3 py-2 text-xs border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Bookmark className="h-3 w-3" /> Save View
              </button>
            )}
          </div>
        </div>

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Saved:</span>
            {savedViews.map((view) => (
              <div key={view.name} className="flex items-center gap-0.5 group">
                <button
                  onClick={() => loadView(view)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded-l-md transition-colors"
                >
                  <BookmarkCheck className="h-3 w-3 text-primary" />
                  {view.name}
                </button>
                <button
                  onClick={() => deleteView(view.name)}
                  className="px-1.5 py-1 text-xs bg-muted/50 hover:bg-destructive/10 hover:text-destructive rounded-r-md transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("deliverable")}>
                  Deliverable {sortCol === "deliverable" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left p-3 font-medium">Task</th>
                <th className="text-left p-3 font-medium">Assignee</th>
                <th className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("customer")}>
                  Client {sortCol === "customer" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left p-3 font-medium">Reviewer</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("hours")}>
                  Hours {sortCol === "hours" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right p-3 font-medium">Stretched</th>
                <th className="text-left p-3 font-medium cursor-pointer hover:bg-muted/80" onClick={() => toggleSort("dueDate")}>
                  Due Date {sortCol === "dueDate" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((task, i) => (
                <tr
                  key={`${task.deliverable}-${i}`}
                  className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedTask(task)}
                >
                  <td className="p-3 max-w-[200px] truncate">{task.deliverable}</td>
                  <td className="p-3 max-w-[200px] truncate text-muted-foreground">{task.taskDescription || "-"}</td>
                  <td className="p-3">{task.assigneeDisplay}</td>
                  <td className="p-3">{task.customer}</td>
                  <td className="p-3 text-muted-foreground">{task.reviewerDisplay || "-"}</td>
                  <td className="p-3">{statusBadge(task.status)}</td>
                  <td className="p-3 text-right font-mono">{task.tentativeHours > 0 ? `${task.tentativeHours.toFixed(1)}h` : "-"}</td>
                  <td className="p-3 text-right font-mono text-orange-500">{(() => { const d = getStretchedDays(task); return d ? `+${d}d` : "-"; })()}</td>
                  <td className="p-3 text-muted-foreground">{task.effectiveDate || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t">
          <span className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs border rounded disabled:opacity-50"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 text-xs border rounded disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedTask?.deliverable}</SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="mt-4 space-y-4 text-sm">
              {selectedTask.taskDescription && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Description</p>
                  <p className="whitespace-pre-wrap">{selectedTask.taskDescription}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Assignee</p>
                  <p>{selectedTask.assigneeDisplay}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Customer</p>
                  <p>{selectedTask.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Task Type</p>
                  <p>{selectedTask.taskType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Status</p>
                  {statusBadge(selectedTask.status)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Hours</p>
                  <p>{selectedTask.tentativeHours}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Billable</p>
                  <p>{selectedTask.isBillable ? "Yes" : "No (Internal)"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Start Date</p>
                  <p>{selectedTask.startDate || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Due Date</p>
                  <p>{selectedTask.dueDate || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Completion Date</p>
                  <p>{selectedTask.completionDate || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Week</p>
                  <p>{selectedTask.weekLabel || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Rework (Client)</p>
                  <p>{selectedTask.clientReworkCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Rework (Internal)</p>
                  <p>{selectedTask.internalReworkCount}</p>
                </div>
              </div>
              {selectedTask.remarks && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Remarks</p>
                  <p className="whitespace-pre-wrap">{selectedTask.remarks}</p>
                </div>
              )}
              {selectedTask.reviewer && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Reviewer</p>
                  <p>{selectedTask.reviewer}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
