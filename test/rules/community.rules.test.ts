/**
 * The Community against the Firestore emulator with firestore.rules loaded: the real repository
 * code (src/lib/community/repository.ts) does each action, and hand-written writes that try to
 * break the rules (wrong counts, someone else's content, double votes, skipped rate limits…) are
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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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

import * as repo from "@/lib/community/repository";
import { AlreadyReportedError, NameTakenError, RateLimitError, RenameTooSoonError } from "@/lib/community/errors";
import { utcDay } from "@/lib/community/limits";
import { searchTokens } from "@/lib/community/search";
import type { ItemRef } from "@/lib/community/types";

let env: RulesTestEnvironment;
const A = "alice";
const B = "bob";
const C = "carol";

const QUESTION = {
  type: "question" as const,
  category: "grammar",
  title: "How do I use được after verbs?",
  body: "I keep seeing được after verbs and I'm not sure what it adds.",
};

function dbFor(uid: string | null, verified = true): Firestore {
  const ctx = uid ? env.authenticatedContext(uid, { email_verified: verified }) : env.unauthenticatedContext();
  return ctx.firestore() as unknown as Firestore;
}
/** Acts as `uid` for the repository calls that follow; returns that user's Firestore. */
function as(uid: string, verified = true): Firestore {
  holder.db = dbFor(uid, verified);
  return holder.db as Firestore;
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}
async function read(path: string): Promise<Record<string, unknown> | undefined> {
  let out: Record<string, unknown> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    out = (await getDoc(doc(ctx.firestore() as unknown as Firestore, path))).data();
  });
  return out;
}
const profileOf = async (uid: string) => (await read(`communityProfiles/${uid}`)) as { up: number; down: number; name: string; nameKey: string };
const postOf = async (id: string) => (await read(`communityPosts/${id}`)) as Record<string, unknown> & { up: number; down: number; score: number; responses: number; erased: number; accepted: string | null };

/** Moves the member's rate-limit stamps an hour back, so the next action isn't throttled. */
async function clearLimits(uid: string) {
  const cur = await read(`communityActivity/${uid}`);
  if (!cur) return;
  const old = Timestamp.fromMillis(Date.now() - 3_600_000);
  await seed(`communityActivity/${uid}`, {
    ...cur,
    lastPost: cur.lastPost ? old : null,
    lastResponse: cur.lastResponse ? old : null,
    lastVote: cur.lastVote ? old : null,
  });
}

/** The activity record a hand-written request would write (like repository.ts's activityWrite). */
async function activityFor(uid: string, act: string, target: string, changes: Record<string, unknown> = {}) {
  const cur = (await read(`communityActivity/${uid}`)) ?? {};
  return {
    lastPost: cur.lastPost ?? null,
    lastResponse: cur.lastResponse ?? null,
    lastVote: cur.lastVote ?? null,
    reportDay: cur.reportDay ?? 0,
    reports: cur.reports ?? 0,
    ...changes,
    act,
    target,
    at: serverTimestamp(),
  };
}

async function join(uid: string, name: string, guidelines = true) {
  as(uid);
  await repo.answerAge(uid, true);
  await repo.joinCommunity(uid, name, "teal");
  if (guidelines) await repo.acceptGuidelines(uid);
}
async function post(uid: string, input = QUESTION) {
  as(uid);
  await clearLimits(uid);
  const id = repo.newId();
  await repo.createPost(uid, id, input);
  return id;
}
async function respond(uid: string, postId: string, parent: string | null = null, body = "Here's how I'd say it.") {
  as(uid);
  await clearLimits(uid);
  const id = repo.newId();
  await repo.createResponse(uid, postId, id, { body, parent, mention: null });
  return id;
}
async function vote(uid: string, item: ItemRef, clicked: 1 | -1) {
  as(uid);
  await clearLimits(uid);
  return repo.castVote(uid, item, clicked);
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
  await join(A, "Alice Nguyễn");
  await join(B, "Bảo");
});

