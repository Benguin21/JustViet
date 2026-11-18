/**
 * Firestore reads and writes for the Community, the only Community file that
 * imports `firebase/firestore` (see types.ts for the data model).
 *
 * Every action that moves a count is one transaction, mirroring the XP
 * ledger: it reads what it changes, then writes the item, the counts it
 * moves (a post's responses, an author's votes received…) and the member's
 * `communityActivity` record (the rate limits, plus which item this request
 * acts on) together or not at all. firestore.rules checks each write against
 * the others, so a count can't move by the wrong amount. Creates use ids
 * chosen in advance (once per draft) and do nothing if the doc already
 * exists, so a retry or a double click can't post twice.
 *
 * Reads are one-time (`getDoc`/`getDocs`), like the rest of the app.
 */
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryConstraint,
  type QuerySnapshot,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlreadyReportedError, GoneError, NameTakenError, RateLimitError, RenameTooSoonError, ReportLimitError } from "./errors";
import {
  FEED_PAGE,
  POST_INTERVAL_S,
  RESPONSE_INTERVAL_S,
  VOTE_INTERVAL_S,
  reportsLeft,
  utcDay,
  waitSeconds,
} from "./limits";
import { cleanName, nameKey, nameProblem, renameStatus } from "./names";
import { cleanBody, cleanTitle, postDeleteMode, responseDeleteMode, topWindowStart, validatePost, validateResponse, type PostInput } from "./posts";
import { searchTokens } from "./search";
import { applyVote, isVoteValue, nextVote, voteId } from "./votes";
import {
  EMPTY_ACTIVITY,
  isCategory,
  isPostType,
  type Activity,
  type CategoryId,
  type CommunityProfile,
  type FeedSort,
  type ItemRef,
  type Post,
  type ReportReason,
  type ReportTarget,
  type Response,
  type TopWindow,
  type TypeFilter,
  type VoteValue,
} from "./types";

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  }
  return db;
}

const ageRef = (uid: string) => doc(requireDb(), "communityAge", uid);
const profileRef = (uid: string) => doc(requireDb(), "communityProfiles", uid);
const nameRef = (key: string) => doc(requireDb(), "communityNames", key);
const activityRef = (uid: string) => doc(requireDb(), "communityActivity", uid);
const postsCol = () => collection(requireDb(), "communityPosts");
const postRef = (id: string) => doc(requireDb(), "communityPosts", id);
const responsesCol = (postId: string) => collection(requireDb(), "communityPosts", postId, "responses");
const responseRef = (postId: string, id: string) => doc(requireDb(), "communityPosts", postId, "responses", id);
const itemRef = (item: ItemRef) => (item.response == null ? postRef(item.post) : responseRef(item.post, item.response));
const voteRef = (id: string) => doc(requireDb(), "communityVotes", id);
const reportRef = (id: string) => doc(requireDb(), "communityReports", id);
const hiddenRef = (uid: string, postId: string) => doc(requireDb(), "users", uid, "communityHidden", postId);
const blockRef = (uid: string, other: string) => doc(requireDb(), "users", uid, "communityBlocks", other);

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** A new 20-character id, the same shape as Firestore's auto-ids. Chosen once per draft. */
export function newId(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += ID_CHARS[b % ID_CHARS.length];
  return id;
}

// ------------------------------------------------------------ converters

function ms(v: unknown): number | null {
  return v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);

function readProfile(uid: string, d: DocumentData): CommunityProfile {
  return {
    uid,
    name: str(d.name),
    nameKey: str(d.nameKey),
    color: str(d.color),
    up: num(d.up),
    down: num(d.down),
    // A pending server timestamp reads as null in this browser until it lands.
    joinedAt: ms(d.joinedAt) ?? Date.now(),
    nameChangedAt: ms(d.nameChangedAt),
    guidelinesAt: ms(d.guidelinesAt),
  };
}

