/**
 * Community Phase 2 against the Firestore emulator: moderators (the `moderator` custom claim),
 * removing and restoring content, reports, warnings, suspensions, bans and notifications. The
 * real repository code does each action; hand-written writes that try to get around the rules
 * are refused. Run with `npm run test:rules`.
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
import { SuspendedError } from "@/lib/community/errors";

let env: RulesTestEnvironment;
const A = "alice";
const B = "bob";
const M = "mona"; // moderator

const QUESTION = {
  type: "question" as const,
  category: "grammar",
  title: "How do I use được after verbs?",
  body: "I keep seeing được after verbs and I'm not sure what it adds.",
};

function dbFor(uid: string | null, opts: { verified?: boolean; mod?: boolean } = {}): Firestore {
  const { verified = true, mod = false } = opts;
  const ctx = uid
    ? env.authenticatedContext(uid, { email_verified: verified, ...(mod ? { moderator: true } : {}) })
    : env.unauthenticatedContext();
  return ctx.firestore() as unknown as Firestore;
}
function as(uid: string, opts: { verified?: boolean; mod?: boolean } = {}): Firestore {
  holder.db = dbFor(uid, { mod: uid === M, ...opts });
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
async function inbox(uid: string) {
  let out: Record<string, unknown>[] = [];
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore() as unknown as Firestore, `communityInbox/${uid}/notifications`));
    out = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  return out;
}
const profileOf = async (uid: string) => (await read(`communityProfiles/${uid}`)) as { up: number; down: number; banned?: boolean };
const postOf = async (id: string) => (await read(`communityPosts/${id}`)) as Record<string, unknown>;

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
/** The activity record a hand-written request would write, keeping every field (suspension included). */
const COUNTED: Record<string, "dayPosts" | "dayResponses" | "dayVotes"> = { post: "dayPosts", respond: "dayResponses", vote: "dayVotes" };
/** The daily counters a hand-written request must carry (limits.ts countAction, by hand). */
function countsFor(cur: Record<string, unknown>, act: string) {
  const counts = {
    countDay: (cur.countDay as number) ?? 0,
    dayPosts: (cur.dayPosts as number) ?? 0,
    dayResponses: (cur.dayResponses as number) ?? 0,
    dayVotes: (cur.dayVotes as number) ?? 0,
  };
  const field = COUNTED[act];
  if (!field) return counts;
  const today = Math.floor(Date.now() / 86_400_000);
  const fresh = counts.countDay === today;
  const out = { countDay: today, dayPosts: fresh ? counts.dayPosts : 0, dayResponses: fresh ? counts.dayResponses : 0, dayVotes: fresh ? counts.dayVotes : 0 };
  out[field] += 1;
  return out;
}
async function activityFor(uid: string, act: string, target: string, changes: Record<string, unknown> = {}) {
  const cur = (await read(`communityActivity/${uid}`)) ?? {};
  return {
    ...countsFor(cur, act),
    lastPost: cur.lastPost ?? null,
    lastResponse: cur.lastResponse ?? null,
    lastVote: cur.lastVote ?? null,
    reportDay: cur.reportDay ?? 0,
    reports: cur.reports ?? 0,
    suspendedUntil: cur.suspendedUntil ?? null,
    ...changes,
    act,
    target,
    at: serverTimestamp(),
  };
}

async function join(uid: string, name: string) {
  as(uid);
  await repo.answerAge(uid, true);
  await repo.joinCommunity(uid, name, "teal");
  const prof = (await read(`communityProfiles/${uid}`))!;
  await seed(`communityProfiles/${uid}`, { ...prof, joinedAt: Timestamp.fromMillis(Date.now() - 30 * 86_400_000) });
  await repo.acceptGuidelines(uid);
}
async function post(uid: string) {
  as(uid);
  await clearLimits(uid);
  const id = repo.newId();
  await repo.createPost(uid, id, QUESTION);
  return id;
}
async function respond(uid: string, postId: string, parent: string | null = null, mention: string | null = null) {
  as(uid);
  await clearLimits(uid);
  const id = repo.newId();
  await repo.createResponse(uid, postId, id, { body: mention ? "@Someone thanks!" : "Here's how I'd say it.", parent, mention });
  return id;
}
async function vote(uid: string, postId: string, response: string | null, clicked: 1 | -1) {
  as(uid);
  await clearLimits(uid);
  return repo.castVote(uid, { post: postId, response }, clicked);
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
  await join(A, "Alice");
  await join(B, "Bảo");
  await join(M, "Mona");
});

