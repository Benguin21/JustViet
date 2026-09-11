/**
 * Turns a user's full card list (+ today's review logs) into what the UI
 * actually needs to show: the study queue for right now, dashboard
 * counts, a due-date forecast, and a review heatmap. Also pure — no
 * Firestore, no React — so it's testable the same way `srs.ts` is.
 */
import { effectiveStatus, isDue, startOfDay } from "./srs";
import type { CardStatus, ReviewLogEntry, SrsSettings, VocabCard } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Anki's convention: a review card graduates to "mature" once its interval is >= 21 days. */
const MATURE_THRESHOLD_DAYS = 21;

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
  for (let i = 0; i < days; i++) buckets.set(today + i * DAY_MS, 0);

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

/** How many reviews were logged on each of the last `days` days, oldest first. */
export function computeReviewHeatmap(
  logs: ReviewLogEntry[],
  now: number = Date.now(),
  days = 98,
): HeatmapDay[] {
  const today = startOfDay(now);
  const buckets = new Map<number, number>();
  for (let i = days - 1; i >= 0; i--) buckets.set(today - i * DAY_MS, 0);

  for (const log of logs) {
    const day = startOfDay(log.reviewedAt);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
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
