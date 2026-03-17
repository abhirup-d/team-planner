export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr === "NaN" || dateStr.trim() === "") return null;

  const cleaned = dateStr.trim();

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // Handle M/D/YY or MM/DD/YY with time
  const parts = cleaned.split(",")[0].trim();
  const match = parts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getWeekLabel(weekKey: string): string {
  const monday = getWeekMonday(weekKey);
  const friday = new Date(monday.getTime());
  friday.setUTCDate(monday.getUTCDate() + 4);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monStr = `${ordinal(monday.getUTCDate())} ${monthNames[monday.getUTCMonth()]}`;
  const friStr = `${ordinal(friday.getUTCDate())} ${monthNames[friday.getUTCMonth()]}`;
  return `${monStr} - ${friStr}`;
}

export function getWeekMonday(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime());
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

export function sortWeekKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const [ay, aw] = a.split("-W").map(Number);
    const [by, bw] = b.split("-W").map(Number);
    return ay !== by ? ay - by : aw - bw;
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function getMonthKey(weekKey: string): string {
  const monday = getWeekMonday(weekKey);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(month) - 1]} ${year}`;
}
