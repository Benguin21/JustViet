/**
 * Turns a user's full card list (+ today's review logs) into what the UI
 * actually needs to show: the study queue for right now, dashboard
 * counts, a due-date forecast, and a review heatmap. Also pure — no
 * Firestore, no React — so it's testable the same way `srs.ts` is.
 */
import { addDays, effectiveStatus, isDue, startOfDay } from "./srs";
import type { CardStatus, ReviewLogEntry, SrsSettings, VocabCard } from "./types";

/** Anki's convention: a review card graduates to "mature" once its interval is >= 21 days. */
const MATURE_THRESHOLD_DAYS = 21;

/** Mon=0 .. Sun=6, matching the heatmap's week-row order (JS's `Date#getDay` is Sun=0..Sat=6). */
function mondayIndexedWeekday(ms: number): number {
  return (new Date(ms).getDay() + 6) % 7;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

export interface DailyBudget {
  newRemaining: number;
  reviewsRemaining: number;
  newDoneToday: number;
  reviewsDoneToday: number;
}

/** How much of today's new/review budget is left, based on today's review logs. */
export function computeDailyBudget(
  todaysLogs: ReviewLogEntry[],
  settings: SrsSettings,
): DailyBudget {
  const newDoneToday = todaysLogs.filter((l) => l.priorState === "new").length;
  const reviewsDoneToday = todaysLogs.filter(
    (l) => l.priorState === "review" || l.priorState === "relearning",
  ).length;

  return {
    newDoneToday,
    reviewsDoneToday,
    newRemaining: Math.max(0, settings.maxNewPerDay - newDoneToday),
    reviewsRemaining: Math.max(0, settings.maxReviewsPerDay - reviewsDoneToday),
  };
}

export interface BuildQueueOptions {
  now?: number;
  todaysLogs: ReviewLogEntry[];
}

/**
 * Builds the ordered list of cards to show in a study session, respecting
 * daily limits, new-card order, and whether new cards are mixed in with
 * reviews. Cards already mid-way through learning/relearning are always
 * included when due — they're "in flight" and not subject to daily caps.
 */
export function buildStudyQueue(
  cards: VocabCard[],
  settings: SrsSettings,
  { now = Date.now(), todaysLogs }: BuildQueueOptions,
): VocabCard[] {
  const budget = computeDailyBudget(todaysLogs, settings);
  const due = cards.filter((c) => isDue(c, now));

  const inFlight = due
    .filter((c) => c.state === "learning" || c.state === "relearning")
    .sort((a, b) => a.due - b.due);

  let fresh = due.filter((c) => c.state === "new");
  fresh =
    settings.newCardOrder === "random"
      ? shuffle(fresh)
      : [...fresh].sort((a, b) => a.createdAt - b.createdAt);
  fresh = fresh.slice(0, budget.newRemaining);

  const reviews = due
    .filter((c) => c.state === "review")
    .sort((a, b) => a.due - b.due)
    .slice(0, budget.reviewsRemaining);

  const restQueue = settings.mixNewWithReviews
    ? interleave(fresh, reviews)
    : [...reviews, ...fresh];

  return [...inFlight, ...restQueue].slice(0, settings.maxCardsPerSession);
}

export interface TodayStats {
  due: number;
  new: number;
  reviews: number;
}

/** Counts of cards due right now, split by whether they're new or already in the SRS. */
export function computeTodayStats(cards: VocabCard[], now: number = Date.now()): TodayStats {
  const due = cards.filter((c) => isDue(c, now));
  const newCount = due.filter((c) => c.state === "new").length;
  return { due: due.length, new: newCount, reviews: due.length - newCount };
}

export interface ProgressStats {
  total: number;
  learning: number;
  mature: number;
  suspended: number;
}

/** A coarse breakdown of the whole collection for the progress summary. */
export function computeProgressStats(cards: VocabCard[]): ProgressStats {
  let suspended = 0;
  let mature = 0;
  for (const card of cards) {
    if (card.suspended) {
      suspended++;
    } else if (card.state === "review" && card.scheduledDays >= MATURE_THRESHOLD_DAYS) {
      mature++;
    }
  }
  return {
    total: cards.length,
    suspended,
    mature,
    learning: cards.length - suspended - mature,
  };
}

export interface ForecastDay {
  date: number;
  count: number;
}

/** How many (non-suspended) cards fall due on each of the next `days` days. */
export function computeForecast(
  cards: VocabCard[],
  now: number = Date.now(),
  days = 14,
): ForecastDay[] {
  const today = startOfDay(now);
  const buckets = new Map<number, number>();
  // addDays (calendar arithmetic), not `+ i * DAY_MS` — a DST day isn't
  // exactly 24 wall-clock hours, so fixed-duration math can land a bucket
  // key on the wrong local midnight right around the transition. Same fix
  // as computeReviewHeatmap.
  for (let i = 0; i < days; i++) buckets.set(addDays(today, i), 0);

  for (const card of cards) {
    if (card.suspended) continue;
    const day = startOfDay(card.due);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export interface HeatmapDay {
  date: number;
  count: number;
}

/**
 * How many reviews were logged on each of the last `days` days, oldest
 * first — plus `null` padding at the start so the array lines up into a
 * proper Mon-Sun grid: index 0 is always a Monday row, regardless of which
 * weekday the oldest day in the window happens to fall on (this is what
 * lets the UI show real weekday labels next to each row; a plain
 * "days ago" list has no fixed relationship to the calendar week). Uses
 * `addDays` (calendar arithmetic) rather than `± i * DAY_MS` so bucketing
 * stays correct across a daylight-saving transition, where a "day" isn't
 * exactly 24 hours of wall-clock time.
 */
export function computeReviewHeatmap(
  logs: ReviewLogEntry[],
  now: number = Date.now(),
  days = 98,
): (HeatmapDay | null)[] {
  const today = startOfDay(now);
  const oldest = addDays(today, -(days - 1));

  const counts = new Map<number, number>();
  for (const log of logs) {
    const day = startOfDay(log.reviewedAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const cells: (HeatmapDay | null)[] = new Array(mondayIndexedWeekday(oldest)).fill(null);
  for (let i = 0; i < days; i++) {
    const date = addDays(oldest, i);
    cells.push({ date, count: counts.get(date) ?? 0 });
  }
  return cells;
}

/**
 * Average cards studied per day over the given window, counting every day
 * in the window (including zero-activity days) — not just days with
 * activity. E.g. 20/0/40 across three days averages to 20/day, not 30.
 */
export function computeDailyAverage(heatmap: (HeatmapDay | null)[]): number {
  const real = heatmap.filter((cell): cell is HeatmapDay => cell !== null);
  if (real.length === 0) return 0;
  const total = real.reduce((sum, cell) => sum + cell.count, 0);
  return total / real.length;
}

export interface StudyStreaks {
  current: number;
  longest: number;
}

/**
 * Current and longest consecutive-day study streaks, computed from the
 * *complete* set of review logs passed in (not a windowed/displayed
 * subset — callers should pass the full history they have access to).
 * A day counts if at least one review was logged on it, regardless of
 * rating or how many reviews.
 */
export function computeStudyStreaks(
  logs: ReviewLogEntry[],
  now: number = Date.now(),
): StudyStreaks {
  const studyDays = new Set<number>();
  for (const log of logs) studyDays.add(startOfDay(log.reviewedAt));

  // Current streak ends today if today has activity; otherwise it ends
  // yesterday — today isn't over yet, so not having studied *yet* today
  // shouldn't read as a broken streak.
  let cursor = startOfDay(now);
  if (!studyDays.has(cursor)) cursor = addDays(cursor, -1);
  let current = 0;
  while (studyDays.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sortedDays = Array.from(studyDays).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previousDay: number | null = null;
  for (const day of sortedDays) {
    run = previousDay !== null && day === addDays(previousDay, 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
    previousDay = day;
  }

  // The current streak's days are always a subset of `sortedDays`, so this
  // is normally a no-op — kept as a cheap guarantee that "longest" never
  // under-reports an in-progress streak.
  return { current, longest: Math.max(longest, current) };
}

export interface HeatmapMonthLabel {
  /** Index into the heatmap's week-columns (i.e. `Math.floor(cellIndex / 7)`). */
  columnIndex: number;
  label: string;
}

/**
 * Where to place month labels under a heatmap grid: one label per month,
 * positioned at the first column that contains a day from that month.
 * Computed from the actual cell dates (not hardcoded positions), so it
 * naturally handles any window length and year boundaries.
 */
export function computeHeatmapMonthLabels(heatmap: (HeatmapDay | null)[]): HeatmapMonthLabel[] {
  const labels: HeatmapMonthLabel[] = [];
  let lastMonthKey: string | null = null;

  for (let i = 0; i < heatmap.length; i++) {
    const cell = heatmap[i];
    if (!cell) continue;

    const d = new Date(cell.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthKey !== lastMonthKey) {
      labels.push({ columnIndex: Math.floor(i / 7), label: d.toLocaleDateString(undefined, { month: "short" }) });
      lastMonthKey = monthKey;
    }
  }

  return labels;
}

export function statusLabel(status: CardStatus): string {
  switch (status) {
    case "new":
      return "New";
    case "learning":
      return "Learning";
    case "review":
      return "Review";
    case "relearning":
      return "Relearning";
    case "suspended":
      return "Suspended";
  }
}

export { effectiveStatus };
