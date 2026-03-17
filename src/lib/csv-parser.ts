import Papa from "papaparse";
import { SLACK_ID_MAP, CORE_TEAM } from "./constants";
import { parseDate, getISOWeekKey, getWeekLabel } from "./date-utils";
import type { Task, RawTask, DataMeta, ParsedData } from "./types";

export function resolveAssignee(slackId: string): string {
  const trimmed = slackId.trim();
  return SLACK_ID_MAP[trimmed] || (CORE_TEAM.includes(trimmed) ? trimmed : "Other");
}

export function resolveAssignees(assigneeField: string): string[] {
  if (!assigneeField || assigneeField.trim() === "") return ["Unassigned"];
  return assigneeField
    .split(",")
    .map((id) => resolveAssignee(id.trim()))
    .filter(Boolean);
}

function parseRow(row: Record<string, string>): RawTask {
  const tentative = parseFloat(row["Tentative Time"]);
  return {
    deliverable: row["Deliverable"] || "",
    taskDescription: row["Task to be done"] || "",
    assigneeId: row["Assignee"] || "",
    startDate: row["Start Date"] || null,
    plannedDueDate: row["Planned Due Date"] || null,
    dueDate: row["Due Date"] || null,
    customer: row["Customer"] || "",
    taskType: row["Task Type"] || "",
    status: row["Status"] || "",
    remarks: row["Remarks"] || "",
    completed: row["Completed"]?.toLowerCase() === "true",
    reviewer: row["Reviewer"] || "",
    clientReworkCount: parseInt(row["Client rework count"]) || 0,
    tentativeHours: isNaN(tentative) ? 0 : tentative,
    lastEditedTime: row["Last edited time"] || null,
    internalReworkCount: parseFloat(row["Internal rework count"]) || 0,
    completionDate: row["Completion Date"] || null,
    createdTime: row["Created Time"] || row["Start Date"] || null,
  };
}

export function enrichTask(raw: RawTask): Task[] {
  const assignees = resolveAssignees(raw.assigneeId);
  const isBillable = raw.customer.toLowerCase() !== "internal";

  const completionDate = parseDate(raw.completionDate);
  const dueDate = parseDate(raw.dueDate);
  const effectiveDateObj = completionDate || dueDate;
  const effectiveDate = effectiveDateObj ? effectiveDateObj.toISOString().split("T")[0] : null;
  const weekKey = effectiveDateObj ? getISOWeekKey(effectiveDateObj) : null;
  const weekLabel = weekKey ? getWeekLabel(weekKey) : null;

  const hoursPerAssignee = assignees.length > 1 ? raw.tentativeHours / assignees.length : raw.tentativeHours;

  const reviewerDisplay = raw.reviewer
    ? raw.reviewer.split(",").map((id) => resolveAssignee(id.trim())).filter(Boolean).join(", ")
    : "";

  return assignees.map((assignee) => ({
    ...raw,
    tentativeHours: hoursPerAssignee,
    assignees: [assignee],
    assigneeDisplay: assignee,
    reviewerDisplay,
    isBillable,
    effectiveDate,
    weekKey,
    weekLabel,
  }));
}

export function parseCSV(csvText: string): Omit<ParsedData, "lastUpdated"> {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const allTasks: Task[] = [];
  for (const row of result.data as Record<string, string>[]) {
    const raw = parseRow(row);
    const tasks = enrichTask(raw);
    allTasks.push(...tasks);
  }

  const weekKeys = new Set<string>();
  const persons = new Set<string>();
  const customers = new Set<string>();
  const statuses = new Set<string>();
  const taskTypes = new Set<string>();

  for (const task of allTasks) {
    if (task.weekKey) weekKeys.add(task.weekKey);
    persons.add(task.assigneeDisplay);
    if (task.customer) customers.add(task.customer);
    if (task.status) statuses.add(task.status);
    if (task.taskType) taskTypes.add(task.taskType);
  }

  const meta: DataMeta = {
    weekRange: Array.from(weekKeys).sort(),
    persons: Array.from(persons).sort(),
    customers: Array.from(customers).sort(),
    statuses: Array.from(statuses).sort(),
    taskTypes: Array.from(taskTypes).sort(),
  };

  return { tasks: allTasks, meta };
}
