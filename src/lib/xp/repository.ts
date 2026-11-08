/**
 * Firestore reads and writes for the XP ledger (see events.ts for the data model), the only file
 * of the XP system that imports `firebase/firestore`. Every award runs plan.ts inside a
 * transaction: it reads the total, the day and the award's own event id, and writes the event,
 * the new total and the day together or not at all. A retry, a second tab or another device
 * either finds the event already there (nothing to do) or is replayed by Firestore on top of the
 * other write, so XP can't be paid twice or lost between the three documents. firestore.rules
 * checks every one of these writes, so the browser alone can't mint XP.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeGoalSettings, type GoalId, type GoalSettings } from "@/lib/companion/goals";
import { dayKeyIn, deviceTimeZone, isTimeZone } from "./day";
import { grammarNewId, grammarReviewId, isSourceId, skillEventId, vocabEventId, type XpEvent } from "./events";
import {
  normalizeDay,
  normalizeTotal,
  planClaim,
  planGrammarLesson,
  planSkill,
  planVocabCard,
  type Ctx,
  type DayRecord,
  type Plan,
} from "./plan";

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  }
  return db;
}

const totalRef = (uid: string) => doc(requireDb(), "users", uid, "xp", "total");
const dayRef = (uid: string, day: string) => doc(requireDb(), "users", uid, "days", day);
const eventRef = (uid: string, id: string) => doc(requireDb(), "users", uid, "xpEvents", id);
const eventsCol = (uid: string) => collection(requireDb(), "users", uid, "xpEvents");
const goalsRef = (uid: string) => doc(requireDb(), "users", uid, "settings", "goals");

/** The learner's goals and established time zone (see day.ts), as saved. */
export interface SavedGoals {
  settings: GoalSettings;
  /** Null until it has been established (the first save of goals or of any XP). */
  timeZone: string | null;
}

function readGoals(raw: unknown): SavedGoals {
  const tz = (raw as { timeZone?: unknown } | null)?.timeZone;
  return { settings: normalizeGoalSettings(raw), timeZone: isTimeZone(tz) ? tz : null };
}

export async function fetchGoals(uid: string): Promise<SavedGoals> {
  const snap = await getDoc(goalsRef(uid));
  return readGoals(snap.exists() ? snap.data() : null);
}

/**
 * Saves the learner's goals. They are read again inside every award and claim, so a change
 * reaches a goal the moment it is saved, unless that goal is already active today (its target
 * is then locked until tomorrow, see DayRecord.targets).
 */
export async function saveGoals(uid: string, settings: GoalSettings, timeZone: string | null): Promise<void> {
  const s = normalizeGoalSettings(settings);
  await setDoc(goalsRef(uid), { enabled: s.enabled, targets: s.targets, timeZone: timeZone ?? deviceTimeZone() }, { merge: true });
}

/** Sets the established time zone if there isn't one yet. Returns the zone in use. */
export async function establishTimeZone(uid: string, saved: string | null): Promise<string> {
  if (saved) return saved;
  const tz = deviceTimeZone();
  await setDoc(goalsRef(uid), { timeZone: tz }, { merge: true });
  return tz;
}

export async function fetchTotal(uid: string): Promise<number> {
  const snap = await getDoc(totalRef(uid));
  return normalizeTotal(snap.exists() ? snap.data() : null).total;
}

export async function fetchDay(uid: string, day: string): Promise<DayRecord> {
  const snap = await getDoc(dayRef(uid, day));
  return normalizeDay(snap.exists() ? snap.data() : null, day);
}

/** The day's XP events (a single-field query, so it needs no composite index). */
export async function fetchDayEvents(uid: string, day: string): Promise<XpEvent[]> {
  const snap = await getDocs(query(eventsCol(uid), where("day", "==", day)));
  return snap.docs.map((d) => ({ ...(d.data() as XpEvent), id: d.id }));
}

/**
 * Home's bookkeeping on the day record (the dish each goal was fed, the lines already said).
 * Merged, and it never touches the XP fields.
 */
export async function saveDayExtras(
  uid: string,
  day: string,
  extras: Pick<DayRecord, "items" | "announced" | "greeted">,
): Promise<void> {
  const ref = dayRef(uid, day);
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(ref);
    const cur = normalizeDay(snap.exists() ? snap.data() : null, day);
    tx.set(ref, { ...cur, items: extras.items, announced: extras.announced, greeted: extras.greeted });
  });
}

export interface AwardResult {
  /** The event written, or null when there was nothing to pay (already paid, or capped). */
  event: XpEvent | null;
  total: number;
  day: DayRecord;
}

interface Loaded {
  ctx: Ctx;
  timeZone: string;
  needsZone: boolean;
}