function readPost(id: string, d: DocumentData): Post {
  return {
    id,
    type: isPostType(d.type) ? d.type : "question",
    category: isCategory(d.category) ? d.category : "other",
    title: str(d.title),
    body: str(d.body),
    author: str(d.author),
    createdAt: ms(d.createdAt) ?? Date.now(),
    editedAt: ms(d.editedAt),
    up: num(d.up),
    down: num(d.down),
    score: num(d.score),
    responses: num(d.responses),
    erased: num(d.erased),
    accepted: strOrNull(d.accepted),
    deleted: d.deleted === true,
  };
}

function readResponse(id: string, d: DocumentData): Response {
  return {
    id,
    post: str(d.post),
    parent: strOrNull(d.parent),
    author: str(d.author),
    body: str(d.body),
    createdAt: ms(d.createdAt) ?? Date.now(),
    editedAt: ms(d.editedAt),
    up: num(d.up),
    down: num(d.down),
    score: num(d.score),
    replies: num(d.replies),
    deleted: d.deleted === true,
    mention: strOrNull(d.mention),
  };
}

function readActivity(d: DocumentData | undefined): Activity {
  if (!d) return EMPTY_ACTIVITY;
  return {
    lastPost: ms(d.lastPost),
    lastResponse: ms(d.lastResponse),
    lastVote: ms(d.lastVote),
    reportDay: num(d.reportDay),
    reports: num(d.reports),
  };
}

/**
 * The whole activity record to write: unchanged fields copied back exactly
 * as read (the rules compare them), the changed ones, and this request's
 * action (`act`, `target`, `at`).
 */
function activityWrite(raw: DocumentData | undefined, act: string, target: string, changes: Record<string, unknown> = {}) {
  return {
    lastPost: raw?.lastPost ?? null,
    lastResponse: raw?.lastResponse ?? null,
    lastVote: raw?.lastVote ?? null,
    reportDay: raw?.reportDay ?? 0,
    reports: raw?.reports ?? 0,
    ...changes,
    act,
    target,
    at: serverTimestamp(),
  };
}

async function readActivityIn(tx: Transaction, uid: string) {
  const snap = await tx.get(activityRef(uid));
  const raw = snap.exists() ? snap.data() : undefined;
  return { raw, activity: readActivity(raw) };
}

// --------------------------------------------------------------- account

export interface CommunityAccount {
  /** The 13+ answer: true, false (under 13) or null (not asked yet). */
  over13: boolean | null;
  profile: CommunityProfile | null;
  activity: Activity;
  hidden: string[];
  blocked: string[];
}

/** Everything the Community needs about the signed-in member. Needs a verified email. */
export async function fetchAccount(uid: string): Promise<CommunityAccount> {
  const age = await getDoc(ageRef(uid));
  const over13 = age.exists() ? age.data().over13 === true : null;
  const empty = { over13, profile: null, activity: EMPTY_ACTIVITY, hidden: [], blocked: [] };
  if (over13 !== true) return empty;
  const prof = await getDoc(profileRef(uid));
  if (!prof.exists()) return empty;
  const [act, hidden, blocked] = await Promise.all([
    getDoc(activityRef(uid)),
    getDocs(collection(requireDb(), "users", uid, "communityHidden")),
    getDocs(collection(requireDb(), "users", uid, "communityBlocks")),
  ]);
  return {
    over13,
    profile: readProfile(uid, prof.data()),
    activity: readActivity(act.exists() ? act.data() : undefined),
    hidden: hidden.docs.map((d) => d.id),
    blocked: blocked.docs.map((d) => d.id),
  };
}

/** Saves the 13+ answer once. If one is already saved, that one stands and is returned. */
export async function answerAge(uid: string, over13: boolean): Promise<boolean> {
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(ageRef(uid));
    if (snap.exists()) return snap.data().over13 === true;
    tx.set(ageRef(uid), { over13, at: serverTimestamp() });
    return over13;
  });
}

