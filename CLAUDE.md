# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack, port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

## Environment Variables

Set in `.env.local` (not committed):
- `SLACK_BOT_TOKEN` — Slack bot token for live data from Activity Tracker list. If missing, falls back to CSV at `public/data/activity_tracker.csv`.
- `ANTHROPIC_API_KEY` — Required for AI Insights page (`/api/chat` endpoint).

## Architecture

**Next.js 16 App Router** dashboard for delivery team resource planning. React 19, TypeScript 5, Tailwind CSS 4, SWR for data fetching.

### Data Pipeline

```
Slack Activity Tracker List (F07RNQ0BMSR)
    ↓ src/lib/slack-client.ts (paginated fetch, column/option ID resolution)
    ↓ OR src/lib/csv-parser.ts (PapaParse fallback)
    ↓
RawTask → enrichTask() → Task[]  (splits multi-assignee, calculates weekKey, billable flag)
    ↓
/api/data (GET) → SWR hook (use-data.ts) → all page components
```

- `enrichTask()` in `csv-parser.ts` is shared by both Slack and CSV paths
- Multi-assignee tasks split hours evenly across assignees
- Billable = customer !== "Internal"
- Effective date = completion date ?? due date
- Week keys are ISO 8601 format: "2026-W12"

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/slack-client.ts` | Slack API client with column key mappings, select option ID→label maps, pagination |
| `src/lib/csv-parser.ts` | CSV parsing, `enrichTask()`, `resolveAssignee()` (Slack ID → name) |
| `src/lib/data-aggregator.ts` | `aggregateByPersonWeek`, `aggregateByWeek`, `aggregateByClient`, `aggregateByMonth` |
| `src/lib/date-utils.ts` | Date parsing, ISO week keys, week labels ("3rd Aug - 7th Aug" format) |
| `src/lib/constants.ts` | `SLACK_ID_MAP` (5 team members), `CORE_TEAM`, `COLORS`, `DEFAULT_SETTINGS` |
| `src/lib/settings.ts` | localStorage-backed settings with capacity overrides per person/week |
| `src/hooks/use-data.ts` | SWR wrapper for `/api/data`, auto-refreshes hourly |
| `src/hooks/use-settings.ts` | Settings state with localStorage persistence |

### Pages

- `/` — Overview: KPIs, monthly stacked bar chart, team utilisation
- `/weekly` — Weekly utilisation table grouped by month
- `/manager` — Heatmap, capacity gap, hours added/overdue (CSS bar+badge charts)
- `/clients` — Pie chart, stacked bar, sortable client table
- `/tasks` — Filterable task table with saved views (localStorage), two-row filter layout
- `/insights` — Claude-powered analytics chat (currently disabled in nav)
- `/settings` — Capacity defaults, thresholds, overrides

### API Routes

- `GET /api/data` — Returns `{ tasks, meta, lastUpdated, source }`. Tries Slack first, falls back to CSV. `source` is "slack" or "csv".
- `POST /api/chat` — Proxies to Claude API (claude-sonnet-4-20250514) with team data context.

## UI Conventions

- **shadcn/ui** components are base-ui backed (NOT Radix) — `onValueChange` passes `string | null`
- **Theme:** Minimal with colorful charts, oklch indigo-tinted color system, Lato font
- **Dark mode** is the default (next-themes)
- **Filter pattern:** All pages use "Show" dropdown + DateRangePicker. Selecting a dropdown option auto-populates the date range via `syncDateRange()`.
- **Chart style:** Prefer CSS bar+badge pattern (stacked div bars with Badge totals) over Recharts for person-level breakdowns
- **Hours format:** "Xh" suffix (e.g., "3.0h")
- **Week labels:** Date range format "3rd Aug - 7th Aug" (ordinal + month, Monday to Friday)

## Slack Data Model

Status values: Yet to start, Parked, In process, Under Review (Internal), Revision Required (Internal), Under Review (Client), Revision Required (Client), Pending Client Input, Completed

Core team (5 members mapped via SLACK_ID_MAP): Kabir, Abhirup, Olivia, Pulkit, Kushagra

The Slack client resolves raw option IDs to labels for status, task type, and customer fields. Column mappings exist for both `key` and `column_id` formats since Slack returns either.
