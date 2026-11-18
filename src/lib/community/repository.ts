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
  collectionGroup,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getCountFromServer,
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
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type QueryConstraint,
  type QuerySnapshot,
  type Transaction,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import {
  AlreadyReportedError,
  GoneError,
  NameTakenError,
  RateLimitError,
  DailyLimitError,
  RenameTooSoonError,
  ReportLimitError,
  SuspendedError,
} from "./errors";
import {
  FEED_PAGE,
  POST_INTERVAL_S,
  RESPONSE_INTERVAL_S,
  VOTE_INTERVAL_S,
  countAction,
  dailyLeft,
  dailyLimitMessage,
  isNewMember,
  linkProblem,
  reportsLeft,
  type CountedAction,
  utcDay,
  waitSeconds,
} from "./limits";
import { isSuspended, placeholderName, removedKey, suspensionEnd, type ModAction, type ReportRecord } from "./moderation";
import { cleanName, nameKey, nameProblem, renameStatus } from "./names";
import {
  isModNotification,
  memberNotificationId,
  recipientsForResponse,
  type CommunityNotification,
  type ModNotificationType,
  type NotificationType,
} from "./notifications";
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
const removedRef = (key: string) => doc(requireDb(), "communityRemoved", key);
const modLogRef = (id: string) => doc(requireDb(), "communityModLog", id);
const inboxCol = (uid: string) => collection(requireDb(), "communityInbox", uid, "notifications");
const notificationRef = (uid: string, id: string) => doc(requireDb(), "communityInbox", uid, "notifications", id);

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
    banned: d.banned === true,
    nameReset: d.nameReset === true,
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
    removed: d.removed === true,
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
    removed: d.removed === true,
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
    suspendedUntil: ms(d.suspendedUntil),
    countDay: num(d.countDay),
    dayPosts: num(d.dayPosts),
    dayResponses: num(d.dayResponses),
    dayVotes: num(d.dayVotes),
  };
}

/**
 * The whole activity record to write: unchanged fields copied back exactly
 * as read (the rules compare them, and only a moderator may change
 * `suspendedUntil`), the changed ones, and this request's action (`act`,
 * `target`, `at`).
 */
function activityWrite(raw: DocumentData | undefined, act: string, target: string, changes: Record<string, unknown> = {}) {
  return {
    lastPost: raw?.lastPost ?? null,
    lastResponse: raw?.lastResponse ?? null,
    lastVote: raw?.lastVote ?? null,
    reportDay: raw?.reportDay ?? 0,
    reports: raw?.reports ?? 0,
    suspendedUntil: raw?.suspendedUntil ?? null,
    countDay: raw?.countDay ?? 0,
    dayPosts: raw?.dayPosts ?? 0,
    dayResponses: raw?.dayResponses ?? 0,
    dayVotes: raw?.dayVotes ?? 0,
    ...changes,
    act,
    target,
    at: serverTimestamp(),
  };
}

/** Refuses (before the rules would) when a moderator has suspended the member. */
function assertNotSuspended(activity: Activity) {
  if (activity.suspendedUntil != null && isSuspended(activity.suspendedUntil, Date.now())) {
    throw new SuspendedError(activity.suspendedUntil);
  }
}

/**
 * Refuses (before the rules would) when today's cap is used up, and returns
 * the counts the activity record must carry for this action.
 */
function countFor(kind: CountedAction, activity: Activity, joinedAt: number) {
  const now = Date.now();
  if (dailyLeft(kind, activity, joinedAt, now) <= 0) throw new DailyLimitError(dailyLimitMessage(kind, isNewMember(joinedAt, now)));
  return countAction(kind, activity, now);
}

function assertLinks(text: string, joinedAt: number) {
  const problem = linkProblem(text, joinedAt, Date.now());
  if (problem) throw new Error(problem);
}

async function ownJoinedAt(tx: Transaction | null, uid: string): Promise<number> {
  const snap = tx ? await tx.get(profileRef(uid)) : await getDoc(profileRef(uid));
  return readProfile(uid, snap.data() ?? {}).joinedAt;
}