describe("who can use the Community", () => {
  it("signed-out users can read and write nothing", async () => {
    const id = await post(A);
    const db = dbFor(null);
    await assertFails(getDoc(doc(db, `communityPosts/${id}`)));
    await assertFails(getDocs(query(collection(db, "communityPosts"), limit(5))));
    await assertFails(getDoc(doc(db, `communityProfiles/${A}`)));
    await assertFails(getDoc(doc(db, `communityNames/alice nguyen`)));
    await assertFails(setDoc(doc(db, "communityAge/anon"), { over13: true, at: serverTimestamp() }));
  });

  it("users without a verified email can read and write nothing, even with a profile", async () => {
    const id = await post(A);
    const db = as(A, false);
    await assertFails(getDoc(doc(db, `communityPosts/${id}`)));
    await assertFails(getDoc(doc(db, `communityProfiles/${A}`)));
    await assertFails(getDoc(doc(db, `communityActivity/${A}`)));
    await assertFails(repo.castVote(A, { post: id, response: null }, 1));
    await assertFails(repo.createPost(A, repo.newId(), QUESTION));
    const dc = as(C, false);
    await assertFails(setDoc(doc(dc, `communityAge/${C}`), { over13: true, at: serverTimestamp() }));
  });

  it("verified users without a community profile can read and write nothing but the joining steps", async () => {
    const id = await post(A);
    const db = as(C);
    await assertFails(getDoc(doc(db, `communityPosts/${id}`)));
    await assertFails(getDocs(query(collection(db, "communityPosts"), limit(5))));
    await assertFails(getDoc(doc(db, `communityProfiles/${A}`)));
    await assertFails(getDoc(doc(db, `communityNames/alice nguyen`))); // not even names, before the 13+ answer
    await assertFails(setDoc(doc(db, `users/${C}/communityHidden/${id}`), { at: serverTimestamp() }));
    await assertFails(getDocs(collection(db, `users/${C}/communityBlocks`)));
    // Their own (missing) profile is readable, so the app knows to ask them to join.
    await assertSucceeds(getDoc(doc(db, `communityProfiles/${C}`)));
    await repo.answerAge(C, true);
    await assertSucceeds(getDoc(doc(db, `communityNames/alice nguyen`)));
    await assertFails(getDoc(doc(db, `communityPosts/${id}`)));
    await repo.joinCommunity(C, "Chi", "plum");
    await assertSucceeds(getDoc(doc(db, `communityPosts/${id}`)));
  });

  it("someone who answered under 13 can't create a profile, and can't change the answer", async () => {
    const db = as(C);
    expect(await repo.answerAge(C, false)).toBe(false);
    await assertFails(repo.joinCommunity(C, "Chi", "plum"));
    expect(await repo.answerAge(C, true)).toBe(false);
    await assertFails(updateDoc(doc(db, `communityAge/${C}`), { over13: true }));
    await assertFails(setDoc(doc(db, `communityAge/${C}`), { over13: true, at: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, `communityAge/${C}`)));
    // Writing the profile by hand is refused too.
    const b = writeBatch(db);
    b.set(doc(db, "communityNames/chi"), { uid: C });
    b.set(doc(db, `communityProfiles/${C}`), {
      name: "Chi", nameKey: "chi", color: "plum", up: 0, down: 0, joinedAt: serverTimestamp(), nameChangedAt: null, guidelinesAt: null,
    });
    await assertFails(b.commit());
    expect(await read(`communityProfiles/${C}`)).toBeUndefined();
  });

  it("nobody can skip the 13+ question", async () => {
    const db = as(C);
    const b = writeBatch(db);
    b.set(doc(db, "communityNames/chi"), { uid: C });
    b.set(doc(db, `communityProfiles/${C}`), {
      name: "Chi", nameKey: "chi", color: "plum", up: 0, down: 0, joinedAt: serverTimestamp(), nameChangedAt: null, guidelinesAt: null,
    });
    await assertFails(b.commit());
  });
});

