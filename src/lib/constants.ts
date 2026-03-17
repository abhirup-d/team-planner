export const SLACK_ID_MAP: Record<string, string> = {
  U06LK54V5EF: "Kabir",
  UJ9KR034Z: "Abhirup",
  U0877RUHX4M: "Olivia",
  U08MDDVKE1X: "Pulkit",
  U0960SQTB25: "Kushagra",
};

export const CORE_TEAM = ["Olivia", "Pulkit", "Kabir", "Kushagra", "Abhirup"];

export const DEFAULT_SETTINGS = {
  defaultCapacity: 40,
  optimalLowerBound: 30,
  warningThreshold: 85,
  overloadThreshold: 100,
  capacityOverrides: [] as { person: string; weekKey: string; capacity: number; note?: string }[],
};

export const COLORS = {
  billable: "#6366f1",
  internal: "#a78bfa",
  overload: "#f43f5e",
  warning: "#fb923c",
  optimal: "#34d399",
  under: "#cbd5e1",
};

export const PERSON_COLORS: Record<string, string> = {
  Olivia: "#8b5cf6",
  Pulkit: "#06b6d4",
  Kabir: "#10b981",
  Kushagra: "#f59e0b",
  Abhirup: "#f43f5e",
  Other: "#94a3b8",
};
