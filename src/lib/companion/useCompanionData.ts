"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "@/lib/vocab/firestore-errors";
import { fetchReviewLogsSince } from "@/lib/vocab/repository";
import type { ReviewLogEntry } from "@/lib/vocab/types";
import { dayKeyIn, deviceTimeZone } from "@/lib/xp/day";
import { FLASHCARD_XP_CAP } from "@/lib/xp/events";
import { effectiveTargets, type DayRecord } from "@/lib/xp/plan";
import * as xp from "@/lib/xp/repository";
import { progressFromReviews, type GoalSettings, type Progress } from "./goals";
import { ledgerChanges, ledgerFromDay, type Ledger } from "./ledger";
import type { CompanionProfile } from "./profile";
import * as repo from "./repository";

export interface CompanionData {
  /** Today's ledger as Home opens it (see ledgerFromDay). */
  savedLedger: Ledger;
  profile: CompanionProfile;
  /** Which goals are on, with today's target for each (locked ones where a goal is active). */
  goalSettings: GoalSettings;
  progress: Progress;
  /** The local day `progress` was counted for. */
  progressDay: string;
  timeZone: string;
}

/** A day and a half back covers "today" in any time zone. */
const LOOKBACK_MS = 36 * 60 * 60 * 1000;

/**
 * Today's Vocab reviews that the XP ledger hasn't paid yet (their award failed, say offline),
 * one per card, while the day's flashcard cap allows.
 */
function unpaidReviews(logs: readonly ReviewLogEntry[], paidCards: ReadonlySet<string>, day: DayRecord): ReviewLogEntry[] {
  const seen = new Set<string>();
  const out: ReviewLogEntry[] = [];
  for (const l of [...logs].sort((a, b) => a.reviewedAt - b.reviewedAt)) {
    if (seen.has(l.cardId) || paidCards.has(l.cardId)) continue;
    seen.add(l.cardId);
    out.push(l);
  }
  return out.slice(0, Math.max(0, FLASHCARD_XP_CAP - day.flash));
}

async function loadCompanion(uid: string): Promise<CompanionData> {
  const goals = await xp.fetchGoals(uid);
  const timeZone = goals.timeZone ?? deviceTimeZone();
  if (!goals.timeZone) void xp.establishTimeZone(uid, null).catch(() => {});
  const today = dayKeyIn(Date.now(), timeZone);
  const [profile, total0, day0, logs, events] = await Promise.all([
    repo.fetchProfile(uid),
    xp.fetchTotal(uid),
    xp.fetchDay(uid, today),
    fetchReviewLogsSince(uid, Date.now() - LOOKBACK_MS),
    xp.fetchDayEvents(uid, today),
  ]);
  const todays = logs.filter((l) => dayKeyIn(l.reviewedAt, timeZone) === today);
  // Pay anything from today the Vocab page couldn't (safe to repeat: a paid card is skipped).
  let total = total0;
  let day = day0;
  const paid = new Set(events.filter((e) => e.kind === "vocab.card" && e.card).map((e) => e.card as string));
  for (const log of unpaidReviews(todays, paid, day)) {
    const res = await xp.awardVocabReview(uid, log);
    if (res.day.day === today) {
      total = res.total;
      day = res.day;
    }
  }
  return {
    savedLedger: ledgerFromDay(total, day),
    profile,
    goalSettings: { enabled: goals.settings.enabled, targets: effectiveTargets(goals.settings, day) },
    progress: progressFromReviews(todays, day.done),
    progressDay: today,
    timeZone,
  };
}

/**
 * Everything Home needs for Rồng Con, fetched once when Home opens: the learner's goals (with
 * today's locked targets), XP total and today's goal record from the XP ledger, today's Vocab
 * reviews (so studying, then coming back Home, shows the new progress) and Rồng Con's profile.
 *
 * Home works out each change to today's ledger itself; saveLedger sends only what changed,
 * one after another: a claim or unclaim (a transaction that pays or takes back the bonus,
 * see src/lib/xp/repository.ts) or Home's own bookkeeping. A failed save is reported through
 * `onSaveError` with a friendly message.
 *
 * Until the load succeeds there is nothing to show: Home must never start from a blank
 * ledger just because a read failed.
 */
export function useCompanionData(onSaveError: (message: string) => void) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  // Each result is kept with the account it was loaded for, so a different account signing in
  // never sees, or saves over, the previous one's companion.
  const [loaded, setLoaded] = useState<{ uid: string; data: CompanionData } | null>(null);
  const [failed, setFailed] = useState<{ uid: string; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The ledger as last sent, and the saves still going out (in order).
  const sent = useRef<{ uid: string; ledger: Ledger } | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadCompanion(uid).then(
      (data) => {
        if (cancelled) return;
        sent.current = { uid, ledger: data.savedLedger };
        setLoaded({ uid, data });
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
      const prev = sent.current && sent.current.uid === uid ? sent.current.ledger : null;
      const changes = ledgerChanges(prev, ledger);
      sent.current = { uid, ledger };
      if (!changes.claims.length && !changes.extras) return;
      queue.current = queue.current.then(async () => {
        try {
          // Home only ever claims a goal that is ready to feed.
          for (const c of changes.claims) await xp.setGoalClaim(uid, changes.day, c.goal, c.want, c.want);
          if (changes.extras) await xp.saveDayExtras(uid, changes.day, changes.extras);
        } catch (err) {
          onSaveError(friendlyFirestoreError(err));
        }
      });
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
