/**
 * Fetches all Activity Tracker data from Slack and writes it to the CSV fallback file.
 * Usage: npx tsx scripts/sync-slack-to-csv.ts
 */

import { fetchActivityTracker } from "../src/lib/slack-client";
import { SLACK_ID_MAP } from "../src/lib/constants";
import fs from "fs";
import path from "path";

// Reverse map: resolve Slack user IDs to names for CSV
function resolveUser(id: string): string {
  return id
    .split(",")
    .map((s) => SLACK_ID_MAP[s.trim()] || s.trim())
    .join(",");
}

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("SLACK_BOT_TOKEN not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("Fetching from Slack Activity Tracker...");
  const tasks = await fetchActivityTracker(2000);
  console.log(`Fetched ${tasks.length} tasks`);

  // CSV headers matching the parseRow() expectations in csv-parser.ts
  const headers = [
    "Deliverable",
    "Task to be done",
    "Assignee",
    "Start Date",
    "Planned Due Date",
    "Due Date",
    "Customer",
    "Task Type",
    "Status",
    "Remarks",
    "Completed",
    "Reviewer",
    "Client rework count",
    "Tentative Time",
    "Last edited time",
    "Internal rework count",
    "Completion Date",
    "Created Time",
  ];

  const rows = tasks.map((t) => [
    csvEscape(t.deliverable),
    csvEscape(t.taskDescription),
    csvEscape(t.assigneeId),
    t.startDate ?? "",
    t.plannedDueDate ?? "",
    t.dueDate ?? "",
    csvEscape(t.customer),
    csvEscape(t.taskType),
    csvEscape(t.status),
    csvEscape(t.remarks),
    String(t.completed),
    csvEscape(t.reviewer),
    String(t.clientReworkCount),
    String(t.tentativeHours),
    t.lastEditedTime ?? "",
    String(t.internalReworkCount),
    t.completionDate ?? "",
    t.createdTime ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const outPath = path.join(__dirname, "..", "public", "data", "activity_tracker.csv");
  fs.writeFileSync(outPath, csv, "utf-8");
  console.log(`Written ${tasks.length} rows to ${outPath}`);
}

function csvEscape(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