/** Reads the goals (and so the day, in the established zone), the total and the day record. */
async function load(tx: Transaction, uid: string, at: number | null): Promise<Loaded & { dayKey: string }> {
  const goals = readGoals((await tx.get(goalsRef(uid))).data() ?? null);
  const timeZone = goals.timeZone ?? deviceTimeZone();
  const dayKey = dayKeyIn(at ?? Date.now(), timeZone);
  const [t, d] = await Promise.all([tx.get(totalRef(uid)), tx.get(dayRef(uid, dayKey))]);
  return {
    ctx: {
      uid,
      total: normalizeTotal(t.exists() ? t.data() : null),
      day: normalizeDay(d.exists() ? d.data() : null, dayKey),
      settings: goals.settings,
    },
    timeZone,
    needsZone: !goals.timeZone,
    dayKey,
  };
}

async function exists(tx: Transaction, ref: DocumentReference): Promise<boolean> {
  return (await tx.get(ref)).exists();
}

function write(tx: Transaction, uid: string, plan: Plan, l: Loaded) {
  const { event } = plan;
  const record: Record<string, unknown> = { ...event, at: serverTimestamp() };
  delete record.id;
  for (const k of Object.keys(record)) if (record[k] === undefined) delete record[k];
  tx.set(eventRef(uid, event.id), record);
  tx.set(totalRef(uid), { total: plan.total.total, rev: plan.total.rev, last: plan.total.last, updatedAt: serverTimestamp() });
  tx.set(dayRef(uid, plan.day.day), plan.day);
  if (l.needsZone) tx.set(goalsRef(uid), { timeZone: l.timeZone }, { merge: true });
}

async function run(uid: string, at: number | null, decide: (tx: Transaction, l: Loaded) => Promise<Plan | null>): Promise<AwardResult> {
  return runTransaction(requireDb(), async (tx) => {
    const l = await load(tx, uid, at);
    const plan = await decide(tx, l);
    if (!plan) return { event: null, total: l.ctx.total.total, day: l.ctx.day };
    write(tx, uid, plan, l);
    return { event: plan.event, total: plan.total.total, day: plan.day };
  });
}

/**
 * 1 XP for a reviewed Vocab card (see planVocabCard), filed under the day it was reviewed.
 * Called right after submitReview wrote `log`; Home calls it again for any of today's reviews
 * that a failed call missed, which is safe because a card already paid is skipped.
 */
export async function awardVocabReview(uid: string, log: { id: string; cardId: string; reviewedAt: number }): Promise<AwardResult> {
  if (!isSourceId(log.cardId)) throw new Error("That card can't earn XP.");
  return run(uid, log.reviewedAt, async (tx, l) => {
    const paid = await exists(tx, eventRef(uid, vocabEventId(l.ctx.day.day, log.cardId)));
    return planVocabCard(l.ctx, log, paid);
  });
}

/**
 * A Grammar lesson completed (all its steps done, not just opened): 50 XP when it's new, 10 XP
 * as a review on a later day. For the Grammar lesson screens to call when they land.
 */
export async function completeGrammarLesson(uid: string, lessonId: string): Promise<AwardResult> {
  if (!isSourceId(lessonId)) throw new Error("That lesson can't earn XP.");
  return run(uid, null, async (tx, l) => {
    const first = await tx.get(eventRef(uid, grammarNewId(lessonId)));
    const firstDay = first.exists() ? String((first.data() as XpEvent).day) : null;
    const reviewed = firstDay != null && (await exists(tx, eventRef(uid, grammarReviewId(l.ctx.day.day, lessonId))));
    return planGrammarLesson(l.ctx, lessonId, firstDay, reviewed);
  });
}

/** A Reading or Listening activity completed: 30 XP, once per activity a day. For the Skills pages. */
export async function completeSkill(uid: string, kind: "skills.reading" | "skills.listening", activityId: string): Promise<AwardResult> {
  if (!isSourceId(activityId)) throw new Error("That activity can't earn XP.");
  return run(uid, null, async (tx, l) => {
    const paid = await exists(tx, eventRef(uid, skillEventId(kind, l.ctx.day.day, activityId)));
    return planSkill(l.ctx, kind, activityId, paid);
  });
}

/**
 * Claim or unclaim a goal on `day` (Home's day, so a page left open past midnight can't file
 * yesterday's claim under today). Writes nothing if `day` is no longer today.
 */
export async function setGoalClaim(uid: string, day: string, goal: GoalId, want: boolean, eligible: boolean): Promise<AwardResult> {
  return run(uid, null, async (_tx, l) => (l.ctx.day.day === day ? planClaim(l.ctx, goal, want, eligible) : null));
}