async function checkNotSuspended(uid: string) {
  const snap = await getDoc(activityRef(uid));
  assertNotSuspended(readActivity(snap.exists() ? snap.data() : undefined));
}

/** A member notification (answer, reply, mention, accepted), as written to the recipient's inbox. */
function memberNotification(type: NotificationType, from: string, post: string, response: string) {
  return { type, from, post, response, reason: "", until: null, at: serverTimestamp(), read: false };
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
  // A banned member can only read their own profile (and notifications).
  if (prof.data().banned === true) return { ...empty, profile: readProfile(uid, prof.data()) };
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
    return {
      uid,
      name,
      nameKey: key,
      color,
      up: 0,
      down: 0,
      joinedAt: Date.now(),
      nameChangedAt: null,
      guidelinesAt: null,
      banned: false,
      nameReset: false,
    };
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
    if (!cur.nameReset && !status.allowed && status.nextAt) throw new RenameTooSoonError(status.nextAt);
    if (key !== cur.nameKey) {
      const claim = await tx.get(nameRef(key));
      if (claim.exists() && claim.data().uid !== uid) throw new NameTakenError();
      if (!claim.exists()) tx.set(nameRef(key), { uid });
      tx.delete(nameRef(cur.nameKey));
    }
    tx.update(profileRef(uid), { name, nameKey: key, nameChangedAt: serverTimestamp(), ...(cur.nameReset ? { nameReset: false } : {}) });
    return { ...cur, name, nameKey: key, nameChangedAt: Date.now(), nameReset: false };
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
    const joinedAt = await ownJoinedAt(tx, uid);
    assertNotSuspended(activity);
    assertLinks(f.body, joinedAt);
    const wait = waitSeconds(activity.lastPost, Date.now(), POST_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const counts = countFor("post", activity, joinedAt);
    const base = { author: uid, editedAt: null, up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false };
    const { tokens, ...shown } = f;
    tx.set(postRef(id), { ...shown, tokens, ...base, createdAt: serverTimestamp() });
    tx.set(activityRef(uid), activityWrite(raw, "post", id, { lastPost: serverTimestamp(), ...counts }));
    return { post: { id, ...shown, ...base, removed: false, createdAt: Date.now() }, duplicate: false };
  });
}

/** The author edits a post. The type can only change while it has no responses. */
export async function editPost(post: Post, input: PostInput): Promise<Post> {
  const f = postFields(input);
  await checkNotSuspended(post.author);
  assertLinks(f.body, await ownJoinedAt(null, post.author));
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

/**
 * The asker accepts an answer (or switches, or clears with null). Awards
 * nothing; accepting notifies the answer's author (again, if re-accepted).
 */
export async function setAccepted(uid: string, postId: string, responseId: string | null): Promise<void> {
  await runTransaction(requireDb(), async (tx) => {
    let to: string | null = null;
    if (responseId) {
      const rs = await tx.get(responseRef(postId, responseId));
      if (!rs.exists() || rs.data().deleted === true) throw new GoneError("That answer was deleted, so it can't be accepted.");
      to = str(rs.data().author);
    }
    tx.update(postRef(postId), { accepted: responseId });
    if (responseId && to && to !== uid) {
      tx.set(notificationRef(to, memberNotificationId("accepted", postId, responseId)), memberNotification("accepted", uid, postId, responseId));
    }
  });
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
    const joinedAt = await ownJoinedAt(tx, uid);
    assertNotSuspended(activity);
    assertLinks(body, joinedAt);
    const wait = waitSeconds(activity.lastResponse, Date.now(), RESPONSE_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const counts = countFor("response", activity, joinedAt);
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
      mention: input.parent && input.mention !== uid ? input.mention : null,
    };
    tx.set(responseRef(postId, id), { ...fields, createdAt: serverTimestamp() });
    if (parent) tx.update(responseRef(postId, parent.id), { replies: parent.replies + 1 });
    else tx.update(postRef(postId), { responses: post.responses + 1 });
    tx.set(activityRef(uid), activityWrite(raw, "respond", `${postId}/${id}`, { lastResponse: serverTimestamp(), ...counts }));
    for (const n of recipientsForResponse({ actor: uid, postAuthor: post.author, parentAuthor: parent?.author ?? null, mention: fields.mention })) {
      tx.set(notificationRef(n.to, memberNotificationId(n.type, postId, id)), memberNotification(n.type, uid, postId, id));
    }
    return { response: { id, ...fields, removed: false, createdAt: Date.now() }, duplicate: false };
  });
}

