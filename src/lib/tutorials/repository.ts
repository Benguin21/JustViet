/**
 * Which feature tutorials the learner has already been through (finished or skipped), so each
 * one plays once and follows them to any browser or device. The only file of the tutorials that
 * imports `firebase/firestore`:
 *
 *   users/{uid}/settings/tutorials  — { vocab: true, … }, one flag per tutorial
 *
 * A flag only ever turns on. It's covered by the per-user rule in firestore.rules (no rules
 * change), and deleting an account deletes it with the rest of `settings`. Home's own intro is
 * Rồng Con's profile (`companion/profile.onboarded`), not this.
 */
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const TUTORIAL_IDS = ["vocab"] as const;
export type TutorialId = (typeof TUTORIAL_IDS)[number];

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  }
  return db;
}

const tutorialsRef = (uid: string) => doc(requireDb(), "users", uid, "settings", "tutorials");

/** The tutorials this learner has seen. */
export async function fetchSeenTutorials(uid: string): Promise<Set<TutorialId>> {
  const snap = await getDoc(tutorialsRef(uid));
  const data = (snap.exists() ? snap.data() : {}) as Record<string, unknown>;
  return new Set(TUTORIAL_IDS.filter((id) => data[id] === true));
}

/** Marks a tutorial as seen (merged, so other tutorials' flags are left alone). */
export async function markTutorialSeen(uid: string, id: TutorialId): Promise<void> {
  await setDoc(tutorialsRef(uid), { [id]: true }, { merge: true });
}