describe("moderator access", () => {
  it("only moderators can read the queue, removed copies, the log and others' activity", async () => {
    const id = await post(A);
    as(B);
    await repo.fileReport(B, { kind: "post", post: id }, "spam", "");
    const member = dbFor(A);
    await assertFails(getDocs(query(collection(member, "communityReports"), where("status", "==", "open"))));
    await assertFails(getDocs(collection(member, "communityModLog")));
    await assertFails(getDocs(collection(member, "communityRemoved")));
    await assertFails(getDoc(doc(member, `communityActivity/${B}`)));
    as(M);
    expect((await repo.fetchOpenReports()).map((r) => r.post)).toEqual([id]);
    await assertSucceeds(getDoc(doc(dbFor(M, { mod: true }), `communityActivity/${B}`)));
    // A claim on an unverified account counts for nothing.
    await assertFails(getDocs(query(collection(dbFor(M, { mod: true, verified: false }), "communityReports"), where("status", "==", "open"))));
  });
});

describe("removing and restoring", () => {
  it("a post: text moves to a private copy, its votes stop counting, and restoring puts everything back", async () => {
    const id = await post(A);
    await vote(B, id, null, 1);
    expect((await profileOf(A)).up).toBe(1);
    as(B);
    await repo.fileReport(B, { kind: "post", post: id }, "spam", "selling");
    as(M);
    await repo.removeContent(M, { post: id, response: null }, "Spam", [`${B}_p_${id}`]);
    expect(await postOf(id)).toMatchObject({ title: "", body: "", tokens: [], deleted: true, removed: true, author: A, up: 1 });
    expect(await read(`communityRemoved/p_${id}`)).toMatchObject({ author: A, title: QUESTION.title, body: QUESTION.body, reason: "Spam" });
    expect((await profileOf(A)).up).toBe(0);
    expect((await read(`communityReports/${B}_p_${id}`))?.status).toBe("actioned");
    expect((await inbox(A)).map((n) => n.type)).toEqual(["removed"]);
    expect((await inbox(A))[0]).toMatchObject({ from: "mod", reason: "Spam" });
    // The author can read their removed text; other members can't.
    await assertSucceeds(getDoc(doc(dbFor(A), `communityRemoved/p_${id}`)));
    await assertFails(getDoc(doc(dbFor(B), `communityRemoved/p_${id}`)));
    // Removed content can't be voted on, edited or answered.
    await expect(vote(B, id, null, 1)).rejects.toThrow();
    await assertFails(updateDoc(doc(dbFor(A), `communityPosts/${id}`), { title: QUESTION.title, body: QUESTION.body, editedAt: serverTimestamp() }));
    await expect(respond(B, id)).rejects.toThrow();
    as(M);
    await repo.restoreContent(M, { post: id, response: null });
    expect(await postOf(id)).toMatchObject({ title: QUESTION.title, body: QUESTION.body, deleted: false, removed: false, up: 1 });
    expect(((await postOf(id)).tokens as string[]).length).toBeGreaterThan(0);
    expect(await read(`communityRemoved/p_${id}`)).toBeUndefined();
    expect((await profileOf(A)).up).toBe(1);
    expect((await inbox(A)).map((n) => n.type).sort()).toEqual(["removed", "restored"]);
    as(M);
    expect((await repo.fetchModLog()).map((e) => [e.action, e.uid, e.post])).toEqual([
      ["restore", A, id],
      ["remove", A, id],
    ]);
  });

  it("an answer: the post's counts and acceptance follow", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    await vote(A, id, r, 1);
    as(A);
    await repo.setAccepted(A, id, r);
    as(M);
    await repo.removeContent(M, { post: id, response: r }, "Rude");
    expect(await postOf(id)).toMatchObject({ responses: 0, erased: 1, accepted: null });
    expect(await read(`communityPosts/${id}/responses/${r}`)).toMatchObject({ body: "", deleted: true, removed: true, author: B, up: 1 });
    expect((await profileOf(B)).up).toBe(0);
    await repo.restoreContent(M, { post: id, response: r });
    expect(await postOf(id)).toMatchObject({ responses: 1, erased: 0, accepted: null });
    expect((await profileOf(B)).up).toBe(1);
  });

  it("a reply (no votes, no counts)", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    const reply = await respond(A, id, r);
    as(M);
    await repo.removeContent(M, { post: id, response: reply }, "");
    expect(await read(`communityPosts/${id}/responses/${reply}`)).toMatchObject({ deleted: true, removed: true, body: "" });
    expect((await read(`communityPosts/${id}/responses/${r}`))?.replies).toBe(1);
    await repo.restoreContent(M, { post: id, response: reply });
    expect((await read(`communityPosts/${id}/responses/${reply}`))?.body).toBe("Here's how I'd say it.");
  });

  it("members can't remove, and moderators can't skip the copy or move counts wrongly", async () => {
    const id = await post(A);
    await vote(B, id, null, 1);
    const blank = { title: "", body: "", tokens: [], deleted: true, removed: true };
    // A member (even with their own activity record pointing at it): refused.
    const mb = dbFor(B);
    await clearLimits(B);
    const b1 = writeBatch(mb);
    b1.update(doc(mb, `communityPosts/${id}`), blank);
    b1.set(doc(mb, `communityActivity/${B}`), await activityFor(B, "remove", id));
    await assertFails(b1.commit());
    // A moderator without the private copy, or without taking the votes off: refused.
    const md = dbFor(M, { mod: true });
    const b2 = writeBatch(md);
    b2.update(doc(md, `communityPosts/${id}`), blank);
    b2.update(doc(md, `communityProfiles/${A}`), { up: 0 });
    b2.set(doc(md, `communityActivity/${M}`), await activityFor(M, "remove", id));
    await assertFails(b2.commit());
    const copy = { author: A, post: id, response: null, title: QUESTION.title, body: QUESTION.body, reason: "", removedAt: serverTimestamp() };
    const b3 = writeBatch(md);
    b3.set(doc(md, `communityRemoved/p_${id}`), copy);
    b3.update(doc(md, `communityPosts/${id}`), blank);
    b3.set(doc(md, `communityActivity/${M}`), await activityFor(M, "remove", id));
    await assertFails(b3.commit());
    // A copy that doesn't match the post: refused.
    const b4 = writeBatch(md);
    b4.set(doc(md, `communityRemoved/p_${id}`), { ...copy, body: "Something else entirely" });
    b4.update(doc(md, `communityPosts/${id}`), blank);
    b4.update(doc(md, `communityProfiles/${A}`), { up: 0 });
    b4.set(doc(md, `communityActivity/${M}`), await activityFor(M, "remove", id));
    await assertFails(b4.commit());
    // Done right: accepted.
    const b5 = writeBatch(md);
    b5.set(doc(md, `communityRemoved/p_${id}`), copy);
    b5.update(doc(md, `communityPosts/${id}`), blank);
    b5.update(doc(md, `communityProfiles/${A}`), { up: 0 });
    b5.set(doc(md, `communityActivity/${M}`), await activityFor(M, "remove", id));
    await assertSucceeds(b5.commit());
  });

  it("the author can delete the removed text for good, and then it can't be restored", async () => {
    const id = await post(A);
    as(M);
    await repo.removeContent(M, { post: id, response: null }, "Off-topic");
    as(A);
    await repo.deleteRemovedCopy({ post: id, response: null });
    expect(await read(`communityRemoved/p_${id}`)).toBeUndefined();
    as(M);
    await expect(repo.restoreContent(M, { post: id, response: null })).rejects.toThrow(/permanently/);
  });
});