export async function editResponse(r: Response, rawBody: string): Promise<Response> {
  const problem = validateResponse(rawBody, r.parent != null);
  if (problem) throw new Error(problem);
  const body = cleanBody(rawBody);
  await checkNotSuspended(r.author);
  assertLinks(body, await ownJoinedAt(null, r.author));
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
    const joinedAt = await ownJoinedAt(tx, uid);
    assertNotSuspended(activity);
    const wait = waitSeconds(activity.lastVote, Date.now(), VOTE_INTERVAL_S);
    if (wait > 0) throw new RateLimitError(wait);
    const daily = countFor("vote", activity, joinedAt);
    const after = nextVote(before, clicked);
    const counts = applyVote({ up: num(data.up), down: num(data.down) }, before, after);
    const totals = applyVote({ up: prof.up, down: prof.down }, before, after);
    tx.set(voteRef(vid), { voter: uid, post: item.post, response: item.response, author, value: after, at: serverTimestamp() });
    tx.update(itemRef(item), { up: counts.up, down: counts.down, score: counts.score });
    tx.update(profileRef(author), { up: totals.up, down: totals.down });
    tx.set(activityRef(uid), activityWrite(raw, "vote", vid, { lastVote: serverTimestamp(), ...daily }));
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
    assertNotSuspended(activity);
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

// ------------------------------------------------------------ moderation
//
// Moderators carry the custom claim `moderator: true` (see moderation.ts);
// the rules check it on every write below. Each action writes a mod-log
// entry, and every action on a member's content or account sends them a
// notification from "a moderator" (moderators stay anonymous to members).

/** A transaction or a write batch: what the moderation helpers write with. */
interface Writer {
  set(ref: DocumentReference, data: DocumentData): unknown;
  update(ref: DocumentReference, data: DocumentData): unknown;
}

function logAction(
  w: Writer,
  by: string,
  action: ModAction,
  target: { uid: string | null; post: string | null; response: string | null },
  reason: string,
  until: number | null = null,
) {
  w.set(modLogRef(newId()), {
    by,
    action,
    uid: target.uid,
    post: target.post,
    response: target.response,
    reason,
    until: until == null ? null : Timestamp.fromMillis(until),
    at: serverTimestamp(),
  });
}

function notifyMember(
  w: Writer,
  to: string,
  type: ModNotificationType,
  target: { post: string | null; response: string | null },
  reason: string,
  until: number | null = null,
) {
  if (!to) return;
  w.set(notificationRef(to, `mod_${newId()}`), {
    type,
    from: "mod",
    post: target.post,
    response: target.response,
    reason,
    until: until == null ? null : Timestamp.fromMillis(until),
    at: serverTimestamp(),
    read: false,
  });
}

function cleanReason(reason: string): string {
  return reason.normalize("NFC").trim().slice(0, 500);
}

function resolveReports(w: Writer, ids: string[], status: "actioned" | "dismissed") {
  for (const id of ids) w.update(reportRef(id), { status, resolvedAt: serverTimestamp() });
}

/**
 * Removes a post, answer, comment or reply. Its text moves to a private
 * copy (communityRemoved, readable by its author and moderators) so it can
 * be restored; its votes stop counting toward the author's Community XP;
 * an answer stops counting toward the post's answers (and acceptance
 * clears). Resolves the given reports as actioned, all in one transaction.
 */
export async function removeContent(modUid: string, item: ItemRef, rawReason: string, reportIds: string[] = []): Promise<void> {
  const reason = cleanReason(rawReason);
  const key = removedKey(item.post, item.response);
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(itemRef(item));
    if (!snap.exists() || snap.data().deleted === true) throw new GoneError("This was already deleted or removed.");
    const d = snap.data();
    const author = str(d.author);
    if (author === modUid) throw new Error("Moderators can't remove their own posts this way. Delete it instead.");
    const isTop = item.response != null && d.parent == null;
    const votes = num(d.up) !== 0 || num(d.down) !== 0;
    const post = isTop ? readPost(item.post, (await tx.get(postRef(item.post))).data() ?? {}) : null;
    const prof = (item.response == null || isTop) && votes ? readProfile(author, (await tx.get(profileRef(author))).data() ?? {}) : null;
    const { raw } = await readActivityIn(tx, modUid);
    tx.set(removedRef(key), {
      author,
      post: item.post,
      response: item.response,
      title: item.response == null ? str(d.title) : "",
      body: str(d.body),
      reason,
      removedAt: serverTimestamp(),
    });
    if (item.response == null) tx.update(postRef(item.post), { title: "", body: "", tokens: [], deleted: true, removed: true });
    else tx.update(responseRef(item.post, item.response), { body: "", deleted: true, removed: true });
    if (post) {
      tx.update(postRef(item.post), {
        responses: post.responses - 1,
        erased: post.erased + 1,
        accepted: post.accepted === item.response ? null : post.accepted,
      });
    }
    if (prof) tx.update(profileRef(author), { up: prof.up - num(d.up), down: prof.down - num(d.down) });
    tx.set(activityRef(modUid), activityWrite(raw, "remove", item.response == null ? item.post : `${item.post}/${item.response}`));
    resolveReports(tx, reportIds, "actioned");
    notifyMember(tx, author, "removed", item, reason);
    logAction(tx, modUid, "remove", { uid: author, ...item }, reason);
  });
}

