/**
 * Daily learning goals and the XP they earn — business rules only, no UI.
 *
 * Four things are kept apart on purpose:
 *   1. Progress     what the learner actually did today (Vocab SRS reviews, finished
 *                   lessons). Read-only here; nothing on Home can change it.
 *   2. Eligibility  whether that progress meets the learner's own daily target.
 *                   This is what unlocks feeding Rồng Con.
 *   3. Claims       whether they ticked an eligible goal to feed Rồng Con. Unticking
 *                   only drops the claim; progress is never touched.
 *   4. XP ledger    the XP recorded for each goal today (see `ledger.ts`). It is always
 *                   re-derived from 1–3 and only the difference is applied, so clicks,
 *                   refreshes and animations can never mint XP on their own.
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
  vocab: { id: "vocab", section: "Vocab SRS", href: "/vocab-srs", one: "word", many: "words", verb: "studied" },
  grammar: { id: "grammar", section: "Grammar", href: "/grammar", one: "lesson", many: "lessons", verb: "completed" },
  skills: {
    id: "skills",
    section: "Skills",
    href: "/skills",
    one: "practice session",
    many: "practice sessions",
    verb: "completed",
  },
};

/** Which goals the learner switched on, and their own daily targets. */
export interface GoalSettings {
  enabled: PerGoal<boolean>;
  targets: PerGoal<number>;
}

const TARGET_LIMITS: PerGoal<{ fallback: number; min: number; max: number }> = {
  vocab: { fallback: 5, min: 1, max: 50 },
  grammar: { fallback: 1, min: 1, max: 10 },
  skills: { fallback: 1, min: 1, max: 10 },
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

/** Today's verified progress per goal (vocab = unique cards reviewed today). */
export type Progress = PerGoal<number>;

export function checkEligibility(targets: PerGoal<number>, progress: Progress): PerGoal<boolean> {
  return {
    vocab: progress.vocab >= targets.vocab,
    grammar: progress.grammar >= targets.grammar,
    skills: progress.skills >= targets.skills,
  };
}

/**
 * Grammar and Skills are worth 10 XP when claimed. Vocab is tiered by unique words
 * studied, whatever the learner's target: under 5 words earns 0 XP even when feeding is
 * unlocked, then 10, 15 and 20 XP (the daily max). Tiers are totals, not stacking bonuses.
 */
export const XP_PER_GOAL = 10;
export const VOCAB_TIERS: readonly { at: number; total: number }[] = [
  { at: 5, total: 10 },
  { at: 10, total: 15 },
  { at: 16, total: 20 },
];

export function vocabTier(words: number): number {
  let total = 0;
  for (const t of VOCAB_TIERS) if (words >= t.at) total = t.total;
  return total;
}

/** How many more words reach the next vocab tier, and how much XP it adds; null at the top. */
export function nextVocabTier(words: number): { more: number; gain: number } | null {
  const now = vocabTier(words);
  for (const t of VOCAB_TIERS) if (words < t.at) return { more: t.at - words, gain: t.total - now };
  return null;
}

/** Today's XP per goal, from progress and claims only. A claim counts only while eligible. */
export function xpEntitlement(targets: PerGoal<number>, progress: Progress, claims: PerGoal<boolean>): PerGoal<number> {
  const ok = checkEligibility(targets, progress);
  return {
    vocab: claims.vocab && ok.vocab ? vocabTier(progress.vocab) : 0,
    grammar: claims.grammar && ok.grammar ? XP_PER_GOAL : 0,
    skills: claims.skills && ok.skills ? XP_PER_GOAL : 0,
  };
}

export function sumXp(x: PerGoal<number>): number {
  return x.vocab + x.grammar + x.skills;
}
