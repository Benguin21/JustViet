/**
 * Turning the Add/Edit Word form's input into personal-entry senses and
 * back. Pure.
 */
import { cleanHeadword, normalizeSearchText } from "./normalize";
import type { DictionarySense, PersonalEntry, PersonalEntryInput } from "./types";

const clean = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();

/** The single sense the form's main fields describe (gloss + part of speech + example). */
export function primarySenseFromInput(input: PersonalEntryInput): DictionarySense {
  const exampleVi = clean(input.exampleVi);
  const exampleEn = clean(input.exampleEn);
  const partOfSpeech = clean(input.partOfSpeech);
  return {
    english: clean(input.english),
    ...(partOfSpeech && { partOfSpeech }),
    examples: exampleVi ? [{ vi: exampleVi, ...(exampleEn && { en: exampleEn }) }] : [],
  };
}

/**
 * All senses for a form submission: the primary sense, then one per extra
 * meaning. When editing, extra meanings keep the details (examples, part of
 * speech) they already had if their gloss is unchanged, so saving the
 * form never silently drops data the form doesn't display.
 */
export function sensesFromInput(
  input: PersonalEntryInput,
  previous: DictionarySense[] = [],
): DictionarySense[] {
  const primary = primarySenseFromInput(input);
  const seen = new Set([normalizeSearchText(primary.english)]);
  const extras: DictionarySense[] = [];
  for (const meaning of input.additionalMeanings.map(clean).filter(Boolean)) {
    const norm = normalizeSearchText(meaning);
    if (seen.has(norm)) continue;
    seen.add(norm);
    const kept = previous.slice(1).find((s) => normalizeSearchText(s.english) === norm);
    extras.push(kept ?? { english: meaning, examples: [] });
  }
  return [primary, ...extras];
}

/** The form's initial values when editing an existing personal entry. */
export function inputFromPersonalEntry(entry: PersonalEntry): PersonalEntryInput {
  const [primary, ...rest] = entry.senses;
  const example = primary?.examples[0];
  return {
    headword: entry.headword,
    english: primary?.english ?? "",
    partOfSpeech: primary?.partOfSpeech ?? "",
    additionalMeanings: rest.map((s) => s.english),
    exampleVi: example?.vi ?? "",
    exampleEn: example?.en ?? "",
    notes: entry.notes,
  };
}

/**
 * Adds a sense to an entry's list unless a sense with the same gloss is
 * already there (case/spacing-insensitive). Returns the same array when
 * nothing changed.
 */
export function appendSense(senses: DictionarySense[], sense: DictionarySense): DictionarySense[] {
  const norm = normalizeSearchText(sense.english);
  if (senses.some((s) => normalizeSearchText(s.english) === norm)) return senses;
  return [...senses, sense];
}

export function validatePersonalEntryInput(
  input: PersonalEntryInput,
): Partial<Record<"headword" | "english", string>> {
  const errors: Partial<Record<"headword" | "english", string>> = {};
  if (!cleanHeadword(input.headword)) errors.headword = "Enter the Vietnamese word or phrase.";
  if (!clean(input.english)) errors.english = "Enter its English meaning.";
  return errors;
}
