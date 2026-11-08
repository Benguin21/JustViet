/**
 * Dictionary operations that callers outside the Dictionary tab need,
 * usable without mounting `useDictionary` (which loads the whole merged
 * index). Today that's the Vocab page's "Also add this word to my
 * Dictionary" box.
 */
import * as repo from "./repository";
import { personalInputFromCard } from "./srs-link";
import { loadSharedDictionary } from "./shared-source";
import type { NewVocabCardInput } from "@/lib/vocab/types";

let sharedKeys: Promise<Set<string>> | null = null;

function loadSharedKeys(): Promise<Set<string>> {
  if (!sharedKeys) {
    sharedKeys = loadSharedDictionary()
      .then((entries) => new Set(entries.map((e) => e.key)))
      .catch((err) => {
        sharedKeys = null;
        throw err;
      });
  }
  return sharedKeys;
}

export type EnsureEntryOutcome = "linked-shared" | "linked-personal" | "created";

/**
 * For a vocab card being created with the dictionary box checked: links to
 * the existing dictionary entry (shared or personal) if there is one,
 * otherwise creates a personal entry from the card's fields. Returns the
 * headword key to store on the card as `dictionaryKey`.
 */
export async function ensureDictionaryEntryForCard(
  uid: string,
  input: NewVocabCardInput,
): Promise<{ key: string; outcome: EnsureEntryOutcome }> {
  const keys = await loadSharedKeys();
  const { key, outcome } = await repo.ensureEntryForWord(uid, personalInputFromCard(input), (k) =>
    keys.has(k),
  );
  return { key, outcome };
}