/** Puts removed content back as it was, votes and all. Fails if its author deleted the copy for good. */
export async function restoreContent(modUid: string, item: ItemRef): Promise<{ title: string; body: string }> {
  const key = removedKey(item.post, item.response);
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(itemRef(item));
    if (!snap.exists() || snap.data().removed !== true) throw new GoneError("This isn't removed.");
    const d = snap.data();
    const copy = await tx.get(removedRef(key));
    if (!copy.exists()) throw new GoneError("Its author deleted it permanently, so it can't be restored.");
    const c = copy.data();
    const author = str(d.author);
    const isTop = item.response != null && d.parent == null;
    const votes = num(d.up) !== 0 || num(d.down) !== 0;
    const post = isTop ? readPost(item.post, (await tx.get(postRef(item.post))).data() ?? {}) : null;
    const prof = (item.response == null || isTop) && votes ? readProfile(author, (await tx.get(profileRef(author))).data() ?? {}) : null;
    const { raw } = await readActivityIn(tx, modUid);
    if (item.response == null) {
      tx.update(postRef(item.post), {
        title: str(c.title),
        body: str(c.body),
        tokens: searchTokens(str(c.title), str(c.body)),
        deleted: false,
        removed: false,
      });
    } else {
      tx.update(responseRef(item.post, item.response), { body: str(c.body), deleted: false, removed: false });
    }
    tx.delete(removedRef(key));
    if (post) tx.update(postRef(item.post), { responses: post.responses + 1, erased: post.erased - 1 });
    if (prof) tx.update(profileRef(author), { up: prof.up + num(d.up), down: prof.down + num(d.down) });
    tx.set(activityRef(modUid), activityWrite(raw, "restore", item.response == null ? item.post : `${item.post}/${item.response}`));
    notifyMember(tx, author, "restored", item, "");
    logAction(tx, modUid, "restore", { uid: author, ...item }, "");
    return { title: str(c.title), body: str(c.body) };
  });
}