describe("names", () => {
  it("are unique ignoring case and accents", async () => {
    as(C);
    await repo.answerAge(C, true);
    await expect(repo.joinCommunity(C, "bao", "plum")).rejects.toBeInstanceOf(NameTakenError);
    await expect(repo.joinCommunity(C, "ALICE NGUYEN", "plum")).rejects.toBeInstanceOf(NameTakenError);
    // By hand: claiming the taken key, or skipping the claim, is refused.
    const db = dbFor(C);
    const profile = { name: "Bao", nameKey: "bao", color: "plum", up: 0, down: 0, joinedAt: serverTimestamp(), nameChangedAt: null, guidelinesAt: null };
    const b = writeBatch(db);
    b.set(doc(db, "communityNames/bao"), { uid: C });
    b.set(doc(db, `communityProfiles/${C}`), profile);
    await assertFails(b.commit());
    await assertFails(setDoc(doc(db, `communityProfiles/${C}`), profile));
  });

  it("must match their key, and reserved names are refused", async () => {
    as(C);
    await repo.answerAge(C, true);
    const db = dbFor(C);
    const attempt = (name: string, key: string) => {
      const b = writeBatch(db);
      b.set(doc(db, `communityNames/${key}`), { uid: C });
      b.set(doc(db, `communityProfiles/${C}`), { name, nameKey: key, color: "plum", up: 0, down: 0, joinedAt: serverTimestamp(), nameChangedAt: null, guidelinesAt: null });
      return b.commit();
    };
    await assertFails(attempt("Bảo", "bao2")); // key doesn't match the name
    await assertFails(attempt("Cô Tươi", "co tuoi"));
    await assertFails(attempt("Admin", "admin"));
    await assertFails(attempt("The Mod", "the mod"));
    await assertFails(attempt("x", "x")); // too short
    await assertFails(attempt("Ann!e", "ann!e"));
    await assertSucceeds(attempt("Chị Hằng", "chi hang"));
  });

  it("can be changed once every 30 days; the old name is released", async () => {
    as(A);
    await repo.renameProfile(A, "Alice N");
    expect((await profileOf(A)).nameKey).toBe("alice n");
    expect(await read("communityNames/alice nguyen")).toBeUndefined();
    expect(await read("communityNames/alice n")).toEqual({ uid: A });
    await expect(repo.renameProfile(A, "Alice Again")).rejects.toBeInstanceOf(RenameTooSoonError);
    // By hand, within 30 days: refused.
    const db = dbFor(A);
    const b = writeBatch(db);
    b.set(doc(db, "communityNames/alice again"), { uid: A });
    b.delete(doc(db, "communityNames/alice n"));
    b.update(doc(db, `communityProfiles/${A}`), { name: "Alice Again", nameKey: "alice again", nameChangedAt: serverTimestamp() });
    await assertFails(b.commit());
    // Someone else can now take the released name.
    as(C);
    await repo.answerAge(C, true);
    await repo.joinCommunity(C, "Alice Nguyen", "plum");
    // After 30 days it works again.
    const prof = (await read(`communityProfiles/${A}`))!;
    await seed(`communityProfiles/${A}`, { ...prof, nameChangedAt: Timestamp.fromMillis(Date.now() - 31 * 86_400_000) });
    as(A);
    await repo.renameProfile(A, "Alice Again");
    expect((await profileOf(A)).name).toBe("Alice Again");
  });

  it("can't be taken from someone else by deleting their claim", async () => {
    const db = dbFor(C);
    await assertFails(deleteDoc(doc(db, "communityNames/bao")));
    await assertFails(deleteDoc(doc(dbFor(A), "communityNames/bao")));
  });
});

describe("profiles", () => {
  it("can't be changed by someone else, and your own totals can't be set", async () => {
    const db = dbFor(B);
    await assertFails(updateDoc(doc(db, `communityProfiles/${A}`), { color: "rose" }));
    await assertFails(updateDoc(doc(db, `communityProfiles/${A}`), { up: 5 }));
    await assertFails(updateDoc(doc(db, `communityProfiles/${A}`), { name: "Hacked", nameKey: "hacked" }));
    const own = dbFor(A);
    await assertFails(updateDoc(doc(own, `communityProfiles/${A}`), { up: 100 }));
    await assertFails(updateDoc(doc(own, `communityProfiles/${A}`), { down: -1 }));
    await assertFails(updateDoc(doc(own, `communityProfiles/${A}`), { joinedAt: Timestamp.fromMillis(0) }));
    await assertFails(updateDoc(doc(own, `communityProfiles/${A}`), { email: "a@b.c" }));
    await assertFails(updateDoc(doc(own, `communityProfiles/${A}`), { color: "neon" }));
    await assertSucceeds(updateDoc(doc(own, `communityProfiles/${A}`), { color: "rose" }));
  });

  it("can only be listed a few at a time", async () => {
    const db = dbFor(A);
    await assertFails(getDocs(collection(db, "communityProfiles")));
    as(A);
    expect((await repo.fetchProfiles([A, B])).map((p) => p.name).sort()).toEqual(["Alice Nguyễn", "Bảo"]);
  });
});

