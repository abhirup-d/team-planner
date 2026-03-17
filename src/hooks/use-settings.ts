"use client";

import { useState, useEffect, useCallback } from "react";
import type { Settings, CapacityOverride } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(getSettings);

  useEffect(() => {
    setSettingsState(getSettings());
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      saveSettings(next);
      return next;
    });
  }, []);

  const setCapacityOverride = useCallback(
    (override: CapacityOverride) => {
      setSettingsState((prev) => {
        const filtered = prev.capacityOverrides.filter(
          (o) => !(o.person === override.person && o.weekKey === override.weekKey)
        );
        const next = { ...prev, capacityOverrides: [...filtered, override] };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  const removeCapacityOverride = useCallback(
    (person: string, weekKey: string) => {
      setSettingsState((prev) => {
        const next = {
          ...prev,
          capacityOverrides: prev.capacityOverrides.filter(
            (o) => !(o.person === person && o.weekKey === weekKey)
          ),
        };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  return { settings, updateSettings, setCapacityOverride, removeCapacityOverride };
}
