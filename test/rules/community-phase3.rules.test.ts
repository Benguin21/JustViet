/**
 * Community Phase 3 against the Firestore emulator: daily caps (lower for new members), no
 * links, a moderator resetting a name or voiding someone's votes, and deleting an account.
 * Run with `npm run test:rules`.
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
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
import { deleteLearningData } from "@/lib/account/repository";
import { DailyLimitError, SuspendedError } from "@/lib/community/errors";
import { utcDay } from "@/lib/community/limits";

let env: RulesTestEnvironment;
const A = "alice";
const B = "bob";
const M = "mona"; // moderator
const N = "nina"; // new member (joined today)
const DAY = 86_400_000;

const QUESTION = {
  type: "question" as const,
  category: "grammar",
  title: "How do I use được after verbs?",
  body: "I keep seeing được after verbs and I'm not sure what it adds.",
};

function dbFor(uid: string, mod = false): Firestore {
  return env.authenticatedContext(uid, { email_verified: true, ...(mod ? { moderator: true } : {}) }).firestore() as unknown as Firestore;
}
function as(uid: string): Firestore {
  holder.db = dbFor(uid, uid === M);
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
async function count(path: string): Promise<number> {
  let n = 0;
  await env.withSecurityRulesDisabled(async (ctx) => {
    n = (await getDocs(collection(ctx.firestore() as unknown as Firestore, path))).size;
  });
  return n;
}
const profileOf = async (uid: string) => (await read(`communityProfiles/${uid}`)) as { up: number; down: number; name: string; nameKey: string; nameReset?: boolean } | undefined;

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
/** Sets today's counts directly, to test the caps without hundreds of actions. */
async function setCounts(uid: string, counts: { dayPosts?: number; dayResponses?: number; dayVotes?: number }, day = utcDay(Date.now())) {
  const cur = (await read(`communityActivity/${uid}`)) ?? {
    lastPost: null, lastResponse: null, lastVote: null, reportDay: 0, reports: 0, act: "none", target: "", at: Timestamp.now(),
  };
  await seed(`communityActivity/${uid}`, { dayPosts: 0, dayResponses: 0, dayVotes: 0, ...cur, ...counts, countDay: day });
}

async function join(uid: string, name: string, seasoned = true) {
  as(uid);
  await repo.answerAge(uid, true);
  await repo.joinCommunity(uid, name, "teal");
  await repo.acceptGuidelines(uid);
  if (seasoned) {
    const prof = (await read(`communityProfiles/${uid}`))!;
    await seed(`communityProfiles/${uid}`, { ...prof, joinedAt: Timestamp.fromMillis(Date.now() - 30 * DAY) });
  }
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
async function vote(uid: string, postId: string, response: string | null, clicked: 1 | -1) {
  as(uid);
  await clearLimits(uid);
  return repo.castVote(uid, { post: postId, response }, clicked);
}
/** A hand-written post with an activity record whose counts the test chooses. */
async function forgePost(uid: string, counts: Record<string, unknown>, body = QUESTION.body, title = QUESTION.title) {
  const db = dbFor(uid);
  const cur = (await read(`communityActivity/${uid}`)) ?? {};
  const id = repo.newId();
  const b = writeBatch(db);
  b.set(doc(db, `communityPosts/${id}`), {
    ...QUESTION, title, body, tokens: [], author: uid, createdAt: serverTimestamp(), editedAt: null,
    up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false,
  });
  b.set(doc(db, `communityActivity/${uid}`), {
    lastPost: serverTimestamp(), lastResponse: cur.lastResponse ?? null, lastVote: cur.lastVote ?? null,
    reportDay: cur.reportDay ?? 0, reports: cur.reports ?? 0, suspendedUntil: cur.suspendedUntil ?? null,
    countDay: utcDay(Date.now()), dayPosts: 0, dayResponses: 0, dayVotes: 0, ...counts,
    act: "post", target: id, at: serverTimestamp(),
  });
  return b.commit();
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
  await join(N, "Nina", false);
});