/** Closes reports without action (nothing is changed for the reported member). */
export async function dismissReports(
  modUid: string,
  target: { uid: string | null; post: string | null; response: string | null },
  reportIds: string[],
): Promise<void> {
  const b = writeBatch(requireDb());
  resolveReports(b, reportIds, "dismissed");
  logAction(b, modUid, "dismiss", target, "");
  await b.commit();
}

/** A warning: a notification with the moderator's reason, and nothing else. */
export async function warnMember(modUid: string, uid: string, rawReason: string): Promise<void> {
  const reason = cleanReason(rawReason);
  const b = writeBatch(requireDb());
  notifyMember(b, uid, "warning", { post: null, response: null }, reason);
  logAction(b, modUid, "warn", { uid, post: null, response: null }, reason);
  await b.commit();
}

/** No posting, responding, voting, editing or reporting until `days` from now (reading still works). */
export async function suspendMember(modUid: string, uid: string, days: number, rawReason: string): Promise<number> {
  const reason = cleanReason(rawReason);
  const until = suspensionEnd(Date.now(), days);
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(activityRef(uid));
    const stamp = Timestamp.fromMillis(until);
    if (snap.exists()) tx.update(activityRef(uid), { suspendedUntil: stamp });
    else {
      tx.set(activityRef(uid), {
        lastPost: null,
        lastResponse: null,
        lastVote: null,
        reportDay: 0,
        reports: 0,
        suspendedUntil: stamp,
        act: "none",
        target: "",
        at: serverTimestamp(),
      });
    }
    notifyMember(tx, uid, "suspended", { post: null, response: null }, reason, until);
    logAction(tx, modUid, "suspend", { uid, post: null, response: null }, reason, until);
  });
  return until;
}

export async function unsuspendMember(modUid: string, uid: string): Promise<void> {
  const b = writeBatch(requireDb());
  b.update(activityRef(uid), { suspendedUntil: null });
  notifyMember(b, uid, "unsuspended", { post: null, response: null }, "");
  logAction(b, modUid, "unsuspend", { uid, post: null, response: null }, "");
  await b.commit();
}

/** A ban: no access to the Community at all until unbanned. Their posts stay unless removed. */
export async function banMember(modUid: string, uid: string, rawReason: string): Promise<void> {
  const reason = cleanReason(rawReason);
  const b = writeBatch(requireDb());
  b.update(profileRef(uid), { banned: true });
  notifyMember(b, uid, "banned", { post: null, response: null }, reason);
  logAction(b, modUid, "ban", { uid, post: null, response: null }, reason);
  await b.commit();
}

export async function unbanMember(modUid: string, uid: string): Promise<void> {
  const b = writeBatch(requireDb());
  b.update(profileRef(uid), { banned: false });
  notifyMember(b, uid, "unbanned", { post: null, response: null }, "");
  logAction(b, modUid, "unban", { uid, post: null, response: null }, "");
  await b.commit();
}

/** A member's ban and suspension, as a moderator sees them. */
export async function fetchMemberStatus(uid: string): Promise<{ banned: boolean; suspendedUntil: number | null }> {
  const [prof, act] = await Promise.all([getDoc(profileRef(uid)), getDoc(activityRef(uid))]);
  return {
    banned: prof.exists() && prof.data().banned === true,
    suspendedUntil: act.exists() ? ms(act.data().suspendedUntil) : null,
  };
}

/** Open reports, oldest first (up to 200), for the moderator queue. */
export async function fetchOpenReports(): Promise<ReportRecord[]> {
  const snap = await getDocs(query(collection(requireDb(), "communityReports"), where("status", "==", "open"), orderBy("at", "asc"), limit(200)));
  return snap.docs.map((d) => {
    const r = d.data();
    return {
      id: d.id,
      kind: r.kind,
      post: strOrNull(r.post),
      response: strOrNull(r.response),
      profile: strOrNull(r.profile),
      reason: r.reason as ReportReason,
      note: str(r.note),
      at: ms(r.at) ?? 0,
    };
  });
}

export interface RemovedCopy {
  key: string;
  author: string;
  post: string;
  response: string | null;
  title: string;
  body: string;
  reason: string;
  removedAt: number;
}