/** Creates the community profile and claims its name, together. */
export async function joinCommunity(uid: string, rawName: string, color: string): Promise<CommunityProfile> {
  const name = cleanName(rawName);
  const problem = nameProblem(name);
  if (problem) throw new Error(problem);
  const key = nameKey(name);
  return runTransaction(requireDb(), async (tx) => {
    const existing = await tx.get(profileRef(uid));
    if (existing.exists()) return readProfile(uid, existing.data());
    const claim = await tx.get(nameRef(key));
    if (claim.exists() && claim.data().uid !== uid) throw new NameTakenError();
    const profile = { name, nameKey: key, color, up: 0, down: 0, joinedAt: serverTimestamp(), nameChangedAt: null, guidelinesAt: null };
    if (!claim.exists()) tx.set(nameRef(key), { uid });
    tx.set(profileRef(uid), profile);
    return { uid, name, nameKey: key, color, up: 0, down: 0, joinedAt: Date.now(), nameChangedAt: null, guidelinesAt: null };
  });
}

/** Changes the name (at most once every 30 days), claiming the new one and releasing the old. */
export async function renameProfile(uid: string, rawName: string): Promise<CommunityProfile> {
  const name = cleanName(rawName);
  const problem = nameProblem(name);
  if (problem) throw new Error(problem);
  const key = nameKey(name);
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(profileRef(uid));
    if (!snap.exists()) throw new GoneError("Join the Community first.");
    const cur = readProfile(uid, snap.data());
    if (cur.name === name) return cur;
    const status = renameStatus(cur.nameChangedAt, Date.now());
    if (!status.allowed && status.nextAt) throw new RenameTooSoonError(status.nextAt);
    if (key !== cur.nameKey) {
      const claim = await tx.get(nameRef(key));
      if (claim.exists() && claim.data().uid !== uid) throw new NameTakenError();
      if (!claim.exists()) tx.set(nameRef(key), { uid });
      tx.delete(nameRef(cur.nameKey));
    }
    tx.update(profileRef(uid), { name, nameKey: key, nameChangedAt: serverTimestamp() });
    return { ...cur, name, nameKey: key, nameChangedAt: Date.now() };
  });
}

export async function setAvatarColor(uid: string, color: string): Promise<void> {
  await updateDoc(profileRef(uid), { color });
}

/** Records that the member accepted the community guidelines (once). */
export async function acceptGuidelines(uid: string): Promise<void> {
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(profileRef(uid));
    if (!snap.exists() || snap.data().guidelinesAt != null) return;
    tx.update(profileRef(uid), { guidelinesAt: serverTimestamp() });
  });
}

// --------------------------------------------------------------- profiles

export async function fetchProfile(uid: string): Promise<CommunityProfile | null> {
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? readProfile(uid, snap.data()) : null;
}

