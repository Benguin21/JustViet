/**
 * The SRS scheduling engine. Wraps `ts-fsrs` (an implementation of FSRS —
 * Free Spaced Repetition Scheduler, the algorithm modern Anki uses in
 * place of the older SM-2 family) so the rest of the app never touches the
 * library directly.
 *
 * This module is pure: no Firestore, no React, no wall-clock reads except
 * through an explicit `now` parameter. That's what makes it independently
 * unit-testable (see `srs.test.ts`) and swappable later if the algorithm
 * ever needs to change.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from "ts-fsrs";
import type { CardRating, CardState, CardStatus, SrsFields, SrsSettings } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const RATING_TO_FSRS: Record<CardRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_FSRS: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const FSRS_TO_STATE: Record<number, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

/** Returns the freshly-initialized SRS fields for a brand-new card. */
export function createNewCardFields(now: Date = new Date()): SrsFields {
  const empty = createEmptyCard(now);
  return {
    state: "new",
    suspended: false,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    scheduledDays: empty.scheduled_days,
    lastReview: null,
    reviewCount: 0,
    lapseCount: 0,
    fsrsLearningSteps: empty.learning_steps,
  };
}

/** The status shown in the UI, folding the `suspended` flag into one label. */
export function effectiveStatus(card: SrsFields): CardStatus {
  return card.suspended ? "suspended" : card.state;
}

export function isDue(card: SrsFields, now: number = Date.now()): boolean {
  return !card.suspended && card.due <= now;
}

function buildFsrsInstance(settings: SrsSettings): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: settings.desiredRetention,
      maximum_interval: settings.maximumInterval,
      enable_fuzz: settings.enableFuzz,
      enable_short_term: true,
      learning_steps: settings.learningSteps as unknown as never,
      relearning_steps: settings.relearningSteps as unknown as never,
    }),
  );
}

function toFsrsCard(card: SrsFields): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: card.scheduledDays,
    learning_steps: card.fsrsLearningSteps,
    reps: card.reviewCount,
    lapses: card.lapseCount,
    state: STATE_TO_FSRS[card.state],
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

/**
 * Applies the min/max-interval bounds and recomputes `due` if either
 * changed the interval. FSRS's own `maximum_interval` parameter already
 * bounds intervals internally, but we enforce it again here explicitly so
 * the "Maximum interval" setting is a hard guarantee from the app's point
 * of view, not just an internal library detail.
 */
function clampGraduatedInterval(
  scheduledDays: number,
  dueAt: number,
  now: number,
  minDays: number,
  maxDays: number,
): { scheduledDays: number; due: number } {
  const clamped = Math.min(maxDays, Math.max(minDays, scheduledDays));
  if (clamped === scheduledDays) return { scheduledDays, due: dueAt };
  return { scheduledDays: clamped, due: now + clamped * DAY_MS };
}

function fromFsrsCard(
  before: SrsFields,
  after: FsrsCard,
  settings: SrsSettings,
  now: number,
): SrsFields {
  const resultState = FSRS_TO_STATE[after.state];
  let scheduledDays = after.scheduled_days;
  let due = after.due.getTime();

  if (resultState === "review") {
    const cameFromLapse = before.state === "relearning";
    const minDays = cameFromLapse
      ? settings.minimumIntervalAfterLapse
      : settings.minimumInterval;
    ({ scheduledDays, due } = clampGraduatedInterval(
      scheduledDays,
      due,
      now,
      minDays,
      settings.maximumInterval,
    ));
  }

  return {
    state: resultState,
    suspended: before.suspended,
    due,
    stability: after.stability,
    difficulty: after.difficulty,
    scheduledDays,
    lastReview: now,
    reviewCount: after.reps,
    lapseCount: after.lapses,
    fsrsLearningSteps: after.learning_steps,
  };
}

export interface IntervalPreview {
  rating: CardRating;
  dueAt: number;
  scheduledDays: number;
  /** Human-readable interval, e.g. "10 min", "4 days", "1.2 mo". */
  label: string;
}