describe("posts", () => {
  it("are created once per draft id, by members who accepted the guidelines", async () => {
    as(A);
    const id = repo.newId();
    const first = await repo.createPost(A, id, QUESTION);
    expect(first.duplicate).toBe(false);
    await clearLimits(A);
    const again = await repo.createPost(A, id, QUESTION);
    expect(again.duplicate).toBe(true);
    const p = await postOf(id);
    expect(p).toMatchObject({ author: A, up: 0, down: 0, responses: 0, deleted: false, accepted: null });
    await join(C, "Chi", false);
    await assertFails(repo.createPost(C, repo.newId(), QUESTION));
  });

  it("refuse forged fields and skipped activity records", async () => {
    const db = dbFor(A);
    await clearLimits(A);
    const good = () => ({
      ...QUESTION, tokens: searchTokens(QUESTION.title, QUESTION.body), author: A, createdAt: serverTimestamp(), editedAt: null,
      up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false,
    });
    const attempt = async (data: Record<string, unknown>, id = repo.newId(), withActivity = true) => {
      const b = writeBatch(db);
      b.set(doc(db, `communityPosts/${id}`), data);
      if (withActivity) b.set(doc(db, `communityActivity/${A}`), await activityFor(A, "post", id, { lastPost: serverTimestamp() }));
      return b.commit();
    };
    await assertFails(attempt({ ...good(), author: B }));
    await assertFails(attempt({ ...good(), up: 10, score: 10 }));
    await assertFails(attempt({ ...good(), category: "memes" }));
    await assertFails(attempt({ ...good(), title: "Too short" }));
    await assertFails(attempt({ ...good(), body: "x".repeat(5001) }));
    await assertFails(attempt({ ...good(), tokens: Array.from({ length: 501 }, (_, i) => `t${i}`) }));
    await assertFails(attempt({ ...good(), email: "a@b.c" }));
    await assertFails(attempt(good(), repo.newId(), false)); // skipped the rate-limit record
    await assertFails(attempt(good(), "bad_id_with_underscores!"));
    await assertSucceeds(attempt(good()));
  });

  it("are limited to one a minute", async () => {
    await post(A);
    as(A);
    await expect(repo.createPost(A, repo.newId(), QUESTION)).rejects.toBeInstanceOf(RateLimitError);
    // By hand, skipping the client's check: refused.
    const db = dbFor(A);
    const id = repo.newId();
    const b = writeBatch(db);
    b.set(doc(db, `communityPosts/${id}`), {
      ...QUESTION, tokens: [], author: A, createdAt: serverTimestamp(), editedAt: null,
      up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false,
    });
    b.set(doc(db, `communityActivity/${A}`), await activityFor(A, "post", id, { lastPost: serverTimestamp() }));
    await assertFails(b.commit());
    // Two posts in one request share one rate-limit stamp: refused.
    await clearLimits(A);
    const b2 = writeBatch(db);
    const [x, y] = [repo.newId(), repo.newId()];
    const data = { ...QUESTION, tokens: [], author: A, createdAt: serverTimestamp(), editedAt: null, up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false };
    b2.set(doc(db, `communityPosts/${x}`), data);
    b2.set(doc(db, `communityPosts/${y}`), data);
    b2.set(doc(db, `communityActivity/${A}`), await activityFor(A, "post", x, { lastPost: serverTimestamp() }));
    await assertFails(b2.commit());
  });

  it("can only be edited or deleted by their author", async () => {
    const id = await post(A);
    const db = dbFor(B);
    await assertFails(updateDoc(doc(db, `communityPosts/${id}`), { title: "Edited by someone else!", editedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, `communityPosts/${id}`)));
    await assertFails(updateDoc(doc(db, `communityPosts/${id}`), { deleted: true }));
    as(B);
    await expect(repo.deletePost(B, id)).rejects.toThrow(); // the app refuses too
    as(A);
    const p = await repo.fetchPost(id);
    await assertSucceeds(repo.editPost(p!, { ...QUESTION, title: "How do I use được after a verb?" }));
    expect((await postOf(id)).title).toBe("How do I use được after a verb?");
    // The author can't touch the counts directly either.
    await assertFails(updateDoc(doc(dbFor(A), `communityPosts/${id}`), { responses: 5 }));
    await assertFails(updateDoc(doc(dbFor(A), `communityPosts/${id}`), { up: 5, score: 5 }));
  });

  it("are removed outright when nothing is under them, erased when they have responses", async () => {
    const lonely = await post(A);
    const busy = await post(A);
    await respond(B, busy);
    await vote(B, { post: busy, response: null }, 1);
    await vote(B, { post: lonely, response: null }, 1);
    expect((await profileOf(A)).up).toBe(2);
    as(A);
    expect(await repo.deletePost(A, lonely)).toBe("removed");
    expect(await read(`communityPosts/${lonely}`)).toBeUndefined();
    expect(await repo.deletePost(A, busy)).toBe("erased");
    expect(await postOf(busy)).toMatchObject({ title: "", body: "", author: "", deleted: true, tokens: [], up: 0, score: 0, responses: 1 });
    expect((await profileOf(A)).up).toBe(0);
    // Erased content can't be restored, voted on or edited.
    await assertFails(updateDoc(doc(dbFor(A), `communityPosts/${busy}`), { title: QUESTION.title, body: QUESTION.body, author: A, deleted: false }));
    await expect(vote(B, { post: busy, response: null }, 1)).rejects.toThrow();
  });

  it("can't be deleted without taking their votes off the author's total", async () => {
    const id = await post(A);
    await vote(B, { post: id, response: null }, 1);
    const db = dbFor(A);
    const b = writeBatch(db);
    b.delete(doc(db, `communityPosts/${id}`));
    b.set(doc(db, `communityActivity/${A}`), await activityFor(A, "delete", id));
    await assertFails(b.commit());
    const b2 = writeBatch(db);
    b2.delete(doc(db, `communityPosts/${id}`));
    b2.update(doc(db, `communityProfiles/${A}`), { up: 0, down: 0 });
    b2.set(doc(db, `communityActivity/${A}`), await activityFor(A, "delete", id));
    await assertSucceeds(b2.commit());
  });
});

