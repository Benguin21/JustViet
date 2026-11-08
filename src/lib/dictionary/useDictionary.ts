"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { friendlyFirestoreError } from "@/lib/vocab/firestore-errors";
import { DictionaryIndex } from "./dictionary-index";
import { sensesFromInput } from "./entries";
import { DuplicateDictionaryEntryError } from "./errors";
import { cleanHeadword, headwordKey } from "./normalize";
import * as repo from "./repository";
import { loadSharedDictionary } from "./shared-source";
import type { PersonalEntry, PersonalEntryInput, SharedEntry } from "./types";

export interface UseDictionaryResult {
  /** The merged shared + personal lookup service; `null` until the shared dataset has loaded. */
  index: DictionaryIndex | null;
  loading: boolean;
  error: string | null;

  /**
   * Creates a personal entry. Throws `DuplicateDictionaryEntryError` (with
   * the existing headword's key) if the word is already in the shared or
   * personal dictionary — checked here against the loaded index, and again
   * transactionally in the repository.
   */
  createEntry: (input: PersonalEntryInput) => Promise<PersonalEntry>;
  /** Adds the form's meaning(s) to an existing headword (personal overlay on a shared word, or the personal entry). */
  addMeanings: (headword: string, input: PersonalEntryInput) => Promise<PersonalEntry>;
  updateEntry: (entry: PersonalEntry, input: PersonalEntryInput) => Promise<PersonalEntry>;
  deleteEntry: (key: string) => Promise<void>;
}

const NOT_SIGNED_IN = "You need to be signed in to do that.";

function rethrow(err: unknown): never {
  if (err instanceof DuplicateDictionaryEntryError) throw err;
  throw new Error(friendlyFirestoreError(err));
}

/**
 * The Dictionary tab's data: the shared dataset (static, fetched once per
 * page load — see `shared-source.ts`) merged with the signed-in user's
 * personal entries (fetched once per sign-in, like `useVocabData`), plus
 * mutations that update local state directly from what they wrote.
 */
export function useDictionary(): UseDictionaryResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [shared, setShared] = useState<SharedEntry[] | null>(null);
  const [personal, setPersonal] = useState<PersonalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    Promise.allSettled([loadSharedDictionary(), repo.fetchPersonalEntries(uid)]).then(
      ([sharedResult, personalResult]) => {
        if (cancelled) return;
        if (sharedResult.status === "fulfilled") setShared(sharedResult.value);
        else setError(sharedResult.reason instanceof Error ? sharedResult.reason.message : "Couldn't load the dictionary.");
        if (personalResult.status === "fulfilled") setPersonal(personalResult.value);
        else setError(friendlyFirestoreError(personalResult.reason));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const index = useMemo(
    () => (shared ? DictionaryIndex.build(shared, personal) : null),
    [shared, personal],
  );

  const upsertLocal = useCallback((entry: PersonalEntry) => {
    setPersonal((prev) => [...prev.filter((e) => e.key !== entry.key), entry]);
  }, []);

  const createEntry = useCallback(
    async (input: PersonalEntryInput) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      const existing = index?.get(input.headword);
      if (existing) throw new DuplicateDictionaryEntryError(existing.key, existing.headword);
      try {
        const entry = await repo.createPersonalEntry(uid, input);
        upsertLocal(entry);
        return entry;
      } catch (err) {
        rethrow(err);
      }
    },
    [uid, index, upsertLocal],
  );

  const addMeanings = useCallback(
    async (headword: string, input: PersonalEntryInput) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      // Keep the existing display spelling (e.g. "Việt Nam", not "việt nam").
      const display = index?.get(headword)?.headword ?? cleanHeadword(headword);
      try {
        const entry = await repo.addSensesToEntry(uid, display, sensesFromInput(input), input.notes);
        upsertLocal(entry);
        return entry;
      } catch (err) {
        rethrow(err);
      }
    },
    [uid, index, upsertLocal],
  );

  const updateEntry = useCallback(
    async (entry: PersonalEntry, input: PersonalEntryInput) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      try {
        const next = await repo.updatePersonalEntry(uid, entry, input);
        upsertLocal(next);
        return next;
      } catch (err) {
        rethrow(err);
      }
    },
    [uid, upsertLocal],
  );

  const deleteEntry = useCallback(
    async (key: string) => {
      if (!uid) throw new Error(NOT_SIGNED_IN);
      const normalized = headwordKey(key);
      try {
        await repo.deletePersonalEntry(uid, normalized);
        setPersonal((prev) => prev.filter((e) => e.key !== normalized));
      } catch (err) {
        rethrow(err);
      }
    },
    [uid],
  );

  return { index, loading, error, createEntry, addMeanings, updateEntry, deleteEntry };
}
