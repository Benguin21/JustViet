/**
 * Firestore reads/writes for Rồng Con on Home, the companion's counterpart of
 * src/lib/vocab/repository.ts (the only other file that imports `firebase/firestore`).
 * Everything lives under `users/{uid}/...`, which `firestore.rules` keeps private to that user:
 *
 *   users/{uid}/companion/ledger   — the XP ledger: claims, XP and dishes per goal per local
 *                                    day (see ledger.ts), one document
 *   users/{uid}/companion/profile  — { onboarded, hatchSeen } (see profile.ts)
 *   users/{uid}/settings/goals     — the learner's daily goals (see goals.ts). Only read for
 *                                    now; it falls back to the defaults until a Goals page
 *                                    writes it.
 *
 * Reads are one-time, like the vocab data (see that file for why not `onSnapshot`).
 */
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeGoalSettings, type GoalSettings } from "./goals";
import type { Ledger } from "./ledger";
import { normalizeProfile, type CompanionProfile } from "./profile";

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.");
  }
  return db;
}

const ledgerRef = (uid: string) => doc(requireDb(), "users", uid, "companion", "ledger");
const profileRef = (uid: string) => doc(requireDb(), "users", uid, "companion", "profile");
const goalsRef = (uid: string) => doc(requireDb(), "users", uid, "settings", "goals");

export interface SavedCompanion {
  /** The ledger as saved (not yet checked: ledgerForDay does that), or null. */
  savedLedger: unknown;
  profile: CompanionProfile;
  goalSettings: GoalSettings;
}

export async function fetchCompanion(uid: string): Promise<SavedCompanion> {
  const [ledger, profile, goals] = await Promise.all([getDoc(ledgerRef(uid)), getDoc(profileRef(uid)), getDoc(goalsRef(uid))]);
  return {
    savedLedger: ledger.exists() ? ledger.data() : null,
    profile: normalizeProfile(profile.exists() ? profile.data() : null),
    goalSettings: normalizeGoalSettings(goals.exists() ? goals.data() : null),
  };
}

/** Replaces the whole ledger: it is always re-derived in full before it is saved. */
export async function saveLedger(uid: string, ledger: Ledger): Promise<void> {
  await setDoc(ledgerRef(uid), ledger);
}

/** Turns profile flags on. Merged, so a flag set from another device is never lost. */
export async function markProfile(uid: string, changes: Partial<CompanionProfile>): Promise<void> {
  await setDoc(profileRef(uid), changes, { merge: true });
}
