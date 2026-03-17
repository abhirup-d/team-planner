import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseCSV, enrichTask } from "@/lib/csv-parser";
import { fetchActivityTracker } from "@/lib/slack-client";
import type { Task, DataMeta } from "@/lib/types";

function buildMeta(tasks: Task[]): DataMeta {
  const weekKeys = new Set<string>();
  const persons = new Set<string>();
  const customers = new Set<string>();
  const statuses = new Set<string>();
  const taskTypes = new Set<string>();

  for (const task of tasks) {
    if (task.weekKey) weekKeys.add(task.weekKey);
    persons.add(task.assigneeDisplay);
    if (task.customer) customers.add(task.customer);
    if (task.status) statuses.add(task.status);
    if (task.taskType) taskTypes.add(task.taskType);
  }

  return {
    weekRange: Array.from(weekKeys).sort(),
    persons: Array.from(persons).sort(),
    customers: Array.from(customers).sort(),
    statuses: Array.from(statuses).sort(),
    taskTypes: Array.from(taskTypes).sort(),
  };
}

export async function GET() {
  // If Slack token is configured, fetch live data from Slack
  if (process.env.SLACK_BOT_TOKEN) {
    try {
      const rawTasks = await fetchActivityTracker(1000);
      const allTasks: Task[] = [];
      for (const raw of rawTasks) {
        allTasks.push(...enrichTask(raw));
      }
      const meta = buildMeta(allTasks);
      return NextResponse.json({ tasks: allTasks, meta, lastUpdated: new Date().toISOString() });
    } catch (err) {
      console.error("Slack API fetch failed, falling back to CSV:", err);
      // Fall through to CSV
    }
  }

  // Fallback: read from CSV file
  const csvPath = path.join(process.cwd(), "public", "data", "activity_tracker.csv");
  const csvText = fs.readFileSync(csvPath, "utf-8");
  const data = parseCSV(csvText);

  // Derive lastUpdated from the most recent lastEditedTime across all tasks
  let latestEdit: string | null = null;
  for (const t of data.tasks) {
    if (t.lastEditedTime && (!latestEdit || t.lastEditedTime > latestEdit)) {
      latestEdit = t.lastEditedTime;
    }
  }
  const lastUpdated = latestEdit || new Date().toISOString();

  return NextResponse.json({ ...data, lastUpdated });
}