describe("reports", () => {
  it("moderators dismiss them; members can't close them; reporters can still read theirs", async () => {
    const id = await post(A);
    as(B);
    await repo.fileReport(B, { kind: "post", post: id }, "spam", "");
    const rid = `${B}_p_${id}`;
    await assertFails(updateDoc(doc(dbFor(B), `communityReports/${rid}`), { status: "dismissed", resolvedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor(M, { mod: true }), `communityReports/${rid}`), { reason: "other" }));
    as(M);
    await repo.dismissReports(M, { uid: A, post: id, response: null }, [rid]);
    expect((await read(`communityReports/${rid}`))?.status).toBe("dismissed");
    expect(await repo.fetchOpenReports()).toEqual([]);
    await assertSucceeds(getDoc(doc(dbFor(B), `communityReports/${rid}`)));
    expect((await postOf(id)).deleted).toBe(false);
  });
});

describe("suspensions", () => {
  it("stop posting, responding, voting, editing and reporting until lifted; reading and deleting still work", async () => {
    const id = await post(A);
    const mine = await post(B);
    as(M);
    const until = await repo.suspendMember(M, B, 7, "Repeated rudeness");
    expect(until).toBeGreaterThan(Date.now());
    expect((await inbox(B))[0]).toMatchObject({ type: "suspended", reason: "Repeated rudeness" });
    as(B);
    await clearLimits(B);
    await expect(repo.createPost(B, repo.newId(), QUESTION)).rejects.toBeInstanceOf(SuspendedError);
    await expect(repo.createResponse(B, id, repo.newId(), { body: "Hi", parent: null, mention: null })).rejects.toBeInstanceOf(SuspendedError);
    await expect(repo.castVote(B, { post: id, response: null }, 1)).rejects.toBeInstanceOf(SuspendedError);
    await expect(repo.fileReport(B, { kind: "post", post: id }, "spam", "")).rejects.toBeInstanceOf(SuspendedError);
    // By hand, past the app's checks: refused by the rules.
    const db = dbFor(B);
    const pid = repo.newId();
    const b = writeBatch(db);
    b.set(doc(db, `communityPosts/${pid}`), {
      ...QUESTION, tokens: [], author: B, createdAt: serverTimestamp(), editedAt: null,
      up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false,
    });
    b.set(doc(db, `communityActivity/${B}`), await activityFor(B, "post", pid, { lastPost: serverTimestamp() }));
    await assertFails(b.commit());
    await assertFails(updateDoc(doc(db, `communityPosts/${mine}`), { ...QUESTION, title: "Edited while suspended!!", tokens: [], editedAt: serverTimestamp() }));
    // ...and the member can't lift it themselves.
    await assertFails(updateDoc(doc(db, `communityActivity/${B}`), { suspendedUntil: null }));
    const b2 = writeBatch(db);
    b2.set(doc(db, `communityActivity/${B}`), await activityFor(B, "none", "", { suspendedUntil: null }));
    await assertFails(b2.commit());
    // Reading and deleting their own content still work.
    await assertSucceeds(getDoc(doc(db, `communityPosts/${id}`)));
    as(B);
    expect(await repo.deletePost(B, mine)).toBe("removed");
    // Members can't suspend anyone.
    await assertFails(updateDoc(doc(dbFor(A), `communityActivity/${B}`), { suspendedUntil: null }));
    as(M);
    await repo.unsuspendMember(M, B);
    as(B);
    await clearLimits(B);
    await assertSucceeds(repo.createPost(B, repo.newId(), QUESTION));
  });

  it("an expired suspension no longer applies", async () => {
    as(M);
    await repo.suspendMember(M, A, 1, "");
    const act = (await read(`communityActivity/${A}`))!;
    await seed(`communityActivity/${A}`, { ...act, suspendedUntil: Timestamp.fromMillis(Date.now() - 1000) });
    await assertSucceeds(post(A));
  });
});

