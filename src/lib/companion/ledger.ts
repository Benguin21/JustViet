/**
 * What Home shows of the XP ledger for one day: each goal's claim and the bonus it holds, the
 * dish it was fed and the lines already said, plus `historyXp`, all the learner's other XP
 * (activity XP and earlier days' bonuses). The ledger itself is src/lib/xp: Home reads today
 * from it (ledgerFromDay) and sends back only what changed (ledgerChanges), which the XP
 * repository applies as claims and unclaims inside transactions.
 *
 * Settling re-derives today's bonuses from progress, claims and today's targets and returns
 * only the difference, so it is safe to call on every load or update.
 */
import {
  GOAL_IDS,
  checkEligibility,
  sumXp,
  xpEntitlement,
  type GoalId,
  type PerGoal,
  type Progress,
} from "./goals";
import { isMenuKey } from "./menu";
import { claimsOf, type DayRecord } from "@/lib/xp/plan";

export { localDayKey } from "@/lib/xp/day";

export interface DayEntry {
  claims: PerGoal<boolean>;
  /** The bonus XP each goal holds today. */
  xp: PerGoal<number>;
  /** The dish each goal was fed today, kept for the rest of the day. */
  items: Partial<Record<GoalId, string>>;
  /** Companion bookkeeping so lines don't repeat on every refresh. */
  announced: PerGoal<boolean>;
  greeted: boolean;
}

export interface Ledger extends DayEntry {
  v: 4;
  day: string;
  /** All XP outside today's goal bonuses. */
  historyXp: number;
}

function flags(f: unknown): PerGoal<boolean> {
  const o = (f ?? {}) as Partial<Record<GoalId, unknown>>;
  return { vocab: !!o.vocab, grammar: !!o.grammar, skills: !!o.skills };
}

function xpOf(x: unknown): PerGoal<number> {
  const o = (x ?? {}) as Partial<Record<GoalId, unknown>>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return { vocab: n(o.vocab), grammar: n(o.grammar), skills: n(o.skills) };
}

function itemsOf(x: unknown): Partial<Record<GoalId, string>> {
  const o = (x ?? {}) as Partial<Record<GoalId, unknown>>;
  const out: Partial<Record<GoalId, string>> = {};
  for (const id of GOAL_IDS) {
    const k = o[id];
    if (isMenuKey(k)) out[id] = k;
  }
  return out;
}

export function dayEntry(e?: unknown): DayEntry {
  const o = (e ?? {}) as Partial<Record<keyof DayEntry, unknown>>;
  return {
    claims: flags(o.claims),
    xp: xpOf(o.xp),
    items: itemsOf(o.items),
    announced: flags(o.announced),
    greeted: !!o.greeted,
  };
}

export function blankLedger(day: string, historyXp = 0): Ledger {
  return { v: 4, day, ...dayEntry(), historyXp };
}

function isLedger(l: unknown): l is Ledger {
  const o = l as Partial<Ledger> | null;
  return !!o && o.v === 4 && typeof o.day === "string" && !!o.claims && !!o.xp && !!o.announced;
}

/** Home's ledger for a day, from the learner's XP total and that day's record. */
export function ledgerFromDay(total: number, day: DayRecord): Ledger {
  const xp = { ...day.bonus };
  return {
    v: 4,
    day: day.day,
    claims: claimsOf(day),
    xp,
    items: { ...day.items },
    announced: { ...day.announced },
    greeted: day.greeted,
    historyXp: total - sumXp(xp),
  };
}

/**
 * Bring a ledger to `day`. On a new day (a page left open past midnight) yesterday's bonuses join
 * the history and today starts blank.
 */
export function ledgerForDay(saved: unknown, day: string): Ledger {
  if (!isLedger(saved)) return blankLedger(day);
  const historyXp = typeof saved.historyXp === "number" && Number.isFinite(saved.historyXp) ? saved.historyXp : 0;
  const cur = dayEntry(saved);
  if (saved.day !== day) return blankLedger(day, historyXp + sumXp(cur.xp));
  return { v: 4, day, ...cur, historyXp };
}

/**
 * Re-derive today's bonuses from progress, claims and today's targets, record them, and return
 * only the difference from what was recorded before. Settling twice with the same inputs changes
 * nothing. A claim can't outlive its eligibility (say a card was deleted, and its review with
 * it). A goal switched off keeps what it recorded today, untouched, until it is back on, so
 * switching goals never grants or takes back XP by itself.
 */
export function settleLedger(
  ledger: Ledger,
  targets: PerGoal<number>,
  progress: Progress,
  active: readonly GoalId[] = GOAL_IDS,
): { ledger: Ledger; delta: number } {
  const on = new Set(active);
  const ok = checkEligibility(targets, progress);
  const claims = {} as PerGoal<boolean>;
  for (const id of GOAL_IDS) claims[id] = !!ledger.claims[id] && (ok[id] || !on.has(id));
  const next = xpEntitlement(targets, progress, claims);
  for (const id of GOAL_IDS) if (!on.has(id)) next[id] = ledger.xp[id] || 0;
  const out: Ledger = { ...ledger, claims, xp: next, items: { ...ledger.items }, announced: { ...ledger.announced } };
  return { ledger: out, delta: sumXp(next) - sumXp(ledger.xp) };
}

/** Goals fed today, counting only the ones switched on. */
export function claimCount(ledger: Ledger, active: readonly GoalId[] = GOAL_IDS): number {
  return active.filter((id) => ledger.claims[id]).length;
}

/** All XP: everything earlier plus today's bonuses. */
export function totalXp(ledger: Ledger): number {
  return ledger.historyXp + sumXp(ledger.xp);
}

export interface LedgerChanges {
  day: string;
  /** Goals whose claim changed, with the state wanted now, in order. */
  claims: { goal: GoalId; want: boolean }[];
  /** Home's bookkeeping, when any of it changed. */
  extras: Pick<DayEntry, "items" | "announced" | "greeted"> | null;
}

/** What to send for a ledger Home has just worked out, compared with the last one sent. */
export function ledgerChanges(prev: Ledger | null, next: Ledger): LedgerChanges {
  const same = !!prev && prev.day === next.day;
  const claims = GOAL_IDS.filter((id) => (same ? prev!.claims[id] : false) !== next.claims[id]).map((goal) => ({
    goal,
    want: next.claims[goal],
  }));
  const key = (l: Ledger) => JSON.stringify([GOAL_IDS.map((id) => l.items[id] ?? null), l.announced, l.greeted]);
  const extras = !same || key(prev!) !== key(next) ? { items: { ...next.items }, announced: { ...next.announced }, greeted: next.greeted } : null;
  return { day: next.day, claims, extras };
}