function readRemoved(key: string, d: DocumentData): RemovedCopy {
  return {
    key,
    author: str(d.author),
    post: str(d.post),
    response: strOrNull(d.response),
    title: str(d.title),
    body: str(d.body),
    reason: str(d.reason),
    removedAt: ms(d.removedAt) ?? 0,
  };
}

/** Recently removed content (moderators). */
export async function fetchRemovedItems(): Promise<RemovedCopy[]> {
  const snap = await getDocs(query(collection(requireDb(), "communityRemoved"), orderBy("removedAt", "desc"), limit(50)));
  return snap.docs.map((d) => readRemoved(d.id, d.data()));
}

/** A removed item's original text: for its author and moderators. Null if deleted for good. */
export async function fetchRemovedCopy(item: ItemRef): Promise<RemovedCopy | null> {
  const key = removedKey(item.post, item.response);
  try {
    const snap = await getDoc(removedRef(key));
    return snap.exists() ? readRemoved(key, snap.data()) : null;
  } catch (err) {
    // For its author, a copy deleted for good reads as "not allowed" (the rule checks the author field).
    if (err instanceof FirebaseError && err.code === "permission-denied") return null;
    throw err;
  }
}

/** One response or reply (for the moderation queue). */
export async function fetchResponse(postId: string, id: string): Promise<Response | null> {
  const snap = await getDoc(responseRef(postId, id));
  return snap.exists() ? readResponse(id, snap.data()) : null;
}

/** The author deletes their removed content's text for good (it can't be restored afterwards). */
export async function deleteRemovedCopy(item: ItemRef): Promise<void> {
  await deleteDoc(removedRef(removedKey(item.post, item.response)));
}

export interface ModLogEntry {
  id: string;
  by: string;
  action: ModAction;
  uid: string | null;
  post: string | null;
  response: string | null;
  reason: string;
  until: number | null;
  at: number;
}

/** The latest moderator actions (moderators only). */
export async function fetchModLog(): Promise<ModLogEntry[]> {
  const snap = await getDocs(query(collection(requireDb(), "communityModLog"), orderBy("at", "desc"), limit(50)));
  return snap.docs.map((d) => {
    const e = d.data();
    return {
      id: d.id,
      by: str(e.by),
      action: e.action as ModAction,
      uid: strOrNull(e.uid),
      post: strOrNull(e.post),
      response: strOrNull(e.response),
      reason: str(e.reason),
      until: ms(e.until),
      at: ms(e.at) ?? 0,
    };
  });
}

/** Posts by id (for notification and moderation titles). Missing ones are left out. */
export async function fetchPostsByIds(ids: string[]): Promise<Post[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30));
  const snaps = await Promise.all(chunks.map((c) => getDocs(query(postsCol(), where(documentId(), "in", c)))));
  return snaps.flatMap((s) => s.docs.map((d) => readPost(d.id, d.data())));
}

// ---------------------------------------------------------- notifications

function readNotification(id: string, d: DocumentData): CommunityNotification {
  const type = str(d.type) as NotificationType;
  return {
    id,
    type,
    from: isModNotification(type) ? "mod" : str(d.from),
    post: strOrNull(d.post),
    response: strOrNull(d.response),
    reason: str(d.reason),
    until: ms(d.until),
    at: ms(d.at) ?? 0,
    read: d.read === true,
  };
}

/** The member's notifications, newest first, 30 at a time. Readable even when banned. */
export async function fetchNotifications(uid: string, after: DocumentSnapshot | null): Promise<{ items: CommunityNotification[]; cursor: DocumentSnapshot | null }> {
  const c: QueryConstraint[] = [orderBy("at", "desc")];
  if (after) c.push(startAfter(after));
  c.push(limit(31));
  const snap = await getDocs(query(inboxCol(uid), ...c));
  const docs = snap.docs.slice(0, 30);
  return { items: docs.map((d) => readNotification(d.id, d.data())), cursor: snap.docs.length > 30 ? docs[docs.length - 1] : null };
}

