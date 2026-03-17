import type { WeeklyTeamData, WeeklyPersonData, ClientData, Task } from "./types";
import { CORE_TEAM } from "./constants";

export function buildSystemPrompt(
  weeklyTeam: WeeklyTeamData[],
  weeklyPerson: WeeklyPersonData[],
  clients: ClientData[],
  tasks: Task[]
): string {
  const recent = weeklyTeam.slice(-4);
  const openTasks = tasks.filter((t) => t.status === "Yet to start" || t.status === "In process");

  const weekSummaries = recent
    .map(
      (w) =>
        `${w.weekLabel} (${w.weekKey}): ${w.totalHours.toFixed(1)}h total, ${w.billableHours.toFixed(1)}h billable, ${w.internalHours.toFixed(1)}h internal, ${w.avgUtilisation.toFixed(1)}% utilisation. ${
          w.overloadedMembers.length > 0
            ? `Overloaded: ${w.overloadedMembers.join(", ")}`
            : "No overloads"
        }. Per person: ${Object.entries(w.personBreakdown)
          .map(([p, d]) => `${p}: ${d.total.toFixed(1)}h`)
          .join(", ")}`
    )
    .join("\n");

  const topClients = clients
    .slice(0, 10)
    .map((c) => `${c.customer}: ${c.totalHours.toFixed(1)}h (${c.taskCount} tasks, ${c.primaryAssignee})`)
    .join("\n");

  const personSummary = CORE_TEAM.map((person) => {
    const pData = weeklyPerson.filter((p) => p.person === person);
    const latest = pData[pData.length - 1];
    const avgUtil =
      pData.length > 0
        ? pData.reduce((s, p) => s + p.utilisationPct, 0) / pData.length
        : 0;
    return `${person}: Latest ${latest?.totalHours.toFixed(1) || 0}h (${latest?.utilisationPct.toFixed(1) || 0}%), avg util ${avgUtil.toFixed(1)}%`;
  }).join("\n");

  return `You are an AI analytics assistant for a consulting team's resource planner dashboard. You help managers understand team utilisation, identify workload issues, and optimise resource allocation.

## Team
Core members (5): ${CORE_TEAM.join(", ")}
Capacity: 40 hours/week per person (200h team total)
Optimal range: 75-100% utilisation

## Recent Weeks (Last 4)
${weekSummaries}

## Team Member Summary
${personSummary}

## Top 10 Clients by Hours
${topClients}

## Open Tasks
${openTasks.length} tasks still open (${openTasks.filter((t) => t.status === "In process").length} in process, ${openTasks.filter((t) => t.status === "Yet to start").length} yet to start)

## Key Metrics
- Total tracked tasks: ${tasks.length}
- Total weeks tracked: ${weeklyTeam.length}
- Average team utilisation: ${weeklyTeam.length > 0 ? (weeklyTeam.reduce((s, w) => s + w.avgUtilisation, 0) / weeklyTeam.length).toFixed(1) : 0}%

Answer questions about team performance, utilisation, workload balance, and provide actionable recommendations. Be concise and data-driven. Use specific numbers from the data.`;
}

export function buildInsightPrompt(
  weeklyTeam: WeeklyTeamData[],
  weeklyPerson: WeeklyPersonData[],
  clients: ClientData[]
): string {
  return `Based on the team data in your context, provide a structured weekly insight report with these sections:

1. **Weekly Summary** - 2-3 sentence overview of the current state
2. **Anomalies & Alerts** - Any unusual patterns, overloads, or underutilisation (bullet points)
3. **Load Forecast** - Based on trends, what to expect next week
4. **Recommendations** - 2-3 specific, actionable suggestions for rebalancing

Keep it concise and actionable. Use specific names and numbers.`;
}
