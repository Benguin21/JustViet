/**
 * Claims and the XP recorded for each goal, per local date. Pure data; saving it is the
 * repository's job.
 *
 * Today's entry is on top; earlier dates are filed under their own date in `past`, so a
 * date that comes round again (clock or timezone changes) keeps what it already recorded,
 * and `historyXp` is just their sum. Settling re-derives today's XP from progress and
 * claims and applies only the difference, so it is safe to call on every load or update.
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

export interface DayEntry {
  claims: PerGoal<boolean>;
  xp: PerGoal<number>;
  /** The dish each goal was fed today, kept for the rest of the day. */
  items: Partial<Record<GoalId, string>>;
  /** Companion bookkeeping so lines don't repeat on every refresh. */
  announced: PerGoal<boolean>;
  greeted: boolean;
}

export interface Ledger extends DayEntry {
  v: 3;
  day: string;
  past: Record<string, DayEntry>;
  historyXp: number;
}

/** The local calendar day, as 'YYYY-M-D' (no padding; it's also the menu's seed). */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
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

function make(day: string, cur: DayEntry, past: Record<string, DayEntry>): Ledger {
  let history = 0;
  for (const d of Object.keys(past)) history += sumXp(past[d].xp);
  return { v: 3, day, ...cur, past, historyXp: history };
}

export function blankLedger(day: string): Ledger {
  return make(day, dayEntry(), {});
}

function isLedger(l: unknown): l is Ledger {
  const o = l as Partial<Ledger> | null;
  return !!o && o.v === 3 && typeof o.day === "string" && !!o.claims && !!o.xp && !!o.announced;
}

/**
 * Bring a saved ledger (anything read back from storage) to `day`: file the old date
 * under its own key and pick up `day`'s own entry if it was seen before.
 */
export function ledgerForDay(saved: unknown, day: string): Ledger {
  if (!isLedger(saved)) return blankLedger(day);
  const past: Record<string, DayEntry> = {};
  for (const d of Object.keys(saved.past ?? {})) past[d] = dayEntry(saved.past[d]);
  let cur = dayEntry(saved);
  if (saved.day !== day) {
    past[saved.day] = cur;
    cur = past[day] ?? dayEntry();
    delete past[day];
  }
  return make(day, cur, past);
}

/**
 * Re-derive today's XP from progress and claims, record it, and return only the difference
 * from what was recorded before. Settling twice with the same inputs changes nothing. A
 * claim can't outlive its eligibility (say the daily target was raised). A goal switched
 * off keeps what it recorded today, untouched, until it is back on, so switching goals
 * never grants or takes back XP by itself.
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

/** All XP ever recorded: earlier days plus today. */
export function totalXp(ledger: Ledger): number {
  return ledger.historyXp + sumXp(ledger.xp);
}

