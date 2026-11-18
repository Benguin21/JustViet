/**
 * Reports (and with --fix, repairs) drift in the Community's counts: posts'
 * and responses' up/down/score, posts' responses/erased/accepted, replies
 * counts, and profiles' Community XP totals, recomputed from the vote
 * records by src/lib/community/recompute.ts.
 *
 *   node scripts/community-drift.mts --key path/to/service-account.json         (report only)
 *   node scripts/community-drift.mts --key path/to/service-account.json --fix   (write the fixes)
 *
 * The key is a Firebase service-account JSON (Firebase console → Project
 * settings → Service accounts → Generate new private key). Keep it outside
 * the repo or in a `*.service-account.json` file, which .gitignore excludes.
 * NEVER commit it. GOOGLE_APPLICATION_CREDENTIALS works instead of --key.
 * With FIRESTORE_EMULATOR_HOST set, it runs against the emulator.
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

const { initializeApp, cert, applicationDefault } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { findDrift } = (await import(
  new URL("../src/lib/community/recompute.ts", import.meta.url).href
)) as typeof import("../src/lib/community/recompute");

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const keyIndex = args.indexOf("--key");
const keyPath = keyIndex >= 0 ? args[keyIndex + 1] : undefined;

if (keyPath) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(resolve(keyPath), "utf8"))) });
} else if (process.env.FIRESTORE_EMULATOR_HOST) {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-justviet" });
} else {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

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
    responses: n(d.get("responses")), erased: n(d.get("erased")), accepted: d.get("accepted") ?? null, deleted: d.get("deleted") === true,
  })),
  responses: responses.docs.map((d) => ({
    id: d.id, post: d.ref.parent.parent?.id ?? "", parent: d.get("parent") ?? null, author: d.get("author") ?? "",
    up: n(d.get("up")), down: n(d.get("down")), score: n(d.get("score")), replies: n(d.get("replies")), deleted: d.get("deleted") === true,
  })),
  votes: votes.docs.map((d) => ({ post: d.get("post"), response: d.get("response") ?? null, value: n(d.get("value")) })),
});

console.log(`Checked ${profiles.size} profiles, ${posts.size} posts, ${responses.size} responses, ${votes.size} votes.`);
if (drift.length === 0) {
  console.log("No drift. Every count matches its records.");
  process.exit(0);
}
for (const d of drift) console.log(`${d.path}: stored ${JSON.stringify(d.stored)} → should be ${JSON.stringify(d.fix)}`);
if (!fix) {
  console.log(`\n${drift.length} doc(s) drifted. Run again with --fix to write the corrections.`);
  process.exit(1);
}
for (let i = 0; i < drift.length; i += 400) {
  const batch = db.batch();
  for (const d of drift.slice(i, i + 400)) batch.update(db.doc(d.path), d.fix);
  await batch.commit();
}
console.log(`\nFixed ${drift.length} doc(s).`);
