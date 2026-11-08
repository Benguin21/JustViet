/**
 * The XP ledger's vocabulary: what earns XP, how much, and the one id each award is filed under.
 *
 * Every XP change is an event, written once and never edited or deleted (firestore.rules):
 *
 *   users/{uid}/xpEvents/{id}  one per award: activity XP (a Vocab card, a Grammar lesson or
 *                              review, a Reading or Listening activity) or a daily goal's bonus
 *                              being claimed or unclaimed
 *   users/{uid}/xp/total       the running total, moved by exactly one event per write
 *   users/{uid}/days/{day}     the day's goal record: targets locked for the day, claims and the
 *                              bonus each one holds, the flashcard XP count, Grammar and Skills
 *                              completions, plus Home's own bookkeeping (dishes, lines said)
 *
 * The id is built from the verified completion it pays for (vocab_2026-11-8_<cardId>), so the
 * same completion can only ever be paid once: a refresh, a double click, a network retry or a
 * second tab all land on an id that already exists and change nothing.
 */
import type { GoalId } from "@/lib/companion/goals";

export type ActivityKind = "vocab.card" | "grammar.new" | "grammar.review" | "skills.reading" | "skills.listening";
export type BonusKind = "goal.claim" | "goal.unclaim";
export type EventKind = ActivityKind | BonusKind;

/** XP per verified activity. Goal bonuses come from the goal's tier (see goalTier). */
export const ACTIVITY_XP: Record<ActivityKind, number> = {
  "vocab.card": 1,
  "grammar.new": 50,
  "grammar.review": 10,
  "skills.reading": 30,
  "skills.listening": 30,
};

/** Flashcard XP stops for the day after this many cards (studying carries on, just without XP). */
export const FLASHCARD_XP_CAP = 100;

/** Which goal each activity counts towards. */
export const ACTIVITY_GOAL: Record<ActivityKind, GoalId> = {
  "vocab.card": "vocab",
  "grammar.new": "grammar",
  "grammar.review": "grammar",
  "skills.reading": "skills",
  "skills.listening": "skills",
};

export interface XpEvent {
  id: string;
  uid: string;
  kind: EventKind;
  /** XP this event adds (negative for an unclaim). */
  amount: number;
  /** The local day it counts for (see day.ts). */
  day: string;
  /**
   * The verified record it pays for: the Vocab review log's id, the lesson or activity id, or for
   * a goal bonus the goal it is for.
   */
  source: string;
  card?: string;
  lesson?: string;
  activity?: string;
  goal?: GoalId;
  /** A goal's claims and unclaims that day, numbered: odd claims, even unclaims. */
  seq?: number;
  /** For an unclaim: the claim event whose bonus it takes back. */
  reverses?: string;
}

/** Lesson and activity ids go into document ids, so they keep to a safe alphabet. */
export function isSourceId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(id);
}

export const vocabEventId = (day: string, cardId: string) => `vocab_${day}_${cardId}`;
/** A lesson is new once, ever: reopening it later is a review. */
export const grammarNewId = (lessonId: string) => `grammar-new_${lessonId}`;
/** A lesson reviewed counts once a day. */
export const grammarReviewId = (day: string, lessonId: string) => `grammar-review_${day}_${lessonId}`;
/** A Reading or Listening activity counts once a day. */
export const skillEventId = (kind: "skills.reading" | "skills.listening", day: string, activityId: string) =>
  `${kind === "skills.reading" ? "reading" : "listening"}_${day}_${activityId}`;
export const claimEventId = (day: string, goal: GoalId, seq: number) => `goal_${day}_${goal}_${seq}`;