describe("bans", () => {
  it("cut off all Community access until lifted, but the member can still see why", async () => {
    const id = await post(A);
    await assertFails(updateDoc(doc(dbFor(A), `communityProfiles/${B}`), { banned: true }));
    await assertFails(updateDoc(doc(dbFor(B), `communityProfiles/${B}`), { banned: false }));
    as(M);
    await repo.banMember(M, B, "Spam account");
    const db = dbFor(B);
    await assertFails(getDoc(doc(db, `communityPosts/${id}`)));
    await assertFails(getDocs(query(collection(db, "communityPosts"), limit(5))));
    await assertFails(getDoc(doc(db, `communityProfiles/${A}`)));
    // Their own profile and notifications stay readable.
    await assertSucceeds(getDoc(doc(db, `communityProfiles/${B}`)));
    as(B);
    const { items } = await repo.fetchNotifications(B, null);
    expect(items[0]).toMatchObject({ type: "banned", reason: "Spam account", from: "mod" });
    // A banned member can't unban themselves by editing their profile.
    await assertFails(updateDoc(doc(db, `communityProfiles/${B}`), { banned: false }));
    as(M);
    await repo.unbanMember(M, B);
    await assertSucceeds(getDoc(doc(dbFor(B), `communityPosts/${id}`)));
  });
});

