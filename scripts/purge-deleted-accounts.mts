/**
 * Finishes deleting accounts: finds data whose owner no longer has a sign-in
 * account and deletes or anonymizes it, then fixes every Community count.
 * Run it regularly (the Privacy Policy promises deletion within 30 days).
 *
 *   node scripts/purge-deleted-accounts.mts --key path/to/key.json            (report only)
 *   node scripts/purge-deleted-accounts.mts --key path/to/key.json --apply    (delete)
 *
 * "Delete my account" in the app already deletes what the rules let a
 * browser delete. This removes the rest, which the rules protect: the XP
 * ledger (users/{uid}/xp, xpEvents, days), the 13+ answer, the Community
 * activity record (which carries suspensions), plus anything left behind by
 * an interrupted deletion or a banned member (who can't reach the
 * Community): their votes, posts and responses (erased where others
 * replied, deleted otherwise), removed copies, name claims, profile and
 * notifications. Reports they filed and moderator-log entries are kept.
 *
 * The key is a Firebase service-account JSON (Firebase console → Project
 * settings → Service accounts). Keep it outside the repo or in a
 * `*.service-account.json` file (gitignored). NEVER commit it.
 * GOOGLE_APPLICATION_CREDENTIALS works instead of --key. With the emulators'
 * FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST set, it runs
 * against them.
 */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
      throw err;
    }
  },
});

const { applicationDefault, cert, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");
const { findDrift } = (await import(
  new URL("../src/lib/community/recompute.ts", import.meta.url).href
)) as typeof import("../src/lib/community/recompute");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const keyIndex = args.indexOf("--key");
const keyPath = keyIndex >= 0 ? args[keyIndex + 1] : undefined;

if (keyPath) initializeApp({ credential: cert(JSON.parse(readFileSync(resolve(keyPath), "utf8"))) });
else if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-justviet" });
else initializeApp({ credential: applicationDefault() });

const db = getFirestore();
const auth = getAuth();

// ----------------------------------------------------------- find owners
const owners = new Set<string>();
const add = (uid: unknown) => {
  if (typeof uid === "string" && uid) owners.add(uid);
};
for (const col of ["users", "communityAge", "communityActivity", "communityProfiles", "communityInbox"]) {
  for (const ref of await db.collection(col).listDocuments()) add(ref.id);
}
(await db.collection("communityVotes").select("voter").get()).docs.forEach((d) => add(d.get("voter")));
(await db.collection("communityPosts").select("author").get()).docs.forEach((d) => add(d.get("author")));
(await db.collectionGroup("responses").select("author").get()).docs.forEach((d) => add(d.get("author")));
(await db.collection("communityRemoved").select("author").get()).docs.forEach((d) => add(d.get("author")));
(await db.collection("communityNames").get()).docs.forEach((d) => add(d.get("uid")));

const orphans: string[] = [];
const ids = [...owners];
for (let i = 0; i < ids.length; i += 100) {
  const res = await auth.getUsers(ids.slice(i, i + 100).map((uid) => ({ uid })));
  for (const missing of res.notFound) if ("uid" in missing) orphans.push(missing.uid);
}

console.log(`Checked ${owners.size} account id(s); ${orphans.length} no longer have a sign-in account.`);
for (const uid of orphans) console.log(`  ${uid}`);
if (orphans.length === 0) process.exit(0);
if (!apply) {
  console.log("\nReport only. Run again with --apply to delete their data.");
  process.exit(1);
}

// ------------------------------------------------------------- purge one
const erasedPost = { title: "", body: "", author: "", tokens: [], deleted: true, removed: false, up: 0, down: 0, score: 0 };
const erasedResponse = { body: "", author: "", deleted: true, removed: false, up: 0, down: 0, score: 0 };

async function purge(uid: string) {
  const batch = db.bulkWriter();
  // Votes: deleted (the counts are fixed below).
  for (const d of (await db.collection("communityVotes").where("voter", "==", uid).get()).docs) batch.delete(d.ref);
  // Responses: replies deleted; answers/comments erased if they have replies, deleted otherwise.
  for (const d of (await db.collectionGroup("responses").where("author", "==", uid).get()).docs) {
    const parentPost = d.ref.parent.parent!;
    const hasReplies = d.get("parent") == null && !(await parentPost.collection("responses").where("parent", "==", d.id).limit(1).get()).empty;
    if (hasReplies) batch.update(d.ref, erasedResponse);
    else batch.delete(d.ref);
  }
  // Posts: erased if anything hangs off them, deleted otherwise.
  for (const d of (await db.collection("communityPosts").where("author", "==", uid).get()).docs) {
    const hasResponses = !(await d.ref.collection("responses").limit(1).get()).empty;
    if (hasResponses) batch.update(d.ref, erasedPost);
    else batch.delete(d.ref);
  }
  for (const d of (await db.collection("communityRemoved").where("author", "==", uid).get()).docs) batch.delete(d.ref);
  for (const d of (await db.collection("communityNames").where("uid", "==", uid).get()).docs) batch.delete(d.ref);
  for (const col of ["communityProfiles", "communityActivity", "communityAge"]) batch.delete(db.collection(col).doc(uid));
  await batch.close();
  // Everything under their inbox and their user doc (learning data, XP ledger, hidden posts, blocks).
  await db.recursiveDelete(db.collection("communityInbox").doc(uid));
  await db.recursiveDelete(db.collection("users").doc(uid));
  console.log(`Purged ${uid}.`);
}

for (const uid of orphans) await purge(uid);

// ------------------------------------------------- fix every count after
const [profiles, posts, responses, votes] = await Promise.all([
  db.collection("communityProfiles").get(),
  db.collection("communityPosts").get(),
  db.collectionGroup("responses").get(),
  db.collection("communityVotes").get(),
]);
const n = (v: unknown) => (typeof v === "number" ? v : 0);
const drift = findDrift({
  profiles: profiles.docs.map((d) => ({ uid: d.id, up: n(d.get("up")), down: n(d.get("down")) })),
  posts: posts.docs.map((d) => ({
    id: d.id, author: d.get("author") ?? "", up: n(d.get("up")), down: n(d.get("down")), score: n(d.get("score")),
    responses: n(d.get("responses")), erased: n(d.get("erased")), accepted: d.get("accepted") ?? null,
    deleted: d.get("deleted") === true, removed: d.get("removed") === true,
  })),
  responses: responses.docs.map((d) => ({
    id: d.id, post: d.ref.parent.parent?.id ?? "", parent: d.get("parent") ?? null, author: d.get("author") ?? "",
    up: n(d.get("up")), down: n(d.get("down")), score: n(d.get("score")), replies: n(d.get("replies")),
    deleted: d.get("deleted") === true, removed: d.get("removed") === true,
  })),
  votes: votes.docs.map((d) => ({ post: d.get("post"), response: d.get("response") ?? null, value: n(d.get("value")) })),
});
const fixer = db.bulkWriter();
for (const d of drift) fixer.update(db.doc(d.path), d.fix);
await fixer.close();
console.log(`Fixed ${drift.length} count(s) after purging.`);
