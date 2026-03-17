"use client";

import { useSettings } from "@/hooks/use-settings";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CORE_TEAM, SLACK_ID_MAP } from "@/lib/constants";
import { getWeekLabel } from "@/lib/date-utils";

export default function SettingsPage() {
  const { settings, updateSettings, removeCapacityOverride } = useSettings();

  return (
    <div>
      <Header title="Settings" description="Configure thresholds and capacity overrides" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Default Thresholds</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Default Weekly Capacity (hrs)</label>
              <Input
                type="number"
                value={settings.defaultCapacity}
                onChange={(e) => updateSettings({ defaultCapacity: parseFloat(e.target.value) || 40 })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Optimal Lower Bound (hrs)</label>
              <Input
                type="number"
                value={settings.optimalLowerBound}
                onChange={(e) => updateSettings({ optimalLowerBound: parseFloat(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Below this = underutilised</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Warning Threshold (%)</label>
              <Input
                type="number"
                value={settings.warningThreshold}
                onChange={(e) => updateSettings({ warningThreshold: parseFloat(e.target.value) || 85 })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Overload Threshold (%)</label>
              <Input
                type="number"
                value={settings.overloadThreshold}
                onChange={(e) => updateSettings({ overloadThreshold: parseFloat(e.target.value) || 100 })}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Team Members</h2>
          <p className="text-xs text-muted-foreground mb-3">Slack ID to name mapping (will be resolved via Slack API later)</p>
          <div className="space-y-2">
            {Object.entries(SLACK_ID_MAP).map(([id, name]) => (
              <div key={id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                <span className="font-medium">{name}</span>
                <code className="text-xs text-muted-foreground">{id}</code>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <h2 className="text-sm font-medium mb-4">
            Capacity Overrides
            {settings.capacityOverrides.length > 0 && (
              <Badge className="ml-2" variant="secondary">{settings.capacityOverrides.length}</Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Reduce capacity for specific people on specific weeks (leaves, holidays, etc.)
            You can add overrides from the Manager Dashboard.
          </p>
          {settings.capacityOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No overrides configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Person</th>
                    <th className="text-left p-2 font-medium">Week</th>
                    <th className="text-right p-2 font-medium">Capacity</th>
                    <th className="text-left p-2 font-medium">Note</th>
                    <th className="text-right p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.capacityOverrides.map((o, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{o.person}</td>
                      <td className="p-2">{getWeekLabel(o.weekKey)} ({o.weekKey})</td>
                      <td className="p-2 text-right">{o.capacity}h</td>
                      <td className="p-2 text-muted-foreground">{o.note || "-"}</td>
                      <td className="p-2 text-right">
                        <button
                          className="text-xs text-red-500 hover:underline"
                          onClick={() => removeCapacityOverride(o.person, o.weekKey)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