export async function fetchUnreadCount(uid: string): Promise<number> {
  const snap = await getCountFromServer(query(inboxCol(uid), where("read", "==", false)));
  return snap.data().count;
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 400) {
    const b = writeBatch(requireDb());
    for (const id of ids.slice(i, i + 400)) b.update(notificationRef(uid, id), { read: true });
    await b.commit();
  }
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  await deleteDoc(notificationRef(uid, id));
}

// ------------------------------------------------- Phase 3: moderator extras

/**
 * Replaces a name that breaks the guidelines with "Member 123456" (claimed
 * for the member, the old name released). The member is told and can choose
 * a new name straight away, without the 30-day wait.
 */
export async function resetMemberName(modUid: string, uid: string, rawReason: string): Promise<string> {
  const reason = cleanReason(rawReason);
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(profileRef(uid));
    if (!snap.exists()) throw new GoneError("That member wasn't found.");
    const cur = readProfile(uid, snap.data());
    let name = placeholderName();
    let key = nameKey(name);
    // Try a few numbers until one is free (a clash is very unlikely).
    for (let i = 0; i < 5 && (await tx.get(nameRef(key))).exists(); i++) {
      name = placeholderName();
      key = nameKey(name);
    }
    tx.set(nameRef(key), { uid });
    tx.delete(nameRef(cur.nameKey));
    tx.update(profileRef(uid), { name, nameKey: key, nameReset: true });
    notifyMember(tx, uid, "renamed", { post: null, response: null }, reason);
    logAction(tx, modUid, "rename", { uid, post: null, response: null }, reason);
    return name;
  });
}

interface VoteDoc {
  id: string;
  post: string;
  response: string | null;
  author: string;
  value: VoteValue;
}

async function votesBy(voter: string): Promise<VoteDoc[]> {
  const snap = await getDocs(query(collection(requireDb(), "communityVotes"), where("voter", "==", voter)));
  return snap.docs
    .map((d) => {
      const v = d.data();
      return {
        id: d.id,
        post: str(v.post),
        response: strOrNull(v.response),
        author: str(v.author),
        value: isVoteValue(v.value) ? v.value : 0,
      } as VoteDoc;
    })
    .filter((v) => v.value !== 0);
}

/**
 * Sets one vote to 0 and moves its item's and author's counts back, in one
 * transaction. `act` is "leave" (the voter, deleting their account) or
 * "void" (a moderator). Votes on deleted or removed content are skipped:
 * their counts are frozen (the admin purge script tidies them up).
 */
async function cancelVote(actor: string, act: "leave" | "void", v: VoteDoc): Promise<boolean> {
  return runTransaction(requireDb(), async (tx) => {
    const vs = await tx.get(voteRef(v.id));
    const before: VoteValue = vs.exists() && isVoteValue(vs.data().value) ? vs.data().value : 0;
    if (before === 0) return false;
    const item = { post: v.post, response: v.response };
    const is = await tx.get(itemRef(item));
    if (!is.exists() || is.data().deleted === true) return false;
    const data = is.data();
    // A moderator can't touch votes on their own content (the rules refuse it); those are skipped.
    if (act === "void" && str(data.author) === actor) return false;
    const ps = await tx.get(profileRef(str(data.author)));
    if (!ps.exists()) return false;
    const prof = readProfile(ps.id, ps.data());
    const { raw } = await readActivityIn(tx, actor);
    const counts = applyVote({ up: num(data.up), down: num(data.down) }, before, 0);
    const totals = applyVote({ up: prof.up, down: prof.down }, before, 0);
    tx.update(voteRef(v.id), { value: 0, at: serverTimestamp() });
    tx.update(itemRef(item), { up: counts.up, down: counts.down, score: counts.score });
    tx.update(profileRef(prof.uid), { up: totals.up, down: totals.down });
    tx.set(activityRef(actor), activityWrite(raw, act, v.id));
    return true;
  });
}

