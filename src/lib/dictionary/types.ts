/**
 * Shared types for the Dictionary feature. Like `src/lib/vocab/types.ts`,
 * this module has no Firestore or React dependency — it's the vocabulary
 * shared by the pure lookup/ordering code (`normalize.ts`, `collation.ts`,
 * `dictionary-index.ts`), the data layer (`repository.ts`,
 * `shared-source.ts`) and the UI.
 *
 * Three distinct things live in the Dictionary's data model, and they are
 * deliberately never merged into one record:
 *
 *  1. **Shared entries** (`SharedEntry`) — the app-wide reference dataset,
 *     generated from a spreadsheet by `scripts/import-dictionary.mts` into
 *     `public/dictionary/shared.json`. Read-only at runtime: nothing in the
 *     app can write to it, so a user can't overwrite a shared definition.
 *  2. **Personal entries** (`PersonalEntry`) — words a user adds, stored at
 *     `users/{uid}/dictionaryEntries/{docId}`. If a personal entry's
 *     headword also exists in the shared dataset, the personal doc acts as
 *     an *overlay* ("my extra meanings / notes") on that shared entry rather
 *     than a second copy of the word.
 *  3. **SRS cards** (`VocabCard`, in `src/lib/vocab/types.ts`) — what the
 *     user is actually studying. A card links to the dictionary by the
 *     headword key (`VocabCard.dictionaryKey`); the dictionary never stores
 *     SRS state, and adding a word to the SRS never copies or modifies a
 *     dictionary record.
 *
 * The **headword key** (see `headwordKey` in `normalize.ts`) is the stable
 * dictionary ID: a normalized form of the Vietnamese headword (NFC, trimmed,
 * single-spaced, lowercased — tone marks and other diacritics preserved).
 * Shared and personal layers for the same word share one key, which is what
 * groups them under a single headword.
 */

/** One example sentence, Vietnamese with an optional English translation. */
export interface DictionaryExample {
  vi: string;
  en?: string;
}

/**
 * One meaning of a headword. A headword with several meanings keeps them
 * as several senses on one entry, never as duplicate headwords.
 */
export interface DictionarySense {
  /** English gloss/translation, e.g. "to eat" or "older brother / you (to older male)". */
  english: string;
  /**
   * Part of speech as written in the source data — abbreviations like
   * `"n"`, `"v"`, `"pron/n"` (several separated by `/`). Kept raw on purpose
   * so nothing is lost on import; `partOfSpeechLabels` turns it into
   * display labels.
   */
  partOfSpeech?: string;
  /** Monolingual Vietnamese definition, possibly numbered ("1. … 2. …"). */
  definitionVi?: string;
  examples: DictionaryExample[];
}

/** An entry from the shared, read-only dataset. */
export interface SharedEntry {
  /** The headword key (stable dictionary ID). */
  key: string;
  /** The headword as it should be displayed, e.g. "Việt Nam". */
  headword: string;
  senses: DictionarySense[];
  /** Learner level from the source data, e.g. "Beginner I". */
  level?: string;
}

/** A user's own dictionary record — either a custom word or an overlay on a shared one. */
export interface PersonalEntry {
  key: string;
  headword: string;
  senses: DictionarySense[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

/** What the create/edit form collects for a personal entry. */
export interface PersonalEntryInput {
  headword: string;
  english: string;
  partOfSpeech: string;
  /** Extra meanings, one English gloss each. */
  additionalMeanings: string[];
  exampleVi: string;
  exampleEn: string;
  notes: string;
}

/**
 * The unit the Dictionary displays: one headword, with whichever layers
 * exist for it. At least one of `shared`/`personal` is always set.
 */
export interface DictionaryHeadword {
  key: string;
  /** Display form — the shared entry's spelling when there is one. */
  headword: string;
  shared?: SharedEntry;
  personal?: PersonalEntry;
}

/** The file format of `public/dictionary/shared.json`. */
export interface SharedDictionaryFile {
  version: 1;
  /** Where the data came from (spreadsheet file name), for traceability. */
  source: string;
  generatedAt: string;
  entries: SharedEntry[];
}
