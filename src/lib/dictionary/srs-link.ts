/**
 * The bridge between the Dictionary and the Vocab SRS — the one place that
 * knows how a dictionary headword relates to a vocab card. Pure.
 *
 * Link model: a card stores the headword key in `VocabCard.dictionaryKey`
 * when it was created from (or explicitly linked to) the dictionary. Cards
 * made before linking existed, or added without the "also add to my
 * Dictionary" box, have no `dictionaryKey`; for those the card's `front`
 * is matched by the same normalization, so an older card for "ăn" still
 * counts as "already in your vocab" and is never duplicated.
 */
import { englishGlosses } from "./dictionary-index";
import { headwordKey } from "./normalize";
import { fromSrsPartOfSpeech, toSrsPartOfSpeech } from "./part-of-speech";
import type {
  DictionaryHeadword,
  DictionaryExample,
  DictionarySense,
  PersonalEntryInput,
} from "./types";
import type { NewVocabCardInput, VocabCard } from "@/lib/vocab/types";

/** The headword key a card belongs to: its explicit link, else its normalized front. */
export function cardDictionaryKey(card: Pick<VocabCard, "front" | "dictionaryKey">): string {
  return card.dictionaryKey || headwordKey(card.front);
}

/**
 * The user's existing SRS card for a headword, if any. Explicitly linked
 * cards win over a mere front-text match.
 */
export function findSrsCard<C extends Pick<VocabCard, "front" | "dictionaryKey">>(
  cards: C[],
  text: string,
): C | undefined {
  const key = headwordKey(text);
  return (
    cards.find((c) => c.dictionaryKey === key) ??
    cards.find((c) => !c.dictionaryKey && headwordKey(c.front) === key)
  );
}

function allSenses(headword: DictionaryHeadword): DictionarySense[] {
  return [...(headword.shared?.senses ?? []), ...(headword.personal?.senses ?? [])];
}

function formatExample(example: DictionaryExample | undefined): string {
  if (!example) return "";
  return example.en ? `${example.vi} — ${example.en}` : example.vi;
}

/**
 * The new SRS card for a dictionary headword. Copies just what a flashcard
 * needs (word, gloss, one example) and records the link; the dictionary
 * entry itself is not modified and isn't copied wholesale.
 */
export function cardInputFromHeadword(headword: DictionaryHeadword): NewVocabCardInput {
  const senses = allSenses(headword);
  const firstExample = senses.flatMap((s) => s.examples)[0];
  return {
    front: headword.headword,
    back: Array.from(new Set(englishGlosses(headword))).join("; "),
    exampleSentence: formatExample(firstExample),
    partOfSpeech: toSrsPartOfSpeech(senses.find((s) => s.partOfSpeech)?.partOfSpeech),
    tags: [],
    pronunciation: "",
    notes: headword.personal?.notes ?? "",
    dictionaryKey: headword.key,
  };
}

/** A personal dictionary entry built from a manually created vocab card (the "also add to my Dictionary" box). */
export function personalInputFromCard(input: NewVocabCardInput): PersonalEntryInput {
  return {
    headword: input.front,
    english: input.back,
    partOfSpeech: fromSrsPartOfSpeech(input.partOfSpeech),
    additionalMeanings: [],
    exampleVi: input.exampleSentence,
    exampleEn: "",
    notes: input.notes ?? "",
  };
}
