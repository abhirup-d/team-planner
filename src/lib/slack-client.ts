/**
 * Slack API client for fetching Activity Tracker list data.
 * Ported from: /Users/abhirup/oren/activity-tracker-flagging/scripts/slack_client.py
 */

import type { RawTask } from "./types";

const ACTIVITY_TRACKER_LIST_ID = "F07RNQ0BMSR";

// --- Column key → friendly name mapping ---

const COLUMN_KEY_MAP: Record<string, string> = {
  name: "deliverable",
  todo_completed: "completed",
  people: "assignee",
  date: "due_date",
  Col07SEDXUC80: "customer",
  Col07RU5P4KDJ: "status",
  Col07RRMSCBPC: "remarks",
  Col07RNT10R8W: "task_type",
  Col0984KC9W8Z: "reviewer",
  Col097J44UW31: "task_to_be_done",
  Col097ZP8SFHQ: "start_date",
  Col0980M8HREG: "client_rework_count",
  Col09A5HSG997: "tentative_time",
  Col09BMNMUU5V: "last_edited_time",
  Col0A5Y1X7PGB: "internal_rework_count",
  Col0A680ED1EW: "completion_date",
  Col0AKKQE64N6: "planned_due_date",
};

const COLUMN_ID_MAP: Record<string, string> = {
  Col07RRH5L76X: "deliverable",
  Col00: "completed",
  Col01: "assignee",
  Col02: "due_date",
  Col07RU59RZJQ: "customer",
  Col07RNQJJDRT: "status",
  Col07SEFR2LNL: "remarks",
  Col07REV95K9D: "task_type",
  Col0984KCAVND: "reviewer",
  Col097J451G31: "task_to_be_done",
  Col097ZP8SQJE: "start_date",
  Col0980M8JKHA: "client_rework_count",
  Col09A5HSHPND: "tentative_time",
  Col09BMNN0JK1: "last_edited_time",
  Col0A68174Q4C: "internal_rework_count",
  Col0A5SH02CTH: "completion_date",
  Col0AKDCYQDD1: "planned_due_date",
};

// --- Select option ID → label maps ---

const STATUS_OPTIONS: Record<string, string> = {
  OptQWJFAGCC: "Yet to start",
  OptVECG5M9Q: "Parked",
  OptC4SJU3RN: "In process",
  Opt9J0CA4RR: "Under Review (Internal)",
  Opt6RU4IGVT: "Revision Required (Internal)",
  OptJXV5HIW5: "Under Review (Client)",
  OptY14RX13Z: "Revision Required (Client)",
  OptBIKCJYV4: "Pending Client Input",
  Opt41NZB50C: "Completed",
  OptUQWUV62M: "Unknown Status",
};

const TASK_TYPE_OPTIONS: Record<string, string> = {
  OptGIB2ZF4S: "New",
  OptLY6U2LFP: "BAU",
  Opt4P0DV86W: "Upgrade",
};

const CUSTOMER_OPTIONS: Record<string, string> = {
  "Opt07SEEL2S9W": "Kalyani",
  OptCT6OOK7D: "SGA",
  OptSFPXN4WF: "NFIL",
  OptTNK0YTN3: "JLL",
  OptEHEH1CXL: "SPRL",
  Opt3SWQA11X: "Internal",
  OptAY7FKY1B: "Canara HSBC",
  OptHB5BZKVU: "MFSL",
  Opt177OTJE8: "IPCA",
  Opt19ZK8V1Q: "Gulbrandsen",
  OptEB3KWB9I: "Rustomjee",
  OptITPANZVQ: "Banas",
  OptX22KSSWA: "ADF",
  Opt7DFOE1G0: "Panchshil",
  OptKB1PLJ0X: "Epigral",
  Opt4ZL1J81U: "Indoco",
  OptSWXBDNN2: "Hetero",
  OptLPRDQOCZ: "Metrochem",
  OptQABSA06C: "IGI",
  OptF99CSZZQ: "Modifi",
  OptLN7BW569: "IIT Bombay",
  Opt8QKJIAD2: "TCIL",
  Opt3S049ZBM: "JK Tyre",
  OptXBO0KKDZ: "Panama",
  Opt95T54W4A: "Infra.Market",
  OptRTM5RPP7: "Virupaksha",
  OptPPCBZL60: "Locuz",
  OptXXLXTBCW: "Morphen",
  Opt5ZSTEDNT: "Orange County",
  OptRGHQR8TO: "Novorex",
  OptVVSS0TN0: "Navin Flourine",
  OptB5MOUJUW: "Croda",
  OptYCXRN8UC: "BSI",
  OptO3B8BCZ0: "PSP",
  OptALJGR029: "TVS Eurogrip",
  OptR0VS17BL: "Ventive",
  OptMT0L832B: "Calibre",
  OptTA5F41OA: "Tata consumer products",
  OptZTQTK0IR: "Arene",
  Opt8DEOFM33: "Novex",
  OptZ1H87AHU: "SG Analytics",
  OptD78RHD0Z: "Emmbi Industries",
  OptHRWTD6XJ: "Tecton",
  OptUKM7W11A: "MaxLife",
  OptPHIRTGMH: "Amardeep Design",
  OptGGE9HS2V: "Alembic",
  OptIKU15ZO7: "Abu Dhabi Precast",
  OptORKOMQLV: "Garware",
  OptZIMTW9RO: "AquaChemie",
  Opt5MMY4N7D: "Arine Lifescience",
  OptNW1TEQ6X: "Metrochem",
  OptU3HGKB88: "oren",
  OptD7QN5NLD: "Alliance",
  Opt6LSW9NOU: "Injaz",
  OptSK11FEQ4: "Pratap Snacks",
  Opt4HJIK0IJ: "Aram",
  OptNZJ71UWL: "Deeyar Group",
  Opt2500SIE9: "PMI",
  OptKGRKLQ9P: "BSI Qatar",
  OptEAODC8TI: "Swasthi",
  OptX9G5ZC5L: "Bajaj Auto",
  OptLF6QQJG9: "Bridgestone",
  OptSZKCT10U: "Manan (Dee Piping)",
  OptFP58KB8W: "Artemis",
  OptMSG269FF: "infr",
  OptTKXPFCAT: "Madison and Hiveminds",
  OptHQSCKP31: "Shalimar Paints",
};