/**
 * Previews the resulting due date for all four ratings without persisting
 * anything — this is what powers the "Again — 10m / Hard — 1d / …" labels
 * on the study screen's rating buttons.
 */
export function previewIntervals(
  card: SrsFields,
  settings: SrsSettings,
  now: Date = new Date(),
): Record<CardRating, IntervalPreview> {
  const engine = buildFsrsInstance(settings);
  const fsrsCard = toFsrsCard(card);
  const recordLog = engine.repeat(fsrsCard, now);

  const result = {} as Record<CardRating, IntervalPreview>;
  for (const rating of ["again", "hard", "good", "easy"] as const) {
    const item = recordLog[RATING_TO_FSRS[rating]];
    const after = fromFsrsCard(card, item.card, settings, now.getTime());
    result[rating] = {
      rating,
      dueAt: after.due,
      scheduledDays: after.scheduledDays,
      label: formatInterval(after.due - now.getTime()),
    };
  }
  return result;
}

export interface ReviewResult {
  card: SrsFields;
  log: {
    rating: CardRating;
    priorState: CardState;
    resultState: CardState;
    reviewedAt: number;
    scheduledDays: number;
    stabilityAfter: number;
    difficultyAfter: number;
  };
}

/** Applies a single rating to a card, returning its updated SRS fields + a review log entry. */
export function applyReview(
  card: SrsFields,
  rating: CardRating,
  settings: SrsSettings,
  now: Date = new Date(),
): ReviewResult {
  const engine = buildFsrsInstance(settings);
  const fsrsCard = toFsrsCard(card);
  const { card: updated, log } = engine.next(fsrsCard, now, RATING_TO_FSRS[rating]);
  const nextFields = fromFsrsCard(card, updated, settings, now.getTime());

  return {
    card: nextFields,
    log: {
      rating,
      priorState: card.state,
      resultState: nextFields.state,
      reviewedAt: now.getTime(),
      scheduledDays: nextFields.scheduledDays,
      stabilityAfter: log.stability,
      difficultyAfter: log.difficulty,
    },
  };
}

/**
 * Recomputes just the `due` date for a review-state card from its current
 * stability under a (possibly new) desired-retention target, without
 * touching its review history. Used by the settings screen's "apply new
 * retention to existing cards" action — a lightweight reschedule, not a
 * full re-optimization (see README notes on FSRS parameter optimization).
 */
export function rescheduleForRetention(
  card: SrsFields,
  settings: SrsSettings,
  now: number = Date.now(),
): SrsFields {
  if (card.state !== "review" || card.stability <= 0) return card;
  // FSRS's forgetting curve: R(t) = (1 + t/(9*S))^-1, solved for t at R = desired retention.
  const days = 9 * card.stability * (1 / settings.desiredRetention - 1);
  const scheduledDays = Math.min(
    settings.maximumInterval,
    Math.max(settings.minimumInterval, Math.round(days)),
  );
  return { ...card, scheduledDays, due: now + scheduledDays * DAY_MS };
}

export function formatInterval(ms: number): string {
  if (ms <= 60_000) return "<1 min";
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = ms / 3_600_000;
  if (hours < 24) return `${Math.round(hours)} hr`;
  const days = ms / DAY_MS;
  if (days < 30) {
    const rounded = Math.round(days);
    return `${rounded} ${rounded === 1 ? "day" : "days"}`;
  }
  const months = days / 30.44;
  if (months < 12) return `${Math.round(months * 10) / 10} mo`;
  const years = days / 365.25;
  return `${Math.round(years * 10) / 10} yr`;
}

export function formatDueDate(dueAt: number, now: number = Date.now()): string {
  const dueDay = startOfDay(dueAt);
  const today = startOfDay(now);
  const diffDays = Math.round((dueDay - today) / DAY_MS);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return new Date(dueAt).toLocaleDateString(undefined, { weekday: "long" });
  return new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