/**
 * For vote manipulation (sockpuppets): cancels every vote a member cast and
 * fixes everyone's Community XP, one vote at a time. Moderators only.
 */
export async function voidMemberVotes(
  modUid: string,
  voter: string,
  rawReason: string,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const reason = cleanReason(rawReason);
  const votes = await votesBy(voter);
  let cancelled = 0;
  for (const [i, v] of votes.entries()) {
    if (await cancelVote(modUid, "void", v)) cancelled++;
    onProgress?.(i + 1, votes.length);
  }
  const b = writeBatch(requireDb());
  notifyMember(b, voter, "voided", { post: null, response: null }, reason);
  logAction(b, modUid, "void", { uid: voter, post: null, response: null }, reason);
  await b.commit();
  return cancelled;
}

// ------------------------------------------------- Phase 3: account deletion

export type CommunityDeletionStep = "votes" | "responses" | "posts" | "inbox" | "profile";

/**
 * Deletes everything of the member's own that the Community holds, as far
 * as the rules let a browser: withdraws their votes (fixing everyone's
 * counts), deletes or erases their answers, comments, replies and posts
 * (exactly as deleting each one would), deletes the text of anything a
 * moderator removed, their notifications, hidden posts and blocks, and
 * finally their profile and name. Safe to run again after an interruption.
 *
 * Left for the admin purge script (scripts/purge-deleted-accounts.mts),
 * once the sign-in account is gone: the 13+ answer and the activity record
 * (which carries any suspension, so deleting a profile can't escape one),
 * and anything a banned member couldn't reach.
 */
export async function deleteCommunityData(uid: string, onProgress?: (step: CommunityDeletionStep, done: number, total: number) => void): Promise<void> {
  let prof: CommunityProfile | null = null;
  try {
    const snap = await getDoc(profileRef(uid));
    prof = snap.exists() ? readProfile(uid, snap.data()) : null;
  } catch {
    prof = null; // Not a member (or not verified): nothing in the Community to delete.
  }
  if (!prof || prof.banned) return;

  const votes = await votesBy(uid);
  for (const [i, v] of votes.entries()) {
    await cancelVote(uid, "leave", v);
    onProgress?.("votes", i + 1, votes.length);
  }

  // Replies first (nothing hangs off them), then answers and comments, then posts.
  const mine = await getDocs(query(collectionGroup(requireDb(), "responses"), where("author", "==", uid)));
  const responses = mine.docs
    .map((d) => ({ post: d.ref.parent.parent?.id ?? "", r: readResponse(d.id, d.data()) }))
    .filter((x) => x.post && !x.r.deleted)
    .sort((a, b) => Number(a.r.parent == null) - Number(b.r.parent == null));
  for (const [i, x] of responses.entries()) {
    await deleteResponse(uid, x.post, x.r.id);
    onProgress?.("responses", i + 1, responses.length);
  }
  const posts = (await getDocs(query(postsCol(), where("author", "==", uid)))).docs
    .map((d) => readPost(d.id, d.data()))
    .filter((p) => !p.deleted);
  for (const [i, p] of posts.entries()) {
    await deletePost(uid, p.id);
    onProgress?.("posts", i + 1, posts.length);
  }

  const removed = await getDocs(query(collection(requireDb(), "communityRemoved"), where("author", "==", uid)));
  const inbox = await getDocs(inboxCol(uid));
  const hidden = await getDocs(collection(requireDb(), "users", uid, "communityHidden"));
  const blocks = await getDocs(collection(requireDb(), "users", uid, "communityBlocks"));
  const refs = [...removed.docs, ...inbox.docs, ...hidden.docs, ...blocks.docs].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += 400) {
    const b = writeBatch(requireDb());
    for (const ref of refs.slice(i, i + 400)) b.delete(ref);
    await b.commit();
    onProgress?.("inbox", Math.min(i + 400, refs.length), refs.length);
  }

  const b = writeBatch(requireDb());
  b.delete(profileRef(uid));
  b.delete(nameRef(prof.nameKey));
  await b.commit();
  onProgress?.("profile", 1, 1);
}