/** Several profiles at once (30 per query, the `in` limit). Missing ones are left out. */
export async function fetchProfiles(uids: string[]): Promise<CommunityProfile[]> {
  const ids = [...new Set(uids.filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
  const snaps = await Promise.all(
    chunks.map((c) => getDocs(query(collection(requireDb(), "communityProfiles"), where(documentId(), "in", c), limit(30)))),
  );
  return snaps.flatMap((s) => s.docs.map((d) => readProfile(d.id, d.data())));
}

// ------------------------------------------------------------------ feed

export interface FeedQuery {
  sort: FeedSort;
  window: TopWindow;
  category: CategoryId | "all";
  type: TypeFilter;
}

export interface Page<T> {
  items: T[];
  /** Where the next page starts, or null when there are no more. */
  cursor: DocumentSnapshot | null;
}

/**
 * One page of the feed. Every combination of filters has a composite index
 * in firestore.indexes.json (filters are always applied in this order:
 * deleted, category, type, responses, then the sort).
 */
export async function fetchFeed(q: FeedQuery, after: DocumentSnapshot | null, now: number): Promise<Page<Post>> {
  const c: QueryConstraint[] = [where("deleted", "==", false)];
  if (q.category !== "all") c.push(where("category", "==", q.category));
  if (q.sort === "unanswered") {
    c.push(where("type", "==", "question"), where("responses", "==", 0), orderBy("createdAt", "desc"));
  } else {
    if (q.type !== "all") c.push(where("type", "==", q.type));
    if (q.sort === "top") {
      const since = topWindowStart(q.window, now);
      if (since != null) c.push(where("createdAt", ">=", Timestamp.fromMillis(since)));
      c.push(orderBy("score", "desc"), orderBy("createdAt", "desc"));
    } else {
      c.push(orderBy("createdAt", "desc"));
    }
  }
  if (after) c.push(startAfter(after));
  c.push(limit(FEED_PAGE + 1));
  return page(await getDocs(query(postsCol(), ...c)));
}

function page(snap: QuerySnapshot<DocumentData>): Page<Post> {
  const docs = snap.docs.slice(0, FEED_PAGE);
  return {
    items: docs.map((d) => readPost(d.id, d.data())),
    cursor: snap.docs.length > FEED_PAGE ? docs[docs.length - 1] : null,
  };
}

/** Posts containing `token` (see search.ts), newest first. Deleted posts have no tokens. */
export async function searchPosts(token: string): Promise<Post[]> {
  const snap = await getDocs(query(postsCol(), where("tokens", "array-contains", token), orderBy("createdAt", "desc"), limit(60)));
  return snap.docs.map((d) => readPost(d.id, d.data()));
}

/** Candidates for "related posts" while writing: posts with any of the title's words. */
export async function relatedPostCandidates(tokens: string[]): Promise<Post[]> {
  if (tokens.length === 0) return [];
  const snap = await getDocs(
    query(postsCol(), where("tokens", "array-contains-any", tokens.slice(0, 10)), orderBy("createdAt", "desc"), limit(30)),
  );
  return snap.docs.map((d) => readPost(d.id, d.data()));
}

/** A member's posts that aren't deleted (deleted posts no longer name their author), newest first. */
export async function fetchUserPosts(uid: string, after: DocumentSnapshot | null): Promise<Page<Post>> {
  const c: QueryConstraint[] = [where("author", "==", uid), orderBy("createdAt", "desc")];
  if (after) c.push(startAfter(after));
  c.push(limit(FEED_PAGE + 1));
  return page(await getDocs(query(postsCol(), ...c)));
}

// ---------------------------------------------------------------- posts

export async function fetchPost(id: string): Promise<Post | null> {
  const snap = await getDoc(postRef(id));
  return snap.exists() ? readPost(id, snap.data()) : null;
}

/** All of a post's responses and replies, oldest first. */
export async function fetchResponses(postId: string): Promise<Response[]> {
  const snap = await getDocs(query(responsesCol(postId), orderBy("createdAt", "asc"), limit(1000)));
  return snap.docs.map((d) => readResponse(d.id, d.data()));
}

/** The member's own votes on a post and its responses: "" for the post, else the response id. */
export async function fetchMyVotes(uid: string, postId: string): Promise<Record<string, VoteValue>> {
  const snap = await getDocs(query(collection(requireDb(), "communityVotes"), where("voter", "==", uid), where("post", "==", postId)));
  const out: Record<string, VoteValue> = {};
  for (const d of snap.docs) {
    const v = d.data();
    if (isVoteValue(v.value)) out[typeof v.response === "string" ? v.response : ""] = v.value;
  }
  return out;
}

function postFields(input: PostInput) {
  const errors = validatePost(input);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  const title = cleanTitle(input.title);
  const body = cleanBody(input.body);
  return { type: input.type, category: input.category as CategoryId, title, body, tokens: searchTokens(title, body) };
}

/** Publishes a post under the draft's id. If that id already exists (a retry), returns it instead. */
export async function createPost(uid: string, id: string, input: PostInput): Promise<{ post: Post; duplicate: boolean }> {
  const f = postFields(input);
  return runTransaction(requireDb(), async (tx) => {
    const existing = await tx.get(postRef(id));
    if (existing.exists()) return { post: readPost(id, existing.data()), duplicate: true };
    const { raw, activity } = await readActivityIn(tx, uid);
    const wait = waitSeconds(activity.lastPost, Date.now(), POST_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const base = { author: uid, editedAt: null, up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false };
    const { tokens, ...shown } = f;
    tx.set(postRef(id), { ...shown, tokens, ...base, createdAt: serverTimestamp() });
    tx.set(activityRef(uid), activityWrite(raw, "post", id, { lastPost: serverTimestamp() }));
    return { post: { id, ...shown, ...base, createdAt: Date.now() }, duplicate: false };
  });
}

/** The author edits a post. The type can only change while it has no responses. */
export async function editPost(post: Post, input: PostInput): Promise<Post> {
  const f = postFields(input);
  const type = post.responses === 0 && post.erased === 0 && post.accepted == null ? f.type : post.type;
  const { tokens, ...shown } = f;
  await updateDoc(postRef(post.id), { ...shown, tokens, type, editedAt: serverTimestamp() });
  return { ...post, ...shown, type, editedAt: Date.now() };
}

/**
 * The author deletes a post: outright if nothing is under it, otherwise its
 * title, body and author are erased for good and it stays as "deleted by its
 * author" so its responses keep their place. Either way its votes come off
 * the author's Community XP in the same transaction.
 */
export async function deletePost(uid: string, postId: string): Promise<"removed" | "erased"> {
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(postRef(postId));
    if (!snap.exists()) return "removed";
    const p = readPost(postId, snap.data());
    if (p.author !== uid || p.deleted) throw new GoneError();
    const prof = readProfile(uid, (await tx.get(profileRef(uid))).data() ?? {});
    const { raw } = await readActivityIn(tx, uid);
    const mode = postDeleteMode(p);
    if (mode === "remove") tx.delete(postRef(postId));
    else tx.update(postRef(postId), { title: "", body: "", author: "", deleted: true, tokens: [], up: 0, down: 0, score: 0 });
    if (p.up || p.down) tx.update(profileRef(uid), { up: prof.up - p.up, down: prof.down - p.down });
    tx.set(activityRef(uid), activityWrite(raw, "delete", postId));
    return mode === "remove" ? "removed" : "erased";
  });
}

/** The asker accepts an answer (or switches, or clears with null). Awards nothing. */
export async function setAccepted(postId: string, responseId: string | null): Promise<void> {
  await updateDoc(postRef(postId), { accepted: responseId });
}

// ------------------------------------------------------------- responses

export interface ResponseInput {
  body: string;
  /** The top-level response this replies to, or null for an answer/comment. */
  parent: string | null;
  /** For a reply to a reply: whom it answers (its body starts with "@Name"). */
  mention: string | null;
}

/** Adds an answer/comment or a reply under the draft's id; a retry returns the existing one. */
export async function createResponse(uid: string, postId: string, id: string, input: ResponseInput): Promise<{ response: Response; duplicate: boolean }> {
  const problem = validateResponse(input.body, input.parent != null);
  if (problem) throw new Error(problem);
  const body = cleanBody(input.body);
  return runTransaction(requireDb(), async (tx) => {
    const existing = await tx.get(responseRef(postId, id));
    if (existing.exists()) return { response: readResponse(id, existing.data()), duplicate: true };
    const ps = await tx.get(postRef(postId));
    if (!ps.exists() || ps.data().deleted === true) throw new GoneError("This post was deleted, so it can't get new responses.");
    const post = readPost(postId, ps.data());
    let parent: Response | null = null;
    if (input.parent) {
      const rs = await tx.get(responseRef(postId, input.parent));
      parent = rs.exists() ? readResponse(input.parent, rs.data()) : null;
      if (!parent || parent.deleted || parent.parent != null) throw new GoneError("That response was deleted, so it can't get replies.");
    }
    const { raw, activity } = await readActivityIn(tx, uid);
    const wait = waitSeconds(activity.lastResponse, Date.now(), RESPONSE_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const fields = {
      post: postId,
      parent: input.parent,
      author: uid,
      body,
      editedAt: null,
      up: 0,
      down: 0,
      score: 0,
      replies: 0,
      deleted: false,
      mention: input.parent ? input.mention : null,
    };
    tx.set(responseRef(postId, id), { ...fields, createdAt: serverTimestamp() });
    if (parent) tx.update(responseRef(postId, parent.id), { replies: parent.replies + 1 });
    else tx.update(postRef(postId), { responses: post.responses + 1 });
    tx.set(activityRef(uid), activityWrite(raw, "respond", `${postId}/${id}`, { lastResponse: serverTimestamp() }));
    return { response: { id, ...fields, createdAt: Date.now() }, duplicate: false };
  });
}

export async function editResponse(r: Response, rawBody: string): Promise<Response> {
  const problem = validateResponse(rawBody, r.parent != null);
  if (problem) throw new Error(problem);
  const body = cleanBody(rawBody);
  await updateDoc(responseRef(r.post, r.id), { body, editedAt: serverTimestamp() });
  return { ...r, body, editedAt: Date.now() };
}

/**
 * The author deletes a response: a top-level one with replies is erased (so
 * the replies stay under "deleted by its author"), anything else is removed.
 * Its votes come off the author's Community XP, the post's count drops, and
 * acceptance clears if it was the accepted answer, all in one transaction.
 */
export async function deleteResponse(uid: string, postId: string, responseId: string): Promise<"removed" | "erased"> {
  return runTransaction(requireDb(), async (tx) => {
    const rs = await tx.get(responseRef(postId, responseId));
    if (!rs.exists()) return "removed";
    const r = readResponse(responseId, rs.data());
    if (r.author !== uid || r.deleted) throw new GoneError();
    const mode = responseDeleteMode(r);
    if (r.parent == null) {
      const post = readPost(postId, (await tx.get(postRef(postId))).data() ?? {});
      const prof = r.up || r.down ? readProfile(uid, (await tx.get(profileRef(uid))).data() ?? {}) : null;
      const { raw } = await readActivityIn(tx, uid);
      if (mode === "remove") tx.delete(responseRef(postId, responseId));
      else tx.update(responseRef(postId, responseId), { body: "", author: "", deleted: true, up: 0, down: 0, score: 0 });
      tx.update(postRef(postId), {
        responses: post.responses - 1,
        erased: post.erased + (mode === "erase" ? 1 : 0),
        accepted: post.accepted === responseId ? null : post.accepted,
      });
      if (prof) tx.update(profileRef(uid), { up: prof.up - r.up, down: prof.down - r.down });
      tx.set(activityRef(uid), activityWrite(raw, "delete", `${postId}/${responseId}`));
    } else {
      const parent = readResponse(r.parent, (await tx.get(responseRef(postId, r.parent))).data() ?? {});
      const { raw } = await readActivityIn(tx, uid);
      tx.delete(responseRef(postId, responseId));
      tx.update(responseRef(postId, r.parent), { replies: parent.replies - 1 });
      tx.set(activityRef(uid), activityWrite(raw, "delete", `${postId}/${responseId}`));
    }
    return mode === "remove" ? "removed" : "erased";
  });
}

// ---------------------------------------------------------------- votes

export interface VoteResult {
  value: VoteValue;
  up: number;
  down: number;
  score: number;
}

/**
 * Clicks up (1) or down (−1) on a post or top-level response: adds,
 * switches or removes the member's vote, and moves the item's counts and
 * its author's Community XP by exactly that much, in one transaction.
 */
export async function castVote(uid: string, item: ItemRef, clicked: 1 | -1): Promise<VoteResult> {
  const vid = voteId(item.post, item.response, uid);
  return runTransaction(requireDb(), async (tx) => {
    const vs = await tx.get(voteRef(vid));
    const before: VoteValue = vs.exists() && isVoteValue(vs.data().value) ? vs.data().value : 0;
    const is = await tx.get(itemRef(item));
    if (!is.exists() || is.data().deleted === true) throw new GoneError("This was deleted, so it can't be voted on.");
    const data = is.data();
    const author = str(data.author);
    if (author === uid) throw new Error("You can't vote on your own post.");
    if (item.response != null && data.parent != null) throw new Error("Replies can't be voted on.");
    const prof = readProfile(author, (await tx.get(profileRef(author))).data() ?? {});
    const { raw, activity } = await readActivityIn(tx, uid);
    const wait = waitSeconds(activity.lastVote, Date.now(), VOTE_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const after = nextVote(before, clicked);
    const counts = applyVote({ up: num(data.up), down: num(data.down) }, before, after);
    const totals = applyVote({ up: prof.up, down: prof.down }, before, after);
    tx.set(voteRef(vid), { voter: uid, post: item.post, response: item.response, author, value: after, at: serverTimestamp() });
    tx.update(itemRef(item), { up: counts.up, down: counts.down, score: counts.score });
    tx.update(profileRef(author), { up: totals.up, down: totals.down });
    tx.set(activityRef(uid), activityWrite(raw, "vote", vid, { lastVote: serverTimestamp() }));
    return { value: after, up: counts.up, down: counts.down, score: counts.score };
  });
}

// --------------------------------------------------------------- reports

export function reportId(uid: string, target: ReportTarget): string {
  switch (target.kind) {
    case "post":
      return `${uid}_p_${target.post}`;
    case "response":
    case "reply":
      return `${uid}_r_${target.post}_${target.response}`;
    case "profile":
      return `${uid}_u_${target.uid}`;
  }
}

/** Files a report (one per member and item, at most 20 a day). Removes nothing by itself. */
export async function fileReport(uid: string, target: ReportTarget, reason: ReportReason, rawNote: string): Promise<void> {
  const id = reportId(uid, target);
  const note = rawNote.normalize("NFC").trim().slice(0, 500);
  await runTransaction(requireDb(), async (tx) => {
    if ((await tx.get(reportRef(id))).exists()) throw new AlreadyReportedError();
    const { raw, activity } = await readActivityIn(tx, uid);
    const now = Date.now();
    if (reportsLeft(activity.reportDay, activity.reports, now) <= 0) throw new ReportLimitError();
    const day = utcDay(now);
    tx.set(reportRef(id), {
      reporter: uid,
      kind: target.kind,
      post: target.kind === "profile" ? null : target.post,
      response: target.kind === "response" || target.kind === "reply" ? target.response : null,
      profile: target.kind === "profile" ? target.uid : null,
      reason,
      note,
      at: serverTimestamp(),
      status: "open",
    });
    tx.set(
      activityRef(uid),
      activityWrite(raw, "report", id, { reportDay: day, reports: (activity.reportDay === day ? activity.reports : 0) + 1 }),
    );
  });
}

// ------------------------------------------------------- hiding, blocking

async function createOnce(ref: ReturnType<typeof hiddenRef>) {
  await runTransaction(requireDb(), async (tx) => {
    if ((await tx.get(ref)).exists()) return;
    tx.set(ref, { at: serverTimestamp() });
  });
}

export const hidePost = (uid: string, postId: string) => createOnce(hiddenRef(uid, postId));
export const unhidePost = (uid: string, postId: string) => deleteDoc(hiddenRef(uid, postId));
export const blockMember = (uid: string, other: string) => createOnce(blockRef(uid, other));
export const unblockMember = (uid: string, other: string) => deleteDoc(blockRef(uid, other));