describe("responses and replies", () => {
  it("keep the post's and parent's counts exact", async () => {
    const id = await post(A);
    const r1 = await respond(B, id);
    const r2 = await respond(A, id);
    const reply = await respond(A, id, r1, "Thanks!");
    expect((await postOf(id)).responses).toBe(2);
    expect((await read(`communityPosts/${id}/responses/${r1}`))?.replies).toBe(1);
    // A reply to a reply is refused (one reply level).
    await expect(respond(B, id, reply, "@Alice ok")).rejects.toThrow();
    // Counts can't move by the wrong amount.
    const db = dbFor(B);
    await clearLimits(B);
    const rid = repo.newId();
    const resp = { post: id, parent: null, author: B, body: "Another answer.", createdAt: serverTimestamp(), editedAt: null, up: 0, down: 0, score: 0, replies: 0, deleted: false, mention: null };
    const b = writeBatch(db);
    b.set(doc(db, `communityPosts/${id}/responses/${rid}`), resp);
    b.update(doc(db, `communityPosts/${id}`), { responses: 4 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "respond", `${id}/${rid}`, { lastResponse: serverTimestamp() }));
    await assertFails(b.commit());
    const b2 = writeBatch(db);
    b2.set(doc(db, `communityPosts/${id}/responses/${rid}`), resp);
    b2.set(doc(db, `communityActivity/${B}`), await activityFor(B, "respond", `${id}/${rid}`, { lastResponse: serverTimestamp() }));
    await assertFails(b2.commit());
    await assertFails(updateDoc(doc(db, `communityPosts/${id}`), { responses: 0 }));
    await assertFails(updateDoc(doc(db, `communityPosts/${id}/responses/${r1}`), { replies: 0 }));
    expect(r2).toBeTruthy();
  });

  it("are limited to one every 15 seconds", async () => {
    const id = await post(A);
    await respond(B, id);
    as(B);
    await expect(repo.createResponse(B, id, repo.newId(), { body: "Again", parent: null, mention: null })).rejects.toBeInstanceOf(RateLimitError);
  });

  it("can only be edited or deleted by their author", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    const db = dbFor(A);
    await assertFails(updateDoc(doc(db, `communityPosts/${id}/responses/${r}`), { body: "Changed", editedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, `communityPosts/${id}/responses/${r}`)));
    as(A);
    await expect(repo.deleteResponse(A, id, r)).rejects.toThrow(); // the app refuses too
    as(B);
    const list = await repo.fetchResponses(id);
    await assertSucceeds(repo.editResponse(list[0], "Better answer."));
  });

  it("deleting one with replies erases it and keeps the replies; acceptance clears", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    await respond(A, id, r, "Thank you!");
    await vote(A, { post: id, response: r }, 1);
    as(A);
    await repo.setAccepted(id, r);
    expect((await postOf(id)).accepted).toBe(r);
    expect((await profileOf(B)).up).toBe(1);
    as(B);
    expect(await repo.deleteResponse(B, id, r)).toBe("erased");
    expect(await read(`communityPosts/${id}/responses/${r}`)).toMatchObject({ body: "", author: "", deleted: true, replies: 1, up: 0 });
    expect(await postOf(id)).toMatchObject({ responses: 0, erased: 1, accepted: null });
    expect((await profileOf(B)).up).toBe(0);
    // The post can no longer be removed outright: it's erased instead.
    as(A);
    expect(await repo.deletePost(A, id)).toBe("erased");
  });
});

