"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "@/lib/vocab/firestore-errors";
import * as xp from "@/lib/xp/repository";

export interface GrammarProgress {
  /** IDs of the lessons finished (see progress.ts). */
  completed: ReadonlySet<string>;
  /** The XP total, which sets the avatar's form. */
  xp: number;
}

/**
 * The Grammar map's data, fetched once per sign-in (one-time reads, like the rest of the app):
 * which lessons are finished, and the XP total for the avatar. Kept with the account it was
 * loaded for, like useCompanionData.
 */
export function useGrammarProgress() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [loaded, setLoaded] = useState<{ uid: string; data: GrammarProgress } | null>(null);
  const [failed, setFailed] = useState<{ uid: string; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    Promise.all([xp.fetchCompletedGrammarLessons(uid), xp.fetchTotal(uid)]).then(
      ([completed, total]) => {
        if (!cancelled) setLoaded({ uid, data: { completed, xp: total } });
      },
      (err) => {
        if (!cancelled) setFailed({ uid, error: friendlyFirestoreError(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const retry = useCallback(() => {
    setFailed(null);
    setAttempt((n) => n + 1);
  }, []);

  const data = loaded && loaded.uid === uid ? loaded.data : null;
  const error = failed && failed.uid === uid ? failed.error : null;
  return { data, error, retry };
}
