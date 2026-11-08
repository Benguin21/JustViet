/**
 * The XP ledger's rules as pure functions: given what is stored now, what one award (or goal
 * claim) writes. The repository runs each plan inside a Firestore transaction, so two tabs or
 * devices acting at once are applied one after the other, and firestore.rules re-checks every
 * write against the same rules. Nothing here touches Firestore, so it is all unit tested.
 *
 * A plan is null when there is nothing to write: the completion was already paid, the day's
 * flashcard cap is reached, or the goal is already in the state asked for.
 */
import {
  GOAL_IDS,
  TARGET_LIMITS,
  clampInt,
  goalBonus,
  normalizeGoalSettings,
  type GoalId,
  type GoalSettings,
  type PerGoal,
} from "@/lib/companion/goals";
import { isMenuKey } from "@/lib/companion/menu";
import {
  ACTIVITY_XP,
  FLASHCARD_XP_CAP,
  claimEventId,
  grammarNewId,
  grammarReviewId,
  skillEventId,
  vocabEventId,
  type ActivityKind,
  type XpEvent,
} from "./events";

/** users/{uid}/xp/total */
export interface XpTotal {
  total: number;
  /** Bumped by every event, so each write names exactly one. */
  rev: number;
  /** The id of the event this total last moved for. */
  last: string | null;
}

/** users/{uid}/days/{day} */
export interface DayRecord {
  day: string;
  /**
   * Each goal's target for this day, locked the first time the goal is active that day (its
   * first activity or claim). Edits in Goals after that apply from the next day.
   */
  targets: Partial<PerGoal<number>>;
  /** Claims and unclaims so far per goal: odd means claimed. */
  seq: PerGoal<number>;
  /** The bonus XP each claimed goal holds now (0 when unclaimed). */
  bonus: PerGoal<number>;
  /** Flashcard XP paid today (at most FLASHCARD_XP_CAP). */
  flash: number;
  /** Grammar lessons and reviews, Reading and Listening activities completed today. */
  done: { grammar: number; skills: number };
  /** Home's own bookkeeping: the dish each goal was fed, and the lines already said today. */
  items: Partial<Record<GoalId, string>>;
  announced: PerGoal<boolean>;
  greeted: boolean;
}

export interface Plan {
  event: XpEvent;
  total: XpTotal;
  day: DayRecord;
}

const zeros = (): PerGoal<number> => ({ vocab: 0, grammar: 0, skills: 0 });
const count = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);
const signed = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function blankTotal(): XpTotal {
  return { total: 0, rev: 0, last: null };
}

export function normalizeTotal(raw: unknown): XpTotal {
  const o = (raw ?? {}) as Partial<Record<keyof XpTotal, unknown>>;
  return { total: signed(o.total), rev: count(o.rev), last: typeof o.last === "string" ? o.last : null };
}

export function blankDay(day: string): DayRecord {
  return {
    day,
    targets: {},
    seq: zeros(),
    bonus: zeros(),
    flash: 0,
    done: { grammar: 0, skills: 0 },
    items: {},
    announced: { vocab: false, grammar: false, skills: false },
    greeted: false,
  };
}

/** A day record as read back from storage, filled in and checked. */
export function normalizeDay(raw: unknown, day: string): DayRecord {
  const o = (raw ?? {}) as Record<string, unknown>;
  const d = blankDay(day);
  const per = (v: unknown) => (v ?? {}) as Partial<Record<GoalId, unknown>>;
  for (const id of GOAL_IDS) {
    const t = per(o.targets)[id];
    if (typeof t === "number") {
      const lim = TARGET_LIMITS[id];
      d.targets[id] = clampInt(t, lim.fallback, lim.min, lim.max);
    }
    d.seq[id] = count(per(o.seq)[id]);
    d.bonus[id] = count(per(o.bonus)[id]);
    d.announced[id] = per(o.announced)[id] === true;
    const item = per(o.items)[id];
    if (isMenuKey(item)) d.items[id] = item;
  }
  d.flash = Math.min(FLASHCARD_XP_CAP, count(o.flash));
  const done = (o.done ?? {}) as Record<string, unknown>;
  d.done = { grammar: count(done.grammar), skills: count(done.skills) };
  d.greeted = o.greeted === true;
  return d;
}

export const isClaimed = (day: DayRecord, goal: GoalId) => day.seq[goal] % 2 === 1;

export function claimsOf(day: DayRecord): PerGoal<boolean> {
  return { vocab: isClaimed(day, "vocab"), grammar: isClaimed(day, "grammar"), skills: isClaimed(day, "skills") };
}

/** Today's target for each goal: the locked one where the goal is already active today, else the saved one. */
export function effectiveTargets(settings: GoalSettings, day: DayRecord): PerGoal<number> {
  const out = { ...settings.targets };
  for (const id of GOAL_IDS) if (day.targets[id] != null) out[id] = day.targets[id] as number;
  return out;
}

