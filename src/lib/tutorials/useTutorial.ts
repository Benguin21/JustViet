"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchSeenTutorials, markTutorialSeen, type TutorialId } from "./repository";

export interface UseTutorialResult {
  /** True the first time (once we know it hasn't been seen), or after `show()`. */
  open: boolean;
  /** Opens the tutorial again ("How it works"). */
  show: () => void;
  /** Finished or skipped: closes it and remembers it was seen, so it never opens by itself again. */
  close: () => void;
}

/**
 * A feature's first-visit tutorial: whether to show it, and remembering it once it's closed.
 * If we can't tell whether it was seen (the read failed), it stays closed rather than getting in
 * the way; the page's "How it works" button still opens it.
 */
export function useTutorial(id: TutorialId): UseTutorialResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  // Kept with the account it was loaded for, so another account signing in starts fresh.
  const [seen, setSeen] = useState<{ uid: string; seen: boolean } | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchSeenTutorials(uid).then(
      (ids) => {
        if (!cancelled) setSeen({ uid, seen: ids.has(id) });
      },
      () => {
        if (!cancelled) setSeen({ uid, seen: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid, id]);

  const firstTime = !!uid && seen?.uid === uid && !seen.seen;

  const show = useCallback(() => setManual(true), []);
  const close = useCallback(() => {
    setManual(false);
    if (!uid) return;
    setSeen({ uid, seen: true });
    if (firstTime) markTutorialSeen(uid, id).catch((err) => console.warn("Couldn't save that the tutorial was seen.", err));
  }, [uid, id, firstTime]);

  return { open: manual || firstTime, show, close };
}
