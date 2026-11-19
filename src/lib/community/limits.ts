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

// ------------------------------------------------------- Phase 3 limits
//
// Daily caps (per UTC day), stricter for a member's first NEW_MEMBER_DAYS,
// and no links in any Community text. Like the rest of this file,
// firestore.rules repeats every number and limits.test.ts checks.

export const POSTS_PER_DAY = 10;
export const RESPONSES_PER_DAY = 100;
export const VOTES_PER_DAY = 300;
export const NEW_MEMBER_DAYS = 3;
export const NEW_POSTS_PER_DAY = 3;
export const NEW_RESPONSES_PER_DAY = 20;
export const NEW_VOTES_PER_DAY = 50;
export type CountedAction = "post" | "response" | "vote";

/** Within the first NEW_MEMBER_DAYS after joining. */
export function isNewMember(joinedAt: number, now: number): boolean {
  return now < joinedAt + NEW_MEMBER_DAYS * 86_400_000;
}

export function dailyCap(kind: CountedAction, newMember: boolean): number {
  if (kind === "post") return newMember ? NEW_POSTS_PER_DAY : POSTS_PER_DAY;
  if (kind === "response") return newMember ? NEW_RESPONSES_PER_DAY : RESPONSES_PER_DAY;
  return newMember ? NEW_VOTES_PER_DAY : VOTES_PER_DAY;
}

export interface DailyCounts {
  /** UTC day number the counts are for. */
  countDay: number;
  dayPosts: number;
  dayResponses: number;
  dayVotes: number;
}

/** Today's counts (zero if they're from an earlier day). */
export function countsToday(c: Partial<DailyCounts>, now: number): DailyCounts {
  const today = utcDay(now);
  const fresh = c.countDay === today;
  return {
    countDay: today,
    dayPosts: fresh ? (c.dayPosts ?? 0) : 0,
    dayResponses: fresh ? (c.dayResponses ?? 0) : 0,
    dayVotes: fresh ? (c.dayVotes ?? 0) : 0,
  };
}

const FIELD: Record<CountedAction, keyof Omit<DailyCounts, "countDay">> = {
  post: "dayPosts",
  response: "dayResponses",
  vote: "dayVotes",
};

/** How many more of this action are allowed today. */
export function dailyLeft(kind: CountedAction, c: Partial<DailyCounts>, joinedAt: number, now: number): number {
  return Math.max(0, dailyCap(kind, isNewMember(joinedAt, now)) - countsToday(c, now)[FIELD[kind]]);
}

/** The counts after one more of this action today (what the activity record must say). */
export function countAction(kind: CountedAction, c: Partial<DailyCounts>, now: number): DailyCounts {
  const t = countsToday(c, now);
  return { ...t, [FIELD[kind]]: t[FIELD[kind]] + 1 };
}

export function dailyLimitMessage(kind: CountedAction, newMember: boolean): string {
  const cap = dailyCap(kind, newMember);
  const what = kind === "post" ? "posts" : kind === "response" ? "answers, comments and replies" : "votes";
  return `You've reached today's limit of ${cap} ${what}${newMember ? " for new members" : ""}. Please try again tomorrow.`;
}

/**
 * What counts as a link: "http://" or "https://", "www.", or a word ending
 * in a common web domain ("example.com", "bit.ly", "t.me"), in any case.
 * Community text can't contain any. firestore.rules uses this exact pattern
 * (with RE2's (?is) flags), and limits.test.ts checks they match.
 */
export const LINK_PATTERN =
  "(https?://|www[.]|[a-z0-9-][.](com|net|org|edu|gov|info|biz|io|co|me|ly|gl|gg|tv|vn|xyz|app|dev|link|site|online|shop|top|club|live|ru|cn)([^a-z0-9]|$))";
const LINK_RE = new RegExp(LINK_PATTERN, "i");

/** The first word of the text that is (or contains) a link, without surrounding punctuation, or null. */
export function findLink(text: string): string | null {
  const match = LINK_RE.exec(text);
  if (!match) return null;
  const word = text.split(/\s+/).find((w) => LINK_RE.test(w)) ?? match[0];
  return word.replace(/^[("'“‘[<]+/, "").replace(/[)"'”’\]>.,!?;:]+$/, "") || word;
}

/** Why a text can't be posted because of a link, or null. */
export function linkProblem(text: string): string | null {
  const link = findLink(text);
  return link ? `Links aren't allowed in the Community. Please remove “${link}”.` : null;
}
