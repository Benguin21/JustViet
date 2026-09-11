"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "./firestore-errors";
import * as repo from "./repository";
import { withSettingsDefaults } from "./settings";
import type {
  CardRating,
  NewVocabCardInput,
  ReviewLogEntry,
  SrsSettings,
  VocabCard,
  VocabCardEdit,
} from "./types";

export interface UseVocabDataResult {
  cards: VocabCard[];
  reviewLogs: ReviewLogEntry[];
  settings: SrsSettings;
  loading: boolean;
  /** Set when the initial load (or a manual refresh) fails; actions surface their own errors via thrown Errors. */
  error: string | null;
  /** Re-fetches everything from Firestore. Mutations already update local state directly, so this is mostly an escape hatch. */
  refresh: () => Promise<void>;

  addCard: (input: NewVocabCardInput) => Promise<string>;
  addCards: (inputs: NewVocabCardInput[]) => Promise<string[]>;
  editCard: (cardId: string, edit: VocabCardEdit) => Promise<void>;
  removeCard: (cardId: string) => Promise<void>;
  setSuspended: (cardId: string, suspended: boolean) => Promise<void>;
  resetProgress: (cardId: string) => Promise<void>;
  reviewCard: (card: VocabCard, rating: CardRating) => Promise<VocabCard>;
  saveSettings: (settings: SrsSettings) => Promise<void>;
  rescheduleAllCards: () => Promise<number>;
}

const NOT_SIGNED_IN = "You need to be signed in to do that.";

/**
 * The single source of truth for the Vocab SRS page: Firestore data
 * (cards / review logs / settings), fetched once per sign-in, plus the
 * mutation actions, all bound to the current user.
 *
 * Deliberately NOT using live `onSnapshot` listeners — see the comment at
 * the top of `repository.ts` for why (their realtime `Listen` channel was
 * measured taking 10-30+ seconds to establish in some environments, which
 * was the actual cause of the page's slow load). Instead, every mutation
 * here updates local state directly from what it wrote, so the UI reflects
 * changes immediately without waiting on a fetch or a listener.
 *
 * Every failure is normalized to a friendly message via
 * `friendlyFirestoreError` so callers can just catch and display
 * `err.message`.
 */
export function useVocabData(): UseVocabDataResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [cards, setCards] = useState<VocabCard[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [rawSettings, setRawSettings] = useState<Partial<SrsSettings> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (currentUid: string) => {
    const [cardsResult, logsResult, settingsResult] = await Promise.allSettled([
      repo.fetchCards(currentUid),
      repo.fetchReviewLogs(currentUid),
      repo.fetchSettings(currentUid),
    ]);

    if (cardsResult.status === "fulfilled") {
      setCards(cardsResult.value);
    } else {
      setError(friendlyFirestoreError(cardsResult.reason));
    }

    if (logsResult.status === "fulfilled") {
      setReviewLogs(logsResult.value);
    } else {
      setError(friendlyFirestoreError(logsResult.reason));
    }

    if (settingsResult.status === "fulfilled") {
      setRawSettings(settingsResult.value);
    } else {
      setError(friendlyFirestoreError(settingsResult.reason));
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    // This genuinely needs an effect (fetching from Firestore on mount is
    // an external-system call, not derivable state) — `setLoading(false)`
    // just marks that real network round-trip as settled.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(uid).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, load]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setError(null);
    await load(uid);
  }, [uid, load]);

  const settings = useMemo(() => withSettingsDefaults(rawSettings ?? {}), [rawSettings]);

  const addCard = useCallback(
    async (input: NewVocabCardInput) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const card = await repo.createCard(uid, input);
        setCards((prev) => [...prev, card]);
        return card.id;
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const addCards = useCallback(
    async (inputs: NewVocabCardInput[]) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const created = await repo.createCards(uid, inputs);
        setCards((prev) => [...prev, ...created]);
        return created.map((c) => c.id);
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const editCard = useCallback(
    async (cardId: string, edit: VocabCardEdit) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const patch = await repo.updateCard(uid, cardId, edit);
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        await repo.deleteCard(uid, cardId);
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        setReviewLogs((prev) => prev.filter((l) => l.cardId !== cardId));
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const setSuspended = useCallback(
    async (cardId: string, suspended: boolean) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        await repo.setCardSuspended(uid, cardId, suspended);
        const updatedAt = Date.now();
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, suspended, updatedAt } : c)),
        );
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const resetProgress = useCallback(
    async (cardId: string) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const patch = await repo.resetCardProgress(uid, cardId);
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const reviewCard = useCallback(
    async (card: VocabCard, rating: CardRating) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const { card: updated, log } = await repo.submitReview(uid, card, rating, settings);
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setReviewLogs((prev) => [log, ...prev]);
        return updated;
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid, settings],
  );

  const saveSettings = useCallback(
    async (next: SrsSettings) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        await repo.saveSettings(uid, next);
        setRawSettings(next);
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const rescheduleAllCardsAction = useCallback(async () => {
    if (!uid) throw new Error(NOT_SIGNED_IN);
    try {
      const updates = await repo.rescheduleAllCards(uid, cards, settings);
      const byId = new Map(updates.map((u) => [u.id, u]));
      setCards((prev) =>
        prev.map((c) => {
          const update = byId.get(c.id);
          return update ? { ...c, due: update.due, scheduledDays: update.scheduledDays } : c;
        }),
      );
      return updates.length;
    } catch (err) {
      throw new Error(friendlyFirestoreError(err));
    }
  }, [uid, cards, settings]);

  return {
    cards,
    reviewLogs,
    settings,
    loading,
    error,
    refresh,
    addCard,
    addCards,
    editCard,
    removeCard,
    setSuspended,
    resetProgress,
    reviewCard,
    saveSettings,
    rescheduleAllCards: rescheduleAllCardsAction,
  };
}