describe("daily caps", () => {
  it("count every post, response and vote, per UTC day", async () => {
    const id = await post(A);
    await respond(B, id);
    await vote(B, id, null, 1);
    expect(await read(`communityActivity/${A}`)).toMatchObject({ countDay: utcDay(Date.now()), dayPosts: 1 });
    expect(await read(`communityActivity/${B}`)).toMatchObject({ dayResponses: 1, dayVotes: 1, dayPosts: 0 });
  });

  it("stop posts, responses and votes at the cap until the next day", async () => {
    const id = await post(A);
    await setCounts(B, { dayPosts: 10, dayResponses: 100, dayVotes: 300 });
    as(B);
    await expect(repo.createPost(B, repo.newId(), QUESTION)).rejects.toBeInstanceOf(DailyLimitError);
    await expect(repo.createResponse(B, id, repo.newId(), { body: "Hi", parent: null, mention: null })).rejects.toBeInstanceOf(DailyLimitError);
    await expect(repo.castVote(B, { post: id, response: null }, 1)).rejects.toBeInstanceOf(DailyLimitError);
    // By hand: the 11th post is refused, and so is claiming the count is still lower.
    await assertFails(forgePost(B, { dayPosts: 11 }));
    await assertFails(forgePost(B, { dayPosts: 1 }));
    await assertFails(forgePost(B, { dayPosts: 10 }));
    // Yesterday's counts don't carry over.
    await setCounts(B, { dayPosts: 10 }, utcDay(Date.now()) - 1);
    await assertSucceeds(forgePost(B, { dayPosts: 1, dayResponses: 0, dayVotes: 0 }));
  });

  it("are lower for a member's first 3 days", async () => {
    as(N);
    await repo.createPost(N, repo.newId(), QUESTION);
    await clearLimits(N);
    await repo.createPost(N, repo.newId(), QUESTION);
    await clearLimits(N);
    await repo.createPost(N, repo.newId(), QUESTION);
    await clearLimits(N);
    await expect(repo.createPost(N, repo.newId(), QUESTION)).rejects.toThrow(/3 posts for new members/);
    await assertFails(forgePost(N, { dayPosts: 4 }));
    // A seasoned member at the same count can still post.
    await setCounts(A, { dayPosts: 3 });
    await assertSucceeds(forgePost(A, { dayPosts: 4 }));
  });
});

