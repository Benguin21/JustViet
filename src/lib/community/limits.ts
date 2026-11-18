/**
 * Every Community limit in one place. firestore.rules repeats each of these
 * (it can't import them), and `limits.test.ts` reads the rules file to check
 * the two still agree, so change both together.
 *
 * Text lengths are measured like the rules measure them: UTF-16 code units
 * of the cleaned (NFC, trimmed) text, i.e. JavaScript's `.length`. Every
 * Vietnamese letter counts as 1; an emoji counts as 2.
 */

export const TITLE_MIN = 10;
export const TITLE_MAX = 150;
export const BODY_MIN = 20;
export const BODY_MAX = 5000;
export const RESPONSE_MIN = 1;
export const RESPONSE_MAX = 5000;
export const REPLY_MAX = 1000;
export const REPORT_NOTE_MAX = 500;

/** Seconds between two posts, between two responses/replies, and between two votes. */
export const POST_INTERVAL_S = 60;
export const RESPONSE_INTERVAL_S = 15;
export const VOTE_INTERVAL_S = 2;
/** Reports per UTC day. */
export const REPORTS_PER_DAY = 20;

/** A community name can be changed at most once in this many days. */
export const RENAME_DAYS = 30;
/** "Edited" shows only for edits made more than this long after posting. */
export const EDIT_GRACE_MS = 5 * 60 * 1000;

/** Search tokens stored per post (see search.ts). Words past the cap aren't searchable. */
export const MAX_TOKENS = 500;
/** Longest word prefix stored as a token. */
export const MAX_PREFIX = 12;

/** Feed page size ("Load more" fetches this many again). */
export const FEED_PAGE = 20;

const DAY_MS = 86_400_000;

/** The UTC day number the rules use for the daily report count. */
export function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/** Whole seconds still to wait before the next action of a kind (0 = go ahead). */
export function waitSeconds(lastMs: number | null, nowMs: number, intervalS: number): number {
  if (lastMs == null) return 0;
  const remaining = lastMs + intervalS * 1000 - nowMs;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Reports the member can still send today. */
export function reportsLeft(reportDay: number, reports: number, nowMs: number): number {
  const used = reportDay === utcDay(nowMs) ? reports : 0;
  return Math.max(0, REPORTS_PER_DAY - used);
}

/** "Please wait 1 second" / "Please wait 12 seconds". */
export function pleaseWait(seconds: number): string {
  return `Please wait ${seconds} second${seconds === 1 ? "" : "s"}.`;
}
