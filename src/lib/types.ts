export interface RawTask {
  deliverable: string;
  taskDescription: string;
  assigneeId: string;
  startDate: string | null;
  plannedDueDate: string | null;
  dueDate: string | null;
  customer: string;
  taskType: string;
  status: string;
  remarks: string;
  completed: boolean;
  reviewer: string;
  clientReworkCount: number;
  tentativeHours: number;
  lastEditedTime: string | null;
  internalReworkCount: number;
  completionDate: string | null;
  createdTime: string | null;
}

export interface Task extends RawTask {
  assignees: string[];
  assigneeDisplay: string;
  reviewerDisplay: string;
  isBillable: boolean;
  effectiveDate: string | null;
  weekKey: string | null;
  weekLabel: string | null;
}

export interface WeeklyPersonData {
  weekKey: string;
  weekLabel: string;
  person: string;
  billableHours: number;
  internalHours: number;
  totalHours: number;
  capacity: number;
  utilisationPct: number;
  loadStatus: "under" | "optimal" | "over";
}

export interface WeeklyTeamData {
  weekKey: string;
  weekLabel: string;
  totalHours: number;
  billableHours: number;
  internalHours: number;
  teamCapacity: number;
  avgUtilisation: number;
  overloadedMembers: string[];
  personBreakdown: Record<string, { billable: number; internal: number; total: number }>;
}

export interface ClientData {
  customer: string;
  totalHours: number;
  billableHours: number;
  internalHours: number;
  taskCount: number;
  primaryAssignee: string;
}

export interface CapacityOverride {
  person: string;
  weekKey: string;
  capacity: number;
  note?: string;
}

export interface Settings {
  defaultCapacity: number;
  optimalLowerBound: number;
  warningThreshold: number;
  overloadThreshold: number;
  capacityOverrides: CapacityOverride[];
}

export interface KPIData {
  totalHoursThisWeek: number;
  teamUtilisation: number;
  billableRatio: number;
  overloadedCount: number;
  weeklyTrend: { weekKey: string; value: number }[];
  billableTrend: { weekKey: string; value: number }[];
  utilisationTrend: { weekKey: string; value: number }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DataMeta {
  weekRange: string[];
  persons: string[];
  customers: string[];
  statuses: string[];
  taskTypes: string[];
}

export interface ParsedData {
  tasks: Task[];
  meta: DataMeta;
  lastUpdated: string;
  source?: string;
}
