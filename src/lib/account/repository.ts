/**
 * Deletes the member's learning data (the only file of account deletion
 * that imports `firebase/firestore`): flashcards, review history, study and
 * goal settings, personal dictionary words and Rồng Con's profile. The XP
 * ledger (`xp`, `xpEvents`, `days`) is protected by firestore.rules so a
 * browser can't reset it; scripts/purge-deleted-accounts.mts deletes it
 * once the sign-in account is gone.
 */
import { collection, deleteDoc, doc, getDocs, limit, query, writeBatch, type Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Every per-user collection the browser may delete (see the users rules in firestore.rules). */
export const LEARNING_COLLECTIONS = ["vocabCards", "reviewLogs", "settings", "dictionaryEntries", "companion"] as const;

function requireDb(): Firestore {
  if (!db) throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  return db;
}

/** Deletes a collection 400 docs at a time until it's empty. Returns how many were deleted. */
async function emptyCollection(path: string[]): Promise<number> {
  const col = collection(requireDb(), path[0], ...path.slice(1));
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(col, limit(400)));
    if (snap.empty) return deleted;
    const b = writeBatch(requireDb());
    snap.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
    deleted += snap.size;
  }
}

export async function deleteLearningData(uid: string, onProgress?: (done: number, total: number) => void): Promise<void> {
  for (const [i, name] of LEARNING_COLLECTIONS.entries()) {
    await emptyCollection(["users", uid, name]);
    onProgress?.(i + 1, LEARNING_COLLECTIONS.length);
  }
  // The user doc itself, if there is one.
  await deleteDoc(doc(requireDb(), "users", uid));
}
