/**
 * Firestore reads/writes for users' personal dictionary entries — the
 * Dictionary feature's counterpart to `src/lib/vocab/repository.ts`, and
 * the only dictionary file that imports `firebase/firestore`. The shared
 * dataset is not in Firestore at all (see `shared-source.ts`).
 *
 * Data model:
 *   users/{uid}/dictionaryEntries/{docId}  — one doc per personal headword
 *
 * The doc ID is derived from the headword key (`personalEntryDocId`), so
 * there can only ever be one personal doc per word per user. Creates run
 * in a transaction that fails if that doc already exists, which is the
 * persistence-layer duplicate check: two simultaneous "Add Word" requests
 * for the same word (double-click, two tabs) can't both succeed.
 *
 * Covered by the existing `users/{userId}/{document=**}` rule in
 * `firestore.rules` — no rules change needed.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  runTransaction,
  type Firestore,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { appendSense, sensesFromInput } from "./entries";
import { DuplicateDictionaryEntryError } from "./errors";
import { cleanHeadword, headwordKey } from "./normalize";
import type { DictionarySense, PersonalEntry, PersonalEntryInput } from "./types";

function requireDb(): Firestore {
  if (!db) {
    throw new Error(
      "Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local.",
    );
  }
  return db;
}

/**
 * Firestore doc ID for a headword key. Percent-encoding keeps IDs free of
 * "/" and other reserved characters; the "w_" prefix rules out the
 * reserved IDs "." / ".." / "__…__".
 */
export function personalEntryDocId(key: string): string {
  return `w_${encodeURIComponent(key)}`;
}

const entriesCol = (uid: string) => collection(requireDb(), "users", uid, "dictionaryEntries");
const entryRef = (uid: string, key: string) =>
  doc(requireDb(), "users", uid, "dictionaryEntries", personalEntryDocId(key));

type PersonalEntryDoc = PersonalEntry & { userId: string };

/** Firestore rejects `undefined` field values, so optional sense fields are omitted rather than undefined. */
function toFirestoreSense(sense: DictionarySense): DictionarySense {
  return {
    english: sense.english,
    ...(sense.partOfSpeech && { partOfSpeech: sense.partOfSpeech }),
    ...(sense.definitionVi && { definitionVi: sense.definitionVi }),
    examples: sense.examples.map((e) => ({ vi: e.vi, ...(e.en && { en: e.en }) })),
  };
}

function fromDoc(data: Partial<PersonalEntryDoc>): PersonalEntry {
  return {
    key: data.key ?? headwordKey(data.headword ?? ""),
    headword: data.headword ?? "",
    senses: (data.senses ?? []).map((s) => ({ ...s, examples: s.examples ?? [] })),
    notes: data.notes ?? "",
    createdAt: data.createdAt ?? 0,
    updatedAt: data.updatedAt ?? 0,
  };
}

export async function fetchPersonalEntries(uid: string): Promise<PersonalEntry[]> {
  const snapshot = await getDocs(entriesCol(uid));
  return snapshot.docs.map((d) => fromDoc(d.data() as PersonalEntryDoc));
}

/**
 * Creates a new personal entry. Throws `DuplicateDictionaryEntryError` if
 * the user already has one for this headword. (Whether the word exists in
 * the *shared* dataset is checked by the caller against the loaded index —
 * the shared data is static, so that check can't race.)
 */
export async function createPersonalEntry(
  uid: string,
  input: PersonalEntryInput,
): Promise<PersonalEntry> {
  const headword = cleanHeadword(input.headword);
  const key = headwordKey(headword);
  const ref = entryRef(uid, key);
  const now = Date.now();
  const entry: PersonalEntry = {
    key,
    headword,
    senses: sensesFromInput(input).map(toFirestoreSense),
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(requireDb(), async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) throw new DuplicateDictionaryEntryError(key, headword);
    tx.set(ref, { ...entry, userId: uid } satisfies PersonalEntryDoc);
  });
  return entry;
}

