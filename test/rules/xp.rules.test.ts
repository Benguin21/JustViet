/**
 * The XP ledger against the Firestore emulator with firestore.rules loaded: the real repository
 * code (src/lib/xp/repository.ts) earns XP, and hand-written writes that try to mint XP are
 * refused. Run with `npm run test:rules` (starts the emulator, needs Java).
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/firebase", () => ({
  get db() {
    return holder.db;
  },
  isFirebaseConfigured: true,
}));

import * as xp from "@/lib/xp/repository";
import { dayKeyIn } from "@/lib/xp/day";

const UID = "alice";
const TZ = "America/Los_Angeles";
let env: RulesTestEnvironment;
let db: Firestore;
const today = () => dayKeyIn(Date.now(), TZ);

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}
async function read(path: string) {
  let out: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = (await getDoc(doc(ctx.firestore() as unknown as Firestore, path))).data();
  });
  return out;
}
const total = async () => ((await read(`users/${UID}/xp/total`))?.total as number) ?? 0;
async function logFor(card: string, prior = "new") {
  const id = "log-" + card;
  await seed(`users/${UID}/reviewLogs/${id}`, { cardId: card, userId: UID, priorState: prior, reviewedAt: Date.now() });
  return { id, cardId: card, reviewedAt: Date.now() };
}
async function goals(targets: Record<string, number>) {
  await seed(`users/${UID}/settings/goals`, {
    enabled: { vocab: true, grammar: true, skills: true },
    targets: { vocab: 5, grammar: 1, skills: 1, ...targets },
    timeZone: TZ,
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-justviet",
    firestore: { rules: readFileSync(process.env.RULES_FILE ?? "firestore.rules", "utf8") },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  db = env.authenticatedContext(UID).firestore() as unknown as Firestore;
  holder.db = db;
  await goals({});
});

describe("activity XP", () => {
  it("pays 1 XP per Vocab card a day, once, however often it is sent", async () => {
    const log = await logFor("c1");
    const first = await xp.awardVocabReview(UID, log);
    expect(first.event?.amount).toBe(1);
    const again = await xp.awardVocabReview(UID, log);
    expect(again.event).toBeNull();
    await Promise.all([xp.awardVocabReview(UID, log), xp.awardVocabReview(UID, log)]);
    expect(await total()).toBe(1);
    expect((await read(`users/${UID}/days/${today()}`))?.flash).toBe(1);
  });

  it("stops flashcard XP at 100 cards a day", async () => {
    for (let i = 0; i < 102; i++) await xp.awardVocabReview(UID, await logFor("card" + i));
    expect(await total()).toBe(100);
    const day = await read(`users/${UID}/days/${today()}`);
    expect(day?.flash).toBe(100);
  });

  it("pays a new Grammar lesson 50 once, nothing for reopening it that day, then 10 as a review on a later day", async () => {
    expect((await xp.completeGrammarLesson(UID, "lesson-1")).event?.amount).toBe(50);
    expect((await xp.completeGrammarLesson(UID, "lesson-1")).event).toBeNull();
    expect(await total()).toBe(50);
    // Pretend lesson-2 was first finished long ago.
    await seed(`users/${UID}/xpEvents/grammar-new_lesson-2`, {
      uid: UID, kind: "grammar.new", amount: 50, day: "2000-1-1", source: "lesson-2", lesson: "lesson-2",
    });
    const review = await xp.completeGrammarLesson(UID, "lesson-2");
    expect(review.event?.kind).toBe("grammar.review");
    expect(review.event?.amount).toBe(10);
    expect((await xp.completeGrammarLesson(UID, "lesson-2")).event).toBeNull();
    expect(await total()).toBe(60);
    expect(((await read(`users/${UID}/days/${today()}`))?.done as { grammar: number }).grammar).toBe(2);
  });

  it("pays Reading and Listening 30 each, once per activity a day", async () => {
    await xp.completeSkill(UID, "skills.reading", "r1");
    await xp.completeSkill(UID, "skills.reading", "r1");
    await xp.completeSkill(UID, "skills.listening", "l1");
    expect(await total()).toBe(60);
  });
});

describe("goal bonuses", () => {
  it("claims pay the locked target's tier; unclaiming takes back only the bonus; reclaiming restores it once", async () => {
    await goals({ vocab: 10 });
    for (let i = 0; i < 10; i++) await xp.awardVocabReview(UID, await logFor("w" + i));
    expect(await total()).toBe(10);
    const day = today();
    expect((await xp.setGoalClaim(UID, day, "vocab", true, true)).event?.amount).toBe(20);
    expect((await xp.setGoalClaim(UID, day, "vocab", true, true)).event).toBeNull();
    expect(await total()).toBe(30);
    expect((await xp.setGoalClaim(UID, day, "vocab", false, true)).event?.amount).toBe(-20);
    expect(await total()).toBe(10);
    // Raising the target to Big now doesn't change today's bonus: it applies tomorrow.
    await goals({ vocab: 20 });
    expect((await xp.setGoalClaim(UID, day, "vocab", true, true)).event?.amount).toBe(20);
    expect(await total()).toBe(30);
  });

  it("a Starter Vocab target can be fed but pays no bonus", async () => {
    await goals({ vocab: 3 });
    for (let i = 0; i < 3; i++) await xp.awardVocabReview(UID, await logFor("s" + i));
    expect((await xp.setGoalClaim(UID, today(), "vocab", true, true)).event?.amount).toBe(0);
    expect(await total()).toBe(3);
  });

  it("Grammar can't be claimed before its lessons are done", async () => {
    await goals({ grammar: 2 });
    await xp.completeGrammarLesson(UID, "g1");
    expect((await xp.setGoalClaim(UID, today(), "grammar", true, true)).event).toBeNull();
    await xp.completeGrammarLesson(UID, "g2");
    expect((await xp.setGoalClaim(UID, today(), "grammar", true, true)).event?.amount).toBe(20);
    expect(await total()).toBe(120);
  });
});

describe("writes that try to mint XP are refused", () => {
  beforeEach(async () => {
    await xp.awardVocabReview(UID, await logFor("base"));
  });

  it("the total can't be set directly", async () => {
    await assertFails(updateDoc(doc(db, `users/${UID}/xp/total`), { total: 99999 }));
    await assertFails(setDoc(doc(db, `users/${UID}/xp/total`), { total: 99999, rev: 2, last: "x", updatedAt: serverTimestamp() }));
  });

  it("events can't be edited, deleted or written for the wrong amount", async () => {
    const id = `vocab_${today()}_base`;
    await assertFails(updateDoc(doc(db, `users/${UID}/xpEvents/${id}`), { amount: 500 }));
    await assertFails(deleteDoc(doc(db, `users/${UID}/xpEvents/${id}`)));
    const log = await logFor("forged");
    const day = (await read(`users/${UID}/days/${today()}`))!;
    const t = (await read(`users/${UID}/xp/total`))!;
    const fid = `vocab_${today()}_forged`;
    const b = writeBatch(db);
    b.set(doc(db, `users/${UID}/xpEvents/${fid}`), {
      uid: UID, kind: "vocab.card", amount: 50, day: today(), source: log.id, card: "forged", at: serverTimestamp(),
    });
    b.set(doc(db, `users/${UID}/xp/total`), { total: (t.total as number) + 50, rev: (t.rev as number) + 1, last: fid, updatedAt: serverTimestamp() });
    b.set(doc(db, `users/${UID}/days/${today()}`), { ...day, flash: (day.flash as number) + 1 });
    await assertFails(b.commit());
  });

  it("a card can't be paid without its review log, or past the cap", async () => {
    const day = (await read(`users/${UID}/days/${today()}`))!;
    const t = (await read(`users/${UID}/xp/total`))!;
    const fid = `vocab_${today()}_ghost`;
    const b = writeBatch(db);
    b.set(doc(db, `users/${UID}/xpEvents/${fid}`), {
      uid: UID, kind: "vocab.card", amount: 1, day: today(), source: "no-such-log", card: "ghost", at: serverTimestamp(),
    });
    b.set(doc(db, `users/${UID}/xp/total`), { total: (t.total as number) + 1, rev: (t.rev as number) + 1, last: fid, updatedAt: serverTimestamp() });
    b.set(doc(db, `users/${UID}/days/${today()}`), { ...day, flash: (day.flash as number) + 1 });
    await assertFails(b.commit());
    // Resetting the day's flashcard count (to dodge the cap) is refused too.
    await assertFails(setDoc(doc(db, `users/${UID}/days/${today()}`), { ...day, flash: 0 }));
  });

  it("a day's locked target can't be changed, but Home's own bookkeeping can", async () => {
    const day = (await read(`users/${UID}/days/${today()}`))!;
    expect((day.targets as { vocab: number }).vocab).toBe(5);
    await assertFails(setDoc(doc(db, `users/${UID}/days/${today()}`), { ...day, targets: { vocab: 20 } }));
    await assertSucceeds(setDoc(doc(db, `users/${UID}/days/${today()}`), { ...day, greeted: true, items: { vocab: "pho" } }));
    await assertSucceeds(
      xp.saveDayExtras(UID, today(), { items: { vocab: "pho" }, announced: { vocab: true, grammar: false, skills: false }, greeted: true }),
    );
  });

  it("a bonus can't be claimed at a bigger tier than the locked target, or unclaimed for more than it held", async () => {
    await goals({ vocab: 5 });
    for (let i = 0; i < 5; i++) await xp.awardVocabReview(UID, await logFor("t" + i));
    const day = (await read(`users/${UID}/days/${today()}`))!;
    const t = (await read(`users/${UID}/xp/total`))!;
    const fid = `goal_${today()}_vocab_1`;
    const forge = (amount: number) => {
      const b = writeBatch(db);
      b.set(doc(db, `users/${UID}/xpEvents/${fid}`), {
        uid: UID, kind: "goal.claim", amount, day: today(), source: "vocab", goal: "vocab", seq: 1, at: serverTimestamp(),
      });
      b.set(doc(db, `users/${UID}/xp/total`), { total: (t.total as number) + amount, rev: (t.rev as number) + 1, last: fid, updatedAt: serverTimestamp() });
      b.set(doc(db, `users/${UID}/days/${today()}`), {
        ...day, seq: { ...(day.seq as object), vocab: 1 }, bonus: { ...(day.bonus as object), vocab: amount },
      });
      return b.commit();
    };
    await assertFails(forge(30));
    await assertSucceeds(forge(10));
    expect(await total()).toBe(16);
    const after = (await read(`users/${UID}/days/${today()}`))!;
    const t2 = (await read(`users/${UID}/xp/total`))!;
    const uid2 = `goal_${today()}_vocab_2`;
    const b = writeBatch(db);
    b.set(doc(db, `users/${UID}/xpEvents/${uid2}`), {
      uid: UID, kind: "goal.unclaim", amount: -30, day: today(), source: "vocab", goal: "vocab", seq: 2, reverses: fid, at: serverTimestamp(),
    });
    b.set(doc(db, `users/${UID}/xp/total`), { total: (t2.total as number) - 30, rev: (t2.rev as number) + 1, last: uid2, updatedAt: serverTimestamp() });
    b.set(doc(db, `users/${UID}/days/${today()}`), { ...after, seq: { ...(after.seq as object), vocab: 2 }, bonus: { ...(after.bonus as object), vocab: 0 } });
    await assertFails(b.commit());
  });

  it("another learner's XP can't be read or written", async () => {
    const bob = env.authenticatedContext("bob").firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(bob, `users/${UID}/xp/total`)));
    await assertFails(setDoc(doc(bob, `users/${UID}/settings/goals`), { targets: { vocab: 50 } }));
  });
});
