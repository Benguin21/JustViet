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
  /** Set when a live subscription itself fails (e.g. permission/network); actions surface their own errors via thrown Errors. */
  error: string | null;

  addCard: (input: NewVocabCardInput) => Promise<string>;
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
 * The single source of truth for the Vocab SRS page: live Firestore data
 * (cards / review logs / settings) plus the mutation actions, all bound to
 * the current user. Every write goes through `repository.ts`; every
 * failure is normalized to a friendly message via `friendlyFirestoreError`
 * so callers can just catch and display `err.message`.
 */
export function useVocabData(): UseVocabDataResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [cards, setCards] = useState<VocabCard[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [rawSettings, setRawSettings] = useState<Partial<SrsSettings> | null>(null);
  const [loaded, setLoaded] = useState({ cards: false, logs: false, settings: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    // (No reset of `loaded`/`error` here: this effect only re-runs if `uid`
    // changes, and in practice RequireAuth unmounts this whole tree on
    // sign-out/sign-in rather than swapping `uid` under a live instance.)
    const handleError = (err: unknown) => setError(friendlyFirestoreError(err));

    const unsubCards = repo.subscribeToCards(
      uid,
      (data) => {
        setCards(data);
        setLoaded((prev) => ({ ...prev, cards: true }));
      },
      handleError,
    );
    const unsubLogs = repo.subscribeToReviewLogs(
      uid,
      (data) => {
        setReviewLogs(data);
        setLoaded((prev) => ({ ...prev, logs: true }));
      },
      handleError,
    );
    const unsubSettings = repo.subscribeToSettings(
      uid,
      (data) => {
        setRawSettings(data);
        setLoaded((prev) => ({ ...prev, settings: true }));
      },
      handleError,
    );

    return () => {
      unsubCards();
      unsubLogs();
      unsubSettings();
    };
  }, [uid]);

  const settings = useMemo(() => withSettingsDefaults(rawSettings ?? {}), [rawSettings]);
  const loading = !loaded.cards || !loaded.logs || !loaded.settings;

  const addCard = useCallback(
    async (input: NewVocabCardInput) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        return await repo.createCard(uid, input);
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
        await repo.updateCard(uid, cardId, edit);
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
        await repo.resetCardProgress(uid, cardId);
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
        const { card: updated } = await repo.submitReview(uid, card, rating, settings);
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
      } catch (err) {
        throw new Error(friendlyFirestoreError(err));
      }
    },
    [uid],
  );

  const rescheduleAllCardsAction = useCallback(async () => {
    if (!uid) throw new Error(NOT_SIGNED_IN);
    try {
      return await repo.rescheduleAllCards(uid, cards, settings);
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
    addCard,
    editCard,
    removeCard,
    setSuspended,
    resetProgress,
    reviewCard,
    saveSettings,
    rescheduleAllCards: rescheduleAllCardsAction,
  };
}
