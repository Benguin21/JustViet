/**
 * The learner's local calendar day, which XP, the flashcard cap, goal claims and Rồng Con's
 * daily menu all run on.
 *
 * A day is counted in the learner's established time zone: the first one the app saw them in,
 * saved with their goals (settings/goals → timeZone). Every device then agrees on when the day
 * starts, so opening JustViet on a device set to another zone can't start a new day (and a fresh
 * flashcard cap) early. Day keys are 'YYYY-M-D' with no padding, which is also the menu's seed.
 */

/** This device's IANA time zone (say "America/Los_Angeles"), or UTC if it can't tell. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The local calendar day of a Date on this device, as 'YYYY-M-D'. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar day at `ms` in `timeZone` (this device's own when not given), as 'YYYY-M-D'. */
export function dayKeyIn(ms: number, timeZone?: string): string {
  if (!timeZone || !isTimeZone(timeZone)) return localDayKey(new Date(ms));
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" });
    formatters.set(timeZone, f);
  }
  const parts: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(ms))) parts[p.type] = p.value;
  return `${Number(parts.year)}-${Number(parts.month)}-${Number(parts.day)}`;
}

/** A day key's shape, as the rules check it. */
export function isDayKey(day: unknown): day is string {
  return typeof day === "string" && /^\d{4}-\d{1,2}-\d{1,2}$/.test(day);
}
