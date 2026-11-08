/**
 * Part-of-speech handling. The dataset uses short abbreviations, possibly
 * several joined by "/" ("pron/n"); the Vocab SRS uses a fixed set of full
 * names (`PartOfSpeech` in `src/lib/vocab/types.ts`). Pure.
 */
import type { PartOfSpeech } from "@/lib/vocab/types";

/** Abbreviation → display label. Unknown codes display as written. */
const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  pron: "pronoun",
  prep: "preposition",
  conj: "conjunction",
  num: "number",
  part: "particle",
  cl: "classifier",
  det: "determiner",
  phr: "phrase",
  interj: "interjection",
  intj: "interjection",
};

/** Choices for the "Part of speech" field on the Add Word form (stored as the abbreviation). */
export const DICTIONARY_POS_OPTIONS: { value: string; label: string }[] = [
  "n", "v", "adj", "adv", "pron", "prep", "conj", "num", "cl", "part", "det", "interj", "phr",
].map((value) => ({ value, label: POS_LABELS[value] }));

/** "pron/n" → ["pronoun", "noun"]. */
export function partOfSpeechLabels(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[/,;]/)
    .map((p) => p.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean)
    .map((p) => POS_LABELS[p] ?? p);
}

const SRS_POS: Record<string, PartOfSpeech> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  preposition: "preposition",
  conjunction: "conjunction",
};

/**
 * The SRS card's part of speech for a dictionary sense: the first listed
 * part of speech, mapped onto the SRS's categories ("other" for ones the
 * SRS doesn't list, like particles or classifiers; "" when unknown).
 */
export function toSrsPartOfSpeech(raw: string | undefined): PartOfSpeech {
  const [first] = partOfSpeechLabels(raw);
  if (!first) return "";
  return SRS_POS[first] ?? "other";
}

/** The reverse, for cards added to the dictionary from the SRS: "noun" → "n". */
export function fromSrsPartOfSpeech(pos: PartOfSpeech): string {
  if (!pos || pos === "other") return "";
  const entry = Object.entries(POS_LABELS).find(([, label]) => label === pos);
  return entry?.[0] ?? "";
}
