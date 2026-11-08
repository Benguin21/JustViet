/**
 * Daily learning goals and their bonus XP: business rules only, no UI.
 *
 * Four things are kept apart on purpose:
 *   1. Progress     what the learner actually did today (new Vocab cards studied, Grammar
 *                   lessons and reviews, Reading and Listening). Read-only here.
 *   2. Eligibility  whether that progress meets today's target. This unlocks feeding Rồng Con.
 *   3. Claims       whether they ticked an eligible goal to feed Rồng Con. Unticking only drops
 *                   the claim; progress is never touched.
 *   4. Bonus XP     what a claimed goal is worth: set by the target's difficulty tier (goalTier),
 *                   never by how much more was done. Activity XP (a card, a lesson) is separate
 *                   and lives in src/lib/xp.
 *
 * Ported from the HomeDraft prototype on the JustViet design canvas.
 */

export type GoalId = "vocab" | "grammar" | "skills";
export type PerGoal<T> = Record<GoalId, T>;

/** The three daily goals, in their fixed order. */
export const GOAL_IDS: readonly GoalId[] = ["vocab", "grammar", "skills"];

export interface GoalDef {
  id: GoalId;
  section: string;
  href: string;
  one: string;
  many: string;
  verb: string;
}

export const GOAL_DEFS: PerGoal<GoalDef> = {
  vocab: { id: "vocab", section: "Vocab SRS", href: "/vocab-srs", one: "new word", many: "new words", verb: "studied" },
  grammar: { id: "grammar", section: "Grammar", href: "/grammar", one: "lesson", many: "lessons", verb: "completed" },
  skills: { id: "skills", section: "Skills", href: "/skills", one: "activity", many: "activities", verb: "completed" },
};

/** Which goals the learner switched on, and their own daily targets. */
export interface GoalSettings {
  enabled: PerGoal<boolean>;
  targets: PerGoal<number>;
}

/** Each goal's daily target range (the Goals tab's sliders), in whole steps. */
export const TARGET_LIMITS: PerGoal<{ fallback: number; min: number; max: number }> = {
  vocab: { fallback: 5, min: 1, max: 50 },
  grammar: { fallback: 1, min: 1, max: 5 },
  skills: { fallback: 1, min: 1, max: 5 },
};

/**
 * Grammar and Skills have no pages yet, so only Vocab is on until they exist.
 */
export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  enabled: { vocab: true, grammar: false, skills: false },
  targets: { vocab: 5, grammar: 1, skills: 1 },
};

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  let n = Math.round(Number(value));
  if (!Number.isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

/** Fills in and clamps whatever was saved, so the rest of the code can trust it. */
export function normalizeGoalSettings(raw: unknown): GoalSettings {
  const r = (raw ?? {}) as { enabled?: Partial<Record<GoalId, unknown>>; targets?: Partial<Record<GoalId, unknown>> };
  const enabled = {} as PerGoal<boolean>;
  const targets = {} as PerGoal<number>;
  for (const id of GOAL_IDS) {
    const on = r.enabled?.[id];
    enabled[id] = typeof on === "boolean" ? on : DEFAULT_GOAL_SETTINGS.enabled[id];
    const lim = TARGET_LIMITS[id];
    targets[id] = clampInt(r.targets?.[id] ?? DEFAULT_GOAL_SETTINGS.targets[id], lim.fallback, lim.min, lim.max);
  }
  return { enabled, targets };
}

/** The goals switched on, always in the fixed order (Vocab SRS, Grammar, Skills). */
export function activeGoals(settings: GoalSettings): GoalId[] {
  return GOAL_IDS.filter((id) => settings.enabled[id]);
}

/**
 * Today's verified progress per goal: Vocab counts the new cards studied (a card's first ever
 * review), Grammar its lessons and reviews, Skills its Reading and Listening activities.
 */
export type Progress = PerGoal<number>;

/**
 * Vocab progress from today's Vocab SRS review log: the cards that were new when reviewed, each
 * once, so re-rating a card through its learning steps never counts twice and reviews of older
 * cards don't count. Grammar and Skills come from their own completion counts.
 */
export function progressFromReviews(
  todaysLogs: readonly { cardId: string; priorState?: string }[],
  done: { grammar: number; skills: number } = { grammar: 0, skills: 0 },
): Progress {
  const fresh = new Set(todaysLogs.filter((l) => l.priorState === "new").map((l) => l.cardId));
  return { vocab: fresh.size, grammar: done.grammar, skills: done.skills };
}

export function checkEligibility(targets: PerGoal<number>, progress: Progress): PerGoal<boolean> {
  return {
    vocab: progress.vocab >= targets.vocab,
    grammar: progress.grammar >= targets.grammar,
    skills: progress.skills >= targets.skills,
  };
}

export type TierName = "Starter" | "Small" | "Medium" | "Big";
export interface GoalTier {
  name: TierName;
  bonus: number;
}

export const TIER_BONUS: Record<TierName, number> = { Starter: 0, Small: 10, Medium: 20, Big: 30 };

/**
 * A goal's difficulty, from the target the learner chose (not from what they went on to do):
 *   Grammar, Skills  1 Small, 2 Medium, 3-5 Big
 *   Vocab            1-4 Starter (no bonus), 5-9 Small, 10-14 Medium, 15-50 Big
 * firestore.rules repeats this table to check every bonus written.
 */
export function goalTier(id: GoalId, target: number): GoalTier {
  const t = Math.floor(target);
  let name: TierName;
  if (id === "vocab") name = t >= 15 ? "Big" : t >= 10 ? "Medium" : t >= 5 ? "Small" : "Starter";
  else name = t >= 3 ? "Big" : t === 2 ? "Medium" : "Small";
  return { name, bonus: TIER_BONUS[name] };
}

export function goalBonus(id: GoalId, target: number): number {
  return goalTier(id, target).bonus;
}

/** Today's bonus XP per goal, from targets, progress and claims. A claim counts only while eligible. */
export function xpEntitlement(targets: PerGoal<number>, progress: Progress, claims: PerGoal<boolean>): PerGoal<number> {
  const ok = checkEligibility(targets, progress);
  const out = {} as PerGoal<number>;
  for (const id of GOAL_IDS) out[id] = claims[id] && ok[id] ? goalBonus(id, targets[id]) : 0;
  return out;
}

export function sumXp(x: PerGoal<number>): number {
  return x.vocab + x.grammar + x.skills;
}
