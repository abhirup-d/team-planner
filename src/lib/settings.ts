import { DEFAULT_SETTINGS } from "./constants";
import type { Settings } from "./types";

const STORAGE_KEY = "team-analytics-settings";

export function getSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getCapacityForPersonWeek(
  settings: Settings,
  person: string,
  weekKey: string
): number {
  const override = settings.capacityOverrides.find(
    (o) => o.person === person && o.weekKey === weekKey
  );
  return override ? override.capacity : settings.defaultCapacity;
}
