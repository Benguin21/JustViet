"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "@/lib/vocab/firestore-errors";
import { fetchReviewLogsSince } from "@/lib/vocab/repository";
import { startOfDay } from "@/lib/vocab/srs";
import { progressFromReviews, type GoalSettings, type Progress } from "./goals";
import { localDayKey, type Ledger } from "./ledger";
import type { CompanionProfile } from "./profile";
import * as repo from "./repository";

export interface CompanionData {
  savedLedger: unknown;
  profile: CompanionProfile;
  goalSettings: GoalSettings;
  progress: Progress;
  /** The local day `progress` was counted for. */
  progressDay: string;
}

/**
 * Everything Home needs for Rồng Con, fetched once when Home opens: the saved ledger and
 * profile, the learner's goals, and today's Vocab SRS reviews (so studying, then coming back
 * Home, shows the new progress). Saves go out in the background; a failed one is reported
 * through `onSaveError` with a friendly message.
 *
 * Until the load succeeds there is nothing to show: Home must never start from a blank ledger
 * just because a read failed, or its next save would overwrite the real one.
 */
export function useCompanionData(onSaveError: (message: string) => void) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  // Each result is kept with the account it was loaded for, so a different account signing in
  // never sees, or saves over, the previous one's companion.
  const [loaded, setLoaded] = useState<{ uid: string; data: CompanionData } | null>(null);
  const [failed, setFailed] = useState<{ uid: string; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const since = startOfDay(Date.now());
    Promise.all([repo.fetchCompanion(uid), fetchReviewLogsSince(uid, since)]).then(
      ([saved, logs]) => {
        if (!cancelled) {
          setLoaded({ uid, data: { ...saved, progress: progressFromReviews(logs), progressDay: localDayKey(new Date(since)) } });
        }
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

  const saveLedger = useCallback(
    (ledger: Ledger) => {
      if (!uid) return;
      repo.saveLedger(uid, ledger).catch((err) => onSaveError(friendlyFirestoreError(err)));
    },
    [uid, onSaveError],
  );

  const markProfile = useCallback(
    (changes: Partial<CompanionProfile>) => {
      if (!uid) return;
      repo.markProfile(uid, changes).catch((err) => onSaveError(friendlyFirestoreError(err)));
    },
    [uid, onSaveError],
  );

  const data = loaded && loaded.uid === uid ? loaded.data : null;
  const error = failed && failed.uid === uid ? failed.error : null;
  return { data, error, retry, saveLedger, markProfile };
}