/**
 * Adds a meaning to a headword the user doesn't want to duplicate: appends
 * to their personal entry if they have one, otherwise creates a personal
 * overlay doc for it (used when the word is in the shared dataset — the
 * shared entry itself is never written). A sense whose gloss is already on
 * the personal entry isn't added twice.
 */
export async function addSensesToEntry(
  uid: string,
  headwordText: string,
  newSenses: DictionarySense[],
  notes = "",
): Promise<PersonalEntry> {
  const headword = cleanHeadword(headwordText);
  const key = headwordKey(headword);
  const ref = entryRef(uid, key);
  const now = Date.now();

  return runTransaction(requireDb(), async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists()) {
      const current = fromDoc(snapshot.data() as PersonalEntryDoc);
      const senses = newSenses
        .map(toFirestoreSense)
        .reduce((acc, sense) => appendSense(acc, sense), current.senses);
      const next: PersonalEntry = {
        ...current,
        senses,
        notes: current.notes || notes.trim(),
        updatedAt: now,
      };
      tx.set(ref, { ...next, userId: uid } satisfies PersonalEntryDoc);
      return next;
    }
    const created: PersonalEntry = {
      key,
      headword,
      senses: newSenses.map(toFirestoreSense).reduce(appendSense, [] as DictionarySense[]),
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    tx.set(ref, { ...created, userId: uid } satisfies PersonalEntryDoc);
    return created;
  });
}

/**
 * Updates a personal entry's meanings/notes. The headword itself (and so
 * the key and doc ID) doesn't change on edit — that's what keeps SRS links
 * (`VocabCard.dictionaryKey`) pointing at the right word.
 */
export async function updatePersonalEntry(
  uid: string,
  previous: PersonalEntry,
  input: PersonalEntryInput,
): Promise<PersonalEntry> {
  const ref = entryRef(uid, previous.key);
  const next: PersonalEntry = {
    ...previous,
    senses: sensesFromInput(input, previous.senses).map(toFirestoreSense),
    notes: input.notes.trim(),
    updatedAt: Date.now(),
  };
  await runTransaction(requireDb(), async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error("That word is no longer in your dictionary.");
    tx.set(ref, { ...next, userId: uid } satisfies PersonalEntryDoc);
  });
  return next;
}

/**
 * Deletes a personal entry (or overlay). Only the dictionary doc is
 * removed: any vocab card for the word, and its review history, are left
 * exactly as they are.
 */
export async function deletePersonalEntry(uid: string, key: string): Promise<void> {
  await deleteDoc(entryRef(uid, key));
}

/**
 * Makes sure a dictionary entry exists for a word being added to the SRS
 * (the "Also add this word to my Dictionary" box): links to the shared
 * entry if `sharedHas` says one exists, else to the user's personal entry,
 * else creates a personal entry. Transactional, so it never duplicates.
 */
export async function ensureEntryForWord(
  uid: string,
  input: PersonalEntryInput,
  sharedHas: (key: string) => boolean,
): Promise<{ key: string; outcome: "linked-shared" | "linked-personal" | "created"; entry?: PersonalEntry }> {
  const headword = cleanHeadword(input.headword);
  const key = headwordKey(headword);
  if (sharedHas(key)) return { key, outcome: "linked-shared" };

  const ref = entryRef(uid, key);
  const now = Date.now();
  return runTransaction(requireDb(), async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists()) {
      return {
        key,
        outcome: "linked-personal" as const,
        entry: fromDoc(snapshot.data() as PersonalEntryDoc),
      };
    }
    const entry: PersonalEntry = {
      key,
      headword,
      senses: sensesFromInput(input).map(toFirestoreSense),
      notes: input.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    tx.set(ref, { ...entry, userId: uid } satisfies PersonalEntryDoc);
    return { key, outcome: "created" as const, entry };
  });
}