describe("notifications", () => {
  it("answers, replies, mentions and accepted answers notify the right member, once", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    expect((await inbox(A)).map((n) => n.id)).toEqual([`response_${id}_${r}`]);
    const reply = await respond(A, id, r, M); // A replies to B's answer and mentions M
    expect((await inbox(B)).map((n) => n.id)).toEqual([`reply_${id}_${reply}`]);
    expect((await inbox(M)).map((n) => n.id)).toEqual([`mention_${id}_${reply}`]);
    as(A);
    await repo.setAccepted(A, id, r);
    expect((await inbox(B)).map((n) => n.type).sort()).toEqual(["accepted", "reply"]);
    // Removing acceptance and accepting again notifies again (same notification, unread).
    as(B);
    await repo.markNotificationsRead(B, [`accepted_${id}_${r}`]);
    as(A);
    await repo.setAccepted(A, id, null);
    await repo.setAccepted(A, id, r);
    expect((await read(`communityInbox/${B}/notifications/accepted_${id}_${r}`))?.read).toBe(false);
    // Nobody is notified about their own answer.
    await respond(A, id);
    expect((await inbox(A)).length).toBe(1);
  });

  it("can't be forged, and only their owner can read, mark or delete them", async () => {
    const id = await post(A);
    const r = await respond(B, id);
    const nid = `response_${id}_${r}`;
    // Someone else's inbox: no reading, marking or deleting.
    await assertFails(getDoc(doc(dbFor(B), `communityInbox/${A}/notifications/${nid}`)));
    await assertFails(updateDoc(doc(dbFor(B), `communityInbox/${A}/notifications/${nid}`), { read: true }));
    await assertFails(deleteDoc(doc(dbFor(B), `communityInbox/${A}/notifications/${nid}`)));
    // Forged notifications: no matching action in the same request, the wrong recipient, or a fake moderator.
    const db = dbFor(B);
    const fake = (type: string, response: string, from = B, extra: Record<string, unknown> = {}) => ({
      type, from, post: id, response, reason: "", until: null, at: serverTimestamp(), read: false, ...extra,
    });
    await assertFails(setDoc(doc(db, `communityInbox/${A}/notifications/response_${id}_${r}x`), fake("response", `${r}x`)));
    await assertFails(setDoc(doc(db, `communityInbox/${M}/notifications/response_${id}_${r}`), fake("response", r)));
    await assertFails(setDoc(doc(db, `communityInbox/${A}/notifications/mod_${repo.newId()}`), fake("warning", r, "mod", { post: null, response: null })));
    // The owner can read, mark read and delete.
    as(A);
    const { items } = await repo.fetchNotifications(A, null);
    expect(items.map((n) => n.id)).toEqual([nid]);
    expect(await repo.fetchUnreadCount(A)).toBe(1);
    await repo.markNotificationsRead(A, [nid]);
    expect(await repo.fetchUnreadCount(A)).toBe(0);
    await assertFails(updateDoc(doc(dbFor(A), `communityInbox/${A}/notifications/${nid}`), { type: "warning" }));
    await repo.deleteNotification(A, nid);
    expect(await inbox(A)).toEqual([]);
  });

  it("moderators' warnings arrive from 'a moderator' and are logged", async () => {
    as(M);
    await repo.warnMember(M, A, "Please keep it friendly.");
    expect((await inbox(A))[0]).toMatchObject({ type: "warning", from: "mod", reason: "Please keep it friendly." });
    const log = await repo.fetchModLog();
    expect(log[0]).toMatchObject({ by: M, action: "warn", uid: A, reason: "Please keep it friendly." });
    as(A);
    await expect(repo.warnMember(A, B, "Fake warning")).rejects.toThrow();
  });
});