describe("accepted answers", () => {
  it("only the asker can accept, switch or clear, and only a top-level answer", async () => {
    const id = await post(A);
    const r1 = await respond(B, id);
    const r2 = await respond(B, id);
    const reply = await respond(A, id, r1, "Hmm?");
    as(B);
    await assertFails(repo.setAccepted(id, r1));
    as(A);
    await repo.setAccepted(id, r1);
    await repo.setAccepted(id, r2);
    expect((await postOf(id)).accepted).toBe(r2);
    await assertFails(repo.setAccepted(id, reply));
    await assertFails(repo.setAccepted(id, "nope"));
    await repo.setAccepted(id, null);
    expect((await postOf(id)).accepted).toBeNull();
    // Accepting awards nothing.
    expect((await profileOf(B)).up).toBe(0);
  });

  it("discussions have no accepted answer", async () => {
    const id = await post(A, { ...QUESTION, type: "discussion" as never });
    const r = await respond(B, id);
    as(A);
    await assertFails(repo.setAccepted(id, r));
  });
});

describe("votes", () => {
  it("move the item and its author's Community XP by exactly the right amount", async () => {
    const id = await post(A);
    const item = { post: id, response: null };
    expect(await vote(B, item, 1)).toMatchObject({ value: 1, up: 1, score: 1 });
    expect(await profileOf(A)).toMatchObject({ up: 1, down: 0 });
    expect(await vote(B, item, -1)).toMatchObject({ value: -1, up: 0, down: 1, score: -1 });
    expect(await profileOf(A)).toMatchObject({ up: 0, down: 1 });
    expect(await vote(B, item, -1)).toMatchObject({ value: 0, up: 0, down: 0, score: 0 });
    expect(await profileOf(A)).toMatchObject({ up: 0, down: 0 });
    // Casting votes doesn't change the voter's own Community XP.
    expect(await profileOf(B)).toMatchObject({ up: 0, down: 0 });
  });

  it("can't be cast on your own content, twice, or on replies", async () => {
    const id = await post(A);
    await expect(vote(A, { post: id, response: null }, 1)).rejects.toThrow();
    const r = await respond(B, id);
    const reply = await respond(A, id, r, "Reply");
    await expect(vote(B, { post: id, response: reply }, 1)).rejects.toThrow();
    await vote(B, { post: id, response: null }, 1);
    // A second +1 from the same voter, by hand: refused.
    await clearLimits(B);
    const db = dbFor(B);
    const vid = `p_${id}_${B}`;
    const b = writeBatch(db);
    b.set(doc(db, `communityVotes/${vid}`), { voter: B, post: id, response: null, author: A, value: 1, at: serverTimestamp() });
    b.update(doc(db, `communityPosts/${id}`), { up: 2, score: 2 });
    b.update(doc(db, `communityProfiles/${A}`), { up: 2 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", vid, { lastVote: serverTimestamp() }));
    await assertFails(b.commit());
    // A vote under another id (to dodge the one-per-voter id): refused.
    const b2 = writeBatch(db);
    b2.set(doc(db, `communityVotes/p_${id}_${B}_2`), { voter: B, post: id, response: null, author: A, value: 1, at: serverTimestamp() });
    b2.update(doc(db, `communityPosts/${id}`), { up: 2, score: 2 });
    b2.update(doc(db, `communityProfiles/${A}`), { up: 2 });
    b2.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", `p_${id}_${B}_2`, { lastVote: serverTimestamp() }));
    await assertFails(b2.commit());
    // Self-vote by hand: refused.
    await clearLimits(A);
    const own = dbFor(A);
    const sid = `p_${id}_${A}`;
    const b3 = writeBatch(own);
    b3.set(doc(own, `communityVotes/${sid}`), { voter: A, post: id, response: null, author: A, value: 1, at: serverTimestamp() });
    b3.update(doc(own, `communityPosts/${id}`), { up: 2, score: 2 });
    b3.update(doc(own, `communityProfiles/${A}`), { up: 2 });
    b3.set(doc(own, `communityActivity/${A}`), await activityFor(A, "vote", sid, { lastVote: serverTimestamp() }));
    await assertFails(b3.commit());
  });

  it("can't be cast on deleted content", async () => {
    const id = await post(A);
    await respond(B, id);
    as(A);
    await repo.deletePost(A, id);
    await expect(vote(B, { post: id, response: null }, 1)).rejects.toThrow();
    await clearLimits(B);
    const db = dbFor(B);
    const vid = `p_${id}_${B}`;
    const b = writeBatch(db);
    b.set(doc(db, `communityVotes/${vid}`), { voter: B, post: id, response: null, author: "", value: 1, at: serverTimestamp() });
    b.update(doc(db, `communityPosts/${id}`), { up: 1, score: 1 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", vid, { lastVote: serverTimestamp() }));
    await assertFails(b.commit());
  });

  it("refuse counts that move by the wrong amount", async () => {
    const id = await post(A);
    await clearLimits(B);
    const db = dbFor(B);
    const vid = `p_${id}_${B}`;
    const attempt = async (postUp: number, profileUp: number | null) => {
      const b = writeBatch(db);
      b.set(doc(db, `communityVotes/${vid}`), { voter: B, post: id, response: null, author: A, value: 1, at: serverTimestamp() });
      b.update(doc(db, `communityPosts/${id}`), { up: postUp, score: postUp });
      if (profileUp != null) b.update(doc(db, `communityProfiles/${A}`), { up: profileUp });
      b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", vid, { lastVote: serverTimestamp() }));
      return b.commit();
    };
    await assertFails(attempt(2, 2));
    await assertFails(attempt(1, 2));
    await assertFails(attempt(1, null));
    await assertSucceeds(attempt(1, 1));
  });

  it("are limited to one every 2 seconds", async () => {
    const p1 = await post(A);
    const p2 = await post(A);
    await vote(B, { post: p1, response: null }, 1);
    as(B);
    await expect(repo.castVote(B, { post: p2, response: null }, 1)).rejects.toBeInstanceOf(RateLimitError);
    const db = dbFor(B);
    const vid = `p_${p2}_${B}`;
    const b = writeBatch(db);
    b.set(doc(db, `communityVotes/${vid}`), { voter: B, post: p2, response: null, author: A, value: 1, at: serverTimestamp() });
    b.update(doc(db, `communityPosts/${p2}`), { up: 1, score: 1 });
    b.update(doc(db, `communityProfiles/${A}`), { up: 2 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", vid, { lastVote: serverTimestamp() }));
    await assertFails(b.commit());
  });

  it("are private to the voter", async () => {
    const id = await post(A);
    await vote(B, { post: id, response: null }, 1);
    const vid = `p_${id}_${B}`;
    await assertFails(getDoc(doc(dbFor(A), `communityVotes/${vid}`)));
    await assertFails(getDoc(doc(dbFor(A), `communityVotes/p_${id}_${C}`))); // even one that doesn't exist
    await assertFails(getDocs(query(collection(dbFor(A), "communityVotes"), where("post", "==", id))));
    await assertFails(getDocs(query(collection(dbFor(A), "communityVotes"), where("voter", "==", B))));
    await assertSucceeds(getDoc(doc(dbFor(B), `communityVotes/${vid}`)));
    as(B);
    expect(await repo.fetchMyVotes(B, id)).toEqual({ "": 1 });
  });

  it("change someone else's profile only by the exact vote amount", async () => {
    const id = await post(A);
    const other = await post(B);
    await vote(A, { post: other, response: null }, 1); // A votes on B's post (sets A's activity)
    // B can't bump A's profile by pointing at a vote that isn't on A's content.
    await clearLimits(B);
    const db = dbFor(B);
    const b = writeBatch(db);
    b.update(doc(db, `communityProfiles/${A}`), { up: 1 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "vote", `p_${other}_${A}`, { lastVote: serverTimestamp() }));
    await assertFails(b.commit());
    await assertFails(updateDoc(doc(db, `communityProfiles/${A}`), { up: 1 }));
    expect(id).toBeTruthy();
  });
});

describe("reports", () => {
  it("one per member and item, readable only by the reporter", async () => {
    const id = await post(A);
    as(B);
    await repo.fileReport(B, { kind: "post", post: id }, "spam", "");
    await expect(repo.fileReport(B, { kind: "post", post: id }, "spam", "again")).rejects.toBeInstanceOf(AlreadyReportedError);
    const rid = `${B}_p_${id}`;
    await assertSucceeds(getDoc(doc(dbFor(B), `communityReports/${rid}`)));
    await assertFails(getDoc(doc(dbFor(A), `communityReports/${rid}`)));
    await assertFails(getDocs(query(collection(dbFor(A), "communityReports"), where("post", "==", id))));
    await assertFails(updateDoc(doc(dbFor(B), `communityReports/${rid}`), { reason: "other" }));
    await assertFails(deleteDoc(doc(dbFor(B), `communityReports/${rid}`)));
    // Reports never remove anything.
    expect(await postOf(id)).toMatchObject({ deleted: false, title: QUESTION.title });
    // Profiles, responses and replies can be reported too.
    const r = await respond(A, id);
    const reply = await respond(A, id, r, "reply");
    as(B);
    await repo.fileReport(B, { kind: "response", post: id, response: r }, "off-topic", "");
    await repo.fileReport(B, { kind: "reply", post: id, response: reply }, "harassment", "");
    await repo.fileReport(B, { kind: "profile", uid: A }, "other", "Pretending to be a teacher");
    // ...but a reply can't be filed as a top-level response.
    const reply2 = await respond(A, id, r, "another reply");
    as(B);
    await assertFails(repo.fileReport(B, { kind: "response", post: id, response: reply2 }, "other", ""));
    expect(reply).toBeTruthy();
  });

  it("at most 20 a day", async () => {
    const id = await post(A);
    const cur = (await read(`communityActivity/${B}`)) ?? {};
    await seed(`communityActivity/${B}`, {
      lastPost: null, lastResponse: null, lastVote: null, act: "report", target: "x", at: Timestamp.now(), ...cur,
      reportDay: utcDay(Date.now()), reports: 20,
    });
    as(B);
    await expect(repo.fileReport(B, { kind: "post", post: id }, "spam", "")).rejects.toThrow(/limit/);
    const db = dbFor(B);
    const rid = `${B}_p_${id}`;
    const b = writeBatch(db);
    b.set(doc(db, `communityReports/${rid}`), { reporter: B, kind: "post", post: id, response: null, profile: null, reason: "spam", note: "", at: serverTimestamp(), status: "open" });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "report", rid, { reportDay: utcDay(Date.now()), reports: 21 }));
    await assertFails(b.commit());
    const b2 = writeBatch(db);
    b2.set(doc(db, `communityReports/${rid}`), { reporter: B, kind: "post", post: id, response: null, profile: null, reason: "spam", note: "", at: serverTimestamp(), status: "open" });
    b2.set(doc(db, `communityActivity/${B}`), await activityFor(B, "report", rid, { reportDay: utcDay(Date.now()), reports: 20 }));
    await assertFails(b2.commit());
  });
});

describe("hiding and blocking", () => {
  it("are private and don't change votes or XP", async () => {
    const id = await post(A);
    await vote(B, { post: id, response: null }, 1);
    as(B);
    await repo.hidePost(B, id);
    await repo.blockMember(B, A);
    as(B);
    const acct = await repo.fetchAccount(B);
    expect(acct.hidden).toEqual([id]);
    expect(acct.blocked).toEqual([A]);
    await assertFails(getDocs(collection(dbFor(A), `users/${B}/communityBlocks`)));
    await assertFails(setDoc(doc(dbFor(A), `users/${B}/communityBlocks/${C}`), { at: serverTimestamp() }));
    await assertFails(setDoc(doc(dbFor(B), `users/${B}/communityBlocks/${B}`), { at: serverTimestamp() }));
    expect((await profileOf(A)).up).toBe(1);
    expect((await postOf(id)).up).toBe(1);
    await repo.unblockMember(B, A);
    await repo.unhidePost(B, id);
    expect((await repo.fetchAccount(B)).blocked).toEqual([]);
  });
});

describe("learning XP is out of reach", () => {
  it("Community writes never touch users/{uid}/xp, xpEvents or days", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    await vote(A, { post: id, response: r }, 1);
    await vote(B, { post: id, response: null }, 1);
    for (const uid of [A, B]) {
      expect(await read(`users/${uid}/xp/total`)).toBeUndefined();
    }
    // Sneaking an XP write into a Community request fails the whole request.
    await clearLimits(B);
    const db = dbFor(B);
    const rid = repo.newId();
    const b = writeBatch(db);
    b.set(doc(db, `communityPosts/${id}/responses/${rid}`), {
      post: id, parent: null, author: B, body: "Answer", createdAt: serverTimestamp(), editedAt: null, up: 0, down: 0, score: 0, replies: 0, deleted: false, mention: null,
    });
    b.update(doc(db, `communityPosts/${id}`), { responses: 2 });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "respond", `${id}/${rid}`, { lastResponse: serverTimestamp() }));
    b.set(doc(db, `users/${B}/xp/total`), { total: 500, rev: 1, last: "x", updatedAt: serverTimestamp() });
    await assertFails(b.commit());
    expect(await read(`users/${B}/xp/total`)).toBeUndefined();
    expect((await postOf(id)).responses).toBe(1);
  });
});
