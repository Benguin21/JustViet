"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "@/lib/vocab/firestore-errors";
import { dayKeyIn, deviceTimeZone } from "@/lib/xp/day";
import * as xp from "@/lib/xp/repository";
import { normalizeGoalSettings, type GoalSettings, type PerGoal } from "./goals";

export interface GoalsTabData {
  /** The goals as saved. */
  saved: GoalSettings;
  /** The local day `locked` was read for. */
  today: string;
  /**
   * Today's targets for the goals already active today (a card studied, a lesson done, a goal
   * fed). Those stay as they are until tomorrow; a new target for them starts the next day.
   */
  locked: Partial<PerGoal<number>>;
}

async function loadGoals(uid: string): Promise<GoalsTabData & { timeZone: string | null }> {
  const goals = await xp.fetchGoals(uid);
  const today = dayKeyIn(Date.now(), goals.timeZone ?? deviceTimeZone());
  const day = await xp.fetchDay(uid, today);
  return { saved: goals.settings, timeZone: goals.timeZone, today, locked: { ...day.targets } };
}

/**
 * The Goals tab's data: the learner's saved goals, fetched once per sign-in, plus which of
 * today's goals are already locked. `save` writes the goals (only the goals: nothing here ever
 * awards XP), then reads today's locks again so the page can say exactly when each change
 * applies, even if a goal got going in another tab meanwhile. It rejects with a friendly message.
 */
export function useGoalSettings() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  // Kept with the account it was loaded for, like useCompanionData.
  const [loaded, setLoaded] = useState<{ uid: string; data: GoalsTabData; timeZone: string | null } | null>(null);
  const [failed, setFailed] = useState<{ uid: string; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadGoals(uid).then(
      ({ timeZone, ...data }) => {
        if (!cancelled) setLoaded({ uid, data, timeZone });
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

  const current = loaded && loaded.uid === uid ? loaded : null;

  const save = useCallback(
    async (settings: GoalSettings): Promise<GoalsTabData> => {
      if (!uid || !current) throw new Error("Your goals haven't loaded yet.");
      // The first save establishes the time zone days are counted in, if nothing else has.
      const timeZone = current.timeZone ?? deviceTimeZone();
      try {
        await xp.saveGoals(uid, settings, timeZone);
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
      const today = dayKeyIn(Date.now(), timeZone);
      const day = await xp.fetchDay(uid, today).catch(() => null);
      const data: GoalsTabData = {
        saved: normalizeGoalSettings(settings),
        today,
        locked: day ? { ...day.targets } : today === current.data.today ? current.data.locked : {},
      };
      setLoaded({ uid, data, timeZone });
      return data;
    },
    [uid, current],
  );

  return { data: current?.data ?? null, error: failed && failed.uid === uid ? failed.error : null, retry, save };
}
