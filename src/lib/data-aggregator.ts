import type { Task, Settings, WeeklyPersonData, WeeklyTeamData, ClientData, KPIData } from "./types";
import { CORE_TEAM } from "./constants";
import { getCapacityForPersonWeek, getSettings } from "./settings";
import { sortWeekKeys, getWeekLabel, getISOWeekKey, getMonthKey, getMonthLabel } from "./date-utils";

export function aggregateByPersonWeek(
  tasks: Task[],
  settings?: Settings
): WeeklyPersonData[] {
  const s = settings || getSettings();
  const map = new Map<string, { billable: number; internal: number }>();

  for (const task of tasks) {
    if (!task.weekKey) continue;
    const person = CORE_TEAM.includes(task.assigneeDisplay)
      ? task.assigneeDisplay
      : "Other";
    const key = `${task.weekKey}|${person}`;
    const existing = map.get(key) || { billable: 0, internal: 0 };
    if (task.isBillable) {
      existing.billable += task.tentativeHours;
    } else {
      existing.internal += task.tentativeHours;
    }
    map.set(key, existing);
  }

  const results: WeeklyPersonData[] = [];
  for (const [key, val] of map) {
    const [weekKey, person] = key.split("|");
    const total = val.billable + val.internal;
    const capacity = getCapacityForPersonWeek(s, person, weekKey);
    const utilisationPct = capacity > 0 ? (total / capacity) * 100 : 0;
    const loadStatus: "under" | "optimal" | "over" =
      utilisationPct >= s.overloadThreshold
        ? "over"
        : utilisationPct >= (s.optimalLowerBound / s.defaultCapacity) * 100
        ? "optimal"
        : "under";

    results.push({
      weekKey,
      weekLabel: getWeekLabel(weekKey),
      person,
      billableHours: Math.round(val.billable * 100) / 100,
      internalHours: Math.round(val.internal * 100) / 100,
      totalHours: Math.round(total * 100) / 100,
      capacity,
      utilisationPct: Math.round(utilisationPct * 10) / 10,
      loadStatus,
    });
  }

  return results.sort((a, b) => a.weekKey.localeCompare(b.weekKey) || a.person.localeCompare(b.person));
}

export function aggregateByWeek(
  tasks: Task[],
  settings?: Settings
): WeeklyTeamData[] {
  const personWeekly = aggregateByPersonWeek(tasks, settings);
  const s = settings || getSettings();
  const weekMap = new Map<string, WeeklyTeamData>();

  for (const pw of personWeekly) {
    if (!weekMap.has(pw.weekKey)) {
      weekMap.set(pw.weekKey, {
        weekKey: pw.weekKey,
        weekLabel: pw.weekLabel,
        totalHours: 0,
        billableHours: 0,
        internalHours: 0,
        teamCapacity: 0,
        avgUtilisation: 0,
        overloadedMembers: [],
        personBreakdown: {},
      });
    }
    const w = weekMap.get(pw.weekKey)!;
    w.totalHours += pw.totalHours;
    w.billableHours += pw.billableHours;
    w.internalHours += pw.internalHours;
    w.personBreakdown[pw.person] = {
      billable: pw.billableHours,
      internal: pw.internalHours,
      total: pw.totalHours,
    };
    if (pw.loadStatus === "over") {
      w.overloadedMembers.push(pw.person);
    }
  }

  const coreCount = CORE_TEAM.length;
  for (const w of weekMap.values()) {
    w.teamCapacity = coreCount * s.defaultCapacity;
    w.totalHours = Math.round(w.totalHours * 100) / 100;
    w.billableHours = Math.round(w.billableHours * 100) / 100;
    w.internalHours = Math.round(w.internalHours * 100) / 100;
    w.avgUtilisation =
      w.teamCapacity > 0
        ? Math.round((w.totalHours / w.teamCapacity) * 1000) / 10
        : 0;
  }

  const weeks = sortWeekKeys(Array.from(weekMap.keys()));
  return weeks.map((k) => weekMap.get(k)!);
}

export function aggregateByClient(tasks: Task[]): ClientData[] {
  const map = new Map<string, ClientData>();

  for (const task of tasks) {
    const customer = task.customer || "Unknown";
    if (!map.has(customer)) {
      map.set(customer, {
        customer,
        totalHours: 0,
        billableHours: 0,
        internalHours: 0,
        taskCount: 0,
        primaryAssignee: "",
      });
    }
    const c = map.get(customer)!;
    c.totalHours += task.tentativeHours;
    if (task.isBillable) c.billableHours += task.tentativeHours;
    else c.internalHours += task.tentativeHours;
    c.taskCount++;
  }

  // Find primary assignee per client
  for (const [customer, clientData] of map) {
    const assigneeCounts = new Map<string, number>();
    for (const task of tasks) {
      if (task.customer === customer) {
        const a = task.assigneeDisplay;
        assigneeCounts.set(a, (assigneeCounts.get(a) || 0) + task.tentativeHours);
      }
    }
    let maxHours = 0;
    for (const [assignee, hours] of assigneeCounts) {
      if (hours > maxHours) {
        maxHours = hours;
        clientData.primaryAssignee = assignee;
      }
    }
    clientData.totalHours = Math.round(clientData.totalHours * 100) / 100;
    clientData.billableHours = Math.round(clientData.billableHours * 100) / 100;
    clientData.internalHours = Math.round(clientData.internalHours * 100) / 100;
  }

  return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export interface MonthlyPersonData {
  monthKey: string;
  monthLabel: string;
  personBreakdown: Record<string, number>;
}

export function aggregateByMonth(
  tasks: Task[]
): MonthlyPersonData[] {
  const map = new Map<string, Record<string, number>>();

  for (const task of tasks) {
    if (!task.weekKey) continue;
    const monthKey = getMonthKey(task.weekKey);
    const person = CORE_TEAM.includes(task.assigneeDisplay)
      ? task.assigneeDisplay
      : "Other";
    if (!map.has(monthKey)) map.set(monthKey, {});
    const breakdown = map.get(monthKey)!;
    breakdown[person] = (breakdown[person] || 0) + task.tentativeHours;
  }

  const months = Array.from(map.keys()).sort();
  return months.map((mk) => ({
    monthKey: mk,
    monthLabel: getMonthLabel(mk),
    personBreakdown: map.get(mk)!,
  }));
}

export function getCurrentWeekKPIs(
  weeklyTeam: WeeklyTeamData[],
  weeklyPerson: WeeklyPersonData[]
): KPIData {
  const currentWeek = getISOWeekKey(new Date());
  const current = weeklyTeam.find((w) => w.weekKey === currentWeek);
  const lastN = weeklyTeam.slice(-8);

  const totalHoursThisWeek = current?.totalHours ?? 0;
  const teamUtilisation = current?.avgUtilisation ?? 0;
  const billableRatio =
    current && current.totalHours > 0
      ? Math.round((current.billableHours / current.totalHours) * 1000) / 10
      : 0;
  const overloadedCount = current?.overloadedMembers.length ?? 0;

  return {
    totalHoursThisWeek,
    teamUtilisation,
    billableRatio,
    overloadedCount,
    weeklyTrend: lastN.map((w) => ({ weekKey: w.weekKey, value: w.totalHours })),
    billableTrend: lastN.map((w) => ({
      weekKey: w.weekKey,
      value: w.totalHours > 0 ? (w.billableHours / w.totalHours) * 100 : 0,
    })),
    utilisationTrend: lastN.map((w) => ({ weekKey: w.weekKey, value: w.avgUtilisation })),
  };
}