function copyDay(d: DayRecord): DayRecord {
  return {
    ...d,
    targets: { ...d.targets },
    seq: { ...d.seq },
    bonus: { ...d.bonus },
    done: { ...d.done },
    items: { ...d.items },
    announced: { ...d.announced },
  };
}

/** The goal's target locks for the day the first time it is active. */
function lock(day: DayRecord, goal: GoalId, settings: GoalSettings) {
  if (day.targets[goal] == null) day.targets[goal] = normalizeGoalSettings(settings).targets[goal];
}

function moved(total: XpTotal, event: XpEvent): XpTotal {
  return { total: total.total + event.amount, rev: total.rev + 1, last: event.id };
}

export interface Ctx {
  uid: string;
  total: XpTotal;
  day: DayRecord;
  settings: GoalSettings;
}

/**
 * 1 XP for a Vocab card reviewed, once per card per day (re-rating it through its learning steps
 * pays nothing more), up to FLASHCARD_XP_CAP cards a day. `log` is the review log entry that
 * submitReview wrote: the verified completion this pays for.
 */
export function planVocabCard(ctx: Ctx, log: { id: string; cardId: string }, alreadyPaid: boolean): Plan | null {
  if (alreadyPaid || ctx.day.flash >= FLASHCARD_XP_CAP) return null;
  const day = copyDay(ctx.day);
  lock(day, "vocab", ctx.settings);
  day.flash += 1;
  const event: XpEvent = {
    id: vocabEventId(day.day, log.cardId),
    uid: ctx.uid,
    kind: "vocab.card",
    amount: ACTIVITY_XP["vocab.card"],
    day: day.day,
    source: log.id,
    card: log.cardId,
  };
  return { event, total: moved(ctx.total, event), day };
}

/**
 * A Grammar lesson finished: 50 XP the first time ever (a new lesson), 10 XP as a review on a later
 * day, once a day. Finishing it again the day it was new pays nothing, so reopening a lesson can't
 * be farmed. `firstDone` is the day its grammar.new event was filed, if it has one.
 */
export function planGrammarLesson(
  ctx: Ctx,
  lessonId: string,
  firstDone: string | null,
  reviewedToday: boolean,
): Plan | null {
  let kind: ActivityKind;
  let id: string;
  if (firstDone == null) {
    kind = "grammar.new";
    id = grammarNewId(lessonId);
  } else {
    if (firstDone === ctx.day.day || reviewedToday) return null;
    kind = "grammar.review";
    id = grammarReviewId(ctx.day.day, lessonId);
  }
  const day = copyDay(ctx.day);
  lock(day, "grammar", ctx.settings);
  day.done.grammar += 1;
  const event: XpEvent = { id, uid: ctx.uid, kind, amount: ACTIVITY_XP[kind], day: day.day, source: lessonId, lesson: lessonId };
  return { event, total: moved(ctx.total, event), day };
}

/** A Reading or Listening activity finished: 30 XP, once per activity per day. */
export function planSkill(
  ctx: Ctx,
  kind: "skills.reading" | "skills.listening",
  activityId: string,
  alreadyPaid: boolean,
): Plan | null {
  if (alreadyPaid) return null;
  const day = copyDay(ctx.day);
  lock(day, "skills", ctx.settings);
  day.done.skills += 1;
  const event: XpEvent = {
    id: skillEventId(kind, day.day, activityId),
    uid: ctx.uid,
    kind,
    amount: ACTIVITY_XP[kind],
    day: day.day,
    source: activityId,
    activity: activityId,
  };
  return { event, total: moved(ctx.total, event), day };
}

/**
 * Claim (feed Rồng Con) or unclaim a goal. Claiming pays the bonus of the day's locked target's
 * tier; unclaiming takes back exactly what that claim holds, and activity XP is never touched.
 * Asking for the state a goal is already in writes nothing, so a double click or a retry can't
 * pay twice, and flipping a goal back and forth only ever holds one bonus.
 *
 * `eligible` is whether today's progress meets the target. Grammar and Skills are checked here
 * against the day's own completions too; Vocab's progress is read from its review log.
 */
export function planClaim(ctx: Ctx, goal: GoalId, want: boolean, eligible: boolean): Plan | null {
  if (isClaimed(ctx.day, goal) === want) return null;
  const day = copyDay(ctx.day);
  lock(day, goal, ctx.settings);
  const target = day.targets[goal] as number;
  if (want) {
    if (!eligible) return null;
    if (goal !== "vocab" && day.done[goal] < target) return null;
  }
  const seq = day.seq[goal] + 1;
  const amount = want ? goalBonus(goal, target) : -ctx.day.bonus[goal];
  day.seq[goal] = seq;
  day.bonus[goal] = want ? amount : 0;
  const event: XpEvent = {
    id: claimEventId(day.day, goal, seq),
    uid: ctx.uid,
    kind: want ? "goal.claim" : "goal.unclaim",
    amount,
    day: day.day,
    source: goal,
    goal,
    seq,
  };
  if (!want) event.reverses = claimEventId(day.day, goal, seq - 1);
  return { event, total: moved(ctx.total, event), day };
}