// --- Resolve select option IDs to labels ---

function resolveSelectValue(friendlyName: string, value: string): string {
  if (friendlyName === "status") return STATUS_OPTIONS[value] ?? value;
  if (friendlyName === "task_type") return TASK_TYPE_OPTIONS[value] ?? value;
  if (friendlyName === "customer") return CUSTOMER_OPTIONS[value] ?? value;
  return value;
}

// --- Generic Slack API caller ---

async function slackApi(method: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");

  const url = `https://slack.com/api/${method}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

  let res: Response;
  if (body) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } else {
    res = await fetch(url, { headers });
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error (${method}): ${data.error ?? "unknown"}`);
  }
  return data;
}

// --- Parse a single list item into RawTask ---

interface SlackField {
  key?: string;
  column_id?: string;
  value?: unknown;
  text?: string;
  select?: unknown;
  date?: unknown;
  number?: unknown;
  user?: string | string[];
}

function parseListItem(item: Record<string, unknown>): RawTask {
  const parsed: Record<string, unknown> = {};
  const fields = (item.fields ?? []) as SlackField[];

  for (const field of fields) {
    const key = field.key ?? "";
    const columnId = field.column_id ?? "";
    const friendly = COLUMN_KEY_MAP[key] || COLUMN_ID_MAP[columnId] || key;

    if ("select" in field) {
      const rawVal = String(field.value ?? "");
      parsed[friendly] = resolveSelectValue(friendly, rawVal);
    } else if ("text" in field) {
      parsed[friendly] = field.text ?? "";
    } else if ("date" in field) {
      parsed[friendly] = String(field.value ?? "");
    } else if ("number" in field) {
      parsed[friendly] = field.value ?? 0;
    } else if ("user" in field) {
      const users = field.user;
      parsed[friendly] = Array.isArray(users) ? users : users ? [users] : [];
    } else if (key === "people") {
      const val = String(field.value ?? "");
      parsed[friendly] = val ? [val] : [];
    } else if (key === "todo_completed") {
      parsed[friendly] = field.value ?? false;
    } else {
      parsed[friendly] = field.value ?? "";
    }
  }

  // Extract item-level metadata
  const dateCreated = item.date_created ? String(item.date_created) : null;

  // Convert parsed dict to RawTask shape
  const assigneeArr = parsed.assignee as string[] | undefined;
  const assigneeId = Array.isArray(assigneeArr) ? assigneeArr.join(",") : String(parsed.assignee ?? "");
  const tentative = parseFloat(String(parsed.tentative_time ?? "0"));

  // createdTime: prefer the "created_time" column if available, then item-level date_created, then start_date
  const createdTimeRaw = parsed.created_time
    ? String(parsed.created_time)
    : dateCreated
    ? new Date(parseInt(dateCreated) * 1000).toISOString().split("T")[0]
    : null;

  return {
    deliverable: String(parsed.deliverable ?? ""),
    taskDescription: String(parsed.task_to_be_done ?? ""),
    assigneeId,
    startDate: parsed.start_date ? String(parsed.start_date) : null,
    plannedDueDate: parsed.planned_due_date ? String(parsed.planned_due_date) : null,
    dueDate: parsed.due_date ? String(parsed.due_date) : null,
    customer: String(parsed.customer ?? ""),
    taskType: String(parsed.task_type ?? ""),
    status: String(parsed.status ?? ""),
    remarks: String(parsed.remarks ?? ""),
    completed: parsed.completed === true || parsed.completed === "true",
    reviewer: String(parsed.reviewer ?? ""),
    clientReworkCount: parseInt(String(parsed.client_rework_count ?? "0")) || 0,
    tentativeHours: isNaN(tentative) ? 0 : tentative,
    lastEditedTime: parsed.last_edited_time ? String(parsed.last_edited_time) : null,
    internalReworkCount: parseFloat(String(parsed.internal_rework_count ?? "0")) || 0,
    completionDate: parsed.completion_date ? String(parsed.completion_date) : null,
    createdTime: createdTimeRaw,
  };
}

// --- Fetch all items from Activity Tracker list (paginated) ---

export async function fetchActivityTracker(limit = 1000): Promise<RawTask[]> {
  const allItems: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  while (allItems.length < limit) {
    const postBody: Record<string, unknown> = {
      list_id: ACTIVITY_TRACKER_LIST_ID,
      limit: Math.min(limit - allItems.length, 100),
    };
    if (cursor) postBody.cursor = cursor;

    const data = await slackApi("slackLists.items.list", postBody);
    const items = (data.items ?? []) as Record<string, unknown>[];
    allItems.push(...items);

    const meta = data.response_metadata as Record<string, string> | undefined;
    cursor = meta?.next_cursor;
    if (!cursor) break;
  }

  return allItems.map(parseListItem);
}
