/**
 * Firestore reads/writes for Rồng Con's own profile on Home. Everything about XP, goals and
 * claims is the XP ledger's (src/lib/xp/repository.ts); this is only:
 *
 *   users/{uid}/companion/profile  — { onboarded, levelSeen, seenXp } (see profile.ts)
 *
 * (users/{uid}/companion/ledger, the ledger before the 100-level system, is no longer read:
 * XP restarted at 0.) Reads are one-time, like the vocab data (see that file for why not
 * `onSnapshot`).
 */
import { doc, getDoc, runTransaction, type Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeProfile, type CompanionProfile } from "./profile";

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  }
  return db;
}

const profileRef = (uid: string) => doc(requireDb(), "users", uid, "companion", "profile");

export async function fetchProfile(uid: string): Promise<CompanionProfile> {
  const snap = await getDoc(profileRef(uid));
  return normalizeProfile(snap.exists() ? snap.data() : null);
}

/**
 * Saves what changed. In a transaction so another device can't be undone by it: `onboarded`
 * only turns on and `levelSeen` only goes up.
 */
export async function markProfile(uid: string, changes: Partial<CompanionProfile>): Promise<void> {
  const ref = profileRef(uid);
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(ref);
    const cur = normalizeProfile(snap.exists() ? snap.data() : null);
    const next: Record<string, unknown> = {};
    if (changes.onboarded && !cur.onboarded) next.onboarded = true;
    if (changes.levelSeen != null && changes.levelSeen > cur.levelSeen) next.levelSeen = changes.levelSeen;
    if (changes.seenXp != null && changes.seenXp !== cur.seenXp) next.seenXp = changes.seenXp;
    if (Object.keys(next).length) tx.set(ref, next, { merge: true });
  });
}