describe("links", () => {
  it("are refused in posts and titles, for every member, however they're written", async () => {
    await expect(post(A, { ...QUESTION, body: `${QUESTION.body} https://example.com` })).rejects.toThrow(/Links aren't allowed/);
    for (const extra of [" https://example.com", " HTTPS://sneaky.example", "\nwww.example.org", " join t.me/spam", " bit.ly", "\n\nmy-site.COM/page"]) {
      await assertFails(forgePost(A, { dayPosts: 1 }, QUESTION.body + extra));
    }
    await assertFails(forgePost(A, { dayPosts: 1 }, QUESTION.body, "Read about it on example.com"));
    // Ordinary dotted text is fine.
    await assertSucceeds(forgePost(A, { dayPosts: 1 }, `${QUESTION.body} v.v. e.g. 3.5 TP.HCM Node.js`));
  });

  it("are refused in answers, comments and replies, and in edits", async () => {
    const id = await post(A);
    await expect(respond(N, id, null, "See www.example.com")).rejects.toThrow(/Links aren't allowed/);
    const rid = await respond(B, id, null, "A plain answer, v.v.");
    const rPath = `communityPosts/${id}/responses/${rid}`;
    await assertFails(updateDoc(doc(dbFor(B), rPath), { body: "Now with https://example.com", editedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(dbFor(B), rPath), { body: "Still plain.", editedAt: serverTimestamp() }));

    as(A);
    const p = await repo.fetchPost(id);
    await expect(repo.editPost(p!, { ...QUESTION, body: `${QUESTION.body} https://a.com` })).rejects.toThrow(/Links aren't allowed/);
    const pPath = `communityPosts/${id}`;
    await assertFails(updateDoc(doc(dbFor(A), pPath), { body: `${QUESTION.body} www.a.com`, editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor(A), pPath), { title: "Now see example.com", editedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(dbFor(A), pPath), { body: `${QUESTION.body} Edited.`, editedAt: serverTimestamp() }));
  });
});

describe("moderators reset offensive names", () => {
  it("to Member 123456; the member can then choose a new name at once", async () => {
    as(A);
    await repo.renameProfile(A, "Alice N"); // recently renamed: normally a 30-day wait
    await assertFails(updateDoc(doc(dbFor(B), `communityProfiles/${A}`), { name: "Member 123456", nameKey: "member 123456", nameReset: true }));
    as(M);
    const placeholder = await repo.resetMemberName(M, A, "Offensive name");
    expect(placeholder).toMatch(/^Member [0-9]{6}$/);
    expect(await profileOf(A)).toMatchObject({ name: placeholder, nameKey: placeholder.toLowerCase(), nameReset: true });
    expect(await read(`communityNames/${placeholder.toLowerCase()}`)).toEqual({ uid: A });
    expect(await read("communityNames/alice n")).toBeUndefined();
    // The member can't keep the flag on to rename again and again...
    await assertFails(updateDoc(doc(dbFor(A), `communityProfiles/${A}`), { nameReset: false }));
    as(A);
    await repo.renameProfile(A, "Alice Again");
    expect(await profileOf(A)).toMatchObject({ name: "Alice Again", nameReset: false });
    // ...so the 30-day wait applies again after that.
    await expect(repo.renameProfile(A, "Alice Third")).rejects.toThrow(/again on/);
  });
});

describe("moderators void a member's votes", () => {
  it("cancel every vote and fix everyone's Community XP", async () => {
    const p1 = await post(A);
    const r1 = await respond(A, p1);
    const p2 = await post(M);
    await vote(B, p1, null, 1);
    await vote(B, p1, r1, -1);
    await vote(B, p2, null, 1);
    expect(await profileOf(A)).toMatchObject({ up: 1, down: 1 });
    // Members can't see or void others' votes.
    await assertFails(getDocs(query(collection(dbFor(A), "communityVotes"), where("voter", "==", B))));
    await assertFails(updateDoc(doc(dbFor(A), `communityVotes/p_${p1}_${B}`), { value: 0, at: serverTimestamp() }));
    as(M);
    // Votes on the moderator's own post can't be voided by them (they're its author); the rest can.
    const cancelled = await repo.voidMemberVotes(M, B, "Vote manipulation");
    expect(cancelled).toBe(2);
    expect(await profileOf(A)).toMatchObject({ up: 0, down: 0 });
    expect(await read(`communityPosts/${p1}`)).toMatchObject({ up: 0, score: 0 });
    expect(await read(`communityVotes/p_${p1}_${B}`)).toMatchObject({ value: 0 });
  });
});

describe("deleting an account", () => {
  it("withdraws votes, deletes or erases content, and removes the profile, name and private data", async () => {
    const theirs = await post(A);
    const mine = await post(B);
    const alone = await post(B);
    const answer = await respond(B, theirs);
    const reply = await respond(A, theirs, answer, "Thanks!");
    await respond(B, mine);
    await respond(A, mine);
    await vote(B, theirs, null, 1);
    await vote(A, mine, null, 1);
    as(B);
    await repo.hidePost(B, theirs);
    await repo.blockMember(B, M);
    as(M);
    await repo.removeContent(M, { post: alone, response: null }, "Off-topic");
    // Learning data, and the XP ledger the browser can't delete.
    for (const [path, data] of [
      [`users/${B}/vocabCards/c1`, { front: "xin chào" }],
      [`users/${B}/reviewLogs/l1`, { cardId: "c1" }],
      [`users/${B}/settings/srs`, { retention: 0.9 }],
      [`users/${B}/dictionaryEntries/e1`, { headword: "phở" }],
      [`users/${B}/companion/profile`, { onboarded: true }],
      [`users/${B}/xp/total`, { total: 50, rev: 1, last: "x" }],
    ] as const) await seed(path, data);
    expect((await profileOf(A))?.up).toBe(1);

    as(B);
    await repo.deleteCommunityData(B);
    await deleteLearningData(B);

    // Their vote on Alice's post is withdrawn.
    expect((await profileOf(A))?.up).toBe(0);
    expect(await read(`communityPosts/${theirs}`)).toMatchObject({ up: 0 });
    // Their answer had a reply, so it's erased; Alice's reply stays.
    expect(await read(`communityPosts/${theirs}/responses/${answer}`)).toMatchObject({ author: "", body: "", deleted: true });
    expect(await read(`communityPosts/${theirs}/responses/${reply}`)).toMatchObject({ author: A });
    // Their post with answers is erased; the removed one's text is gone for good.
    expect(await read(`communityPosts/${mine}`)).toMatchObject({ author: "", title: "", deleted: true });
    expect(await read(`communityRemoved/p_${alone}`)).toBeUndefined();
    // Profile, name, notifications, hidden posts and blocks are gone; the name is free again.
    expect(await profileOf(B)).toBeUndefined();
    expect(await read("communityNames/bao")).toBeUndefined();
    expect(await count(`communityInbox/${B}/notifications`)).toBe(0);
    expect(await count(`users/${B}/communityHidden`)).toBe(0);
    expect(await count(`users/${B}/communityBlocks`)).toBe(0);
    // Learning data is gone; the XP ledger, 13+ answer and activity record wait for the purge script.
    for (const c of ["vocabCards", "reviewLogs", "settings", "dictionaryEntries", "companion"]) expect(await count(`users/${B}/${c}`)).toBe(0);
    expect(await read(`users/${B}/xp/total`)).toBeDefined();
    await assertFails(deleteDoc(doc(dbFor(B), `users/${B}/xp/total`)));
    expect(await read(`communityAge/${B}`)).toBeDefined();
    expect(await read(`communityActivity/${B}`)).toBeDefined();
    // Someone else can now take the name.
    as("carol");
    await repo.answerAge("carol", true);
    await assertSucceeds(repo.joinCommunity("carol", "Bao", "plum"));
  });

  it("can't drop the name claim or keep it, or escape a suspension", async () => {
    const db = dbFor(B);
    await assertFails(deleteDoc(doc(db, `communityProfiles/${B}`))); // without releasing the name
    await assertFails(deleteDoc(doc(db, "communityNames/bao"))); // while the profile still points at it
    await assertFails(deleteDoc(doc(db, `communityActivity/${B}`)));
    await assertFails(deleteDoc(doc(db, `communityAge/${B}`)));
    as(M);
    await repo.suspendMember(M, B, 7, "Spam");
    as(B);
    await repo.deleteCommunityData(B);
    expect(await profileOf(B)).toBeUndefined();
    // Rejoining doesn't lift the suspension: it lives on the activity record.
    await repo.joinCommunity(B, "Bảo Again", "teal");
    await repo.acceptGuidelines(B);
    await expect(repo.createPost(B, repo.newId(), QUESTION)).rejects.toBeInstanceOf(SuspendedError);
  });

  it("finds a member's own responses across posts, but nobody else's", async () => {
    const id = await post(A);
    await respond(B, id);
    await assertSucceeds(getDocs(query(collectionGroup(dbFor(B), "responses"), where("author", "==", B))));
    await assertFails(getDocs(query(collectionGroup(dbFor(A), "responses"), where("author", "==", B))));
  });
});
