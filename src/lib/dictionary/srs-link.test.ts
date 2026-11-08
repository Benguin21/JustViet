import { describe, expect, it } from "vitest";
import { DictionaryIndex } from "./dictionary-index";
import { appendSense, inputFromPersonalEntry, sensesFromInput, validatePersonalEntryInput } from "./entries";
import { cardDictionaryKey, cardInputFromHeadword, findSrsCard, personalInputFromCard } from "./srs-link";
import { fromSrsPartOfSpeech, partOfSpeechLabels, toSrsPartOfSpeech } from "./part-of-speech";
import type { PersonalEntryInput, SharedEntry } from "./types";

const AN: SharedEntry = {
  key: "ăn",
  headword: "ăn",
  level: "Beginner I",
  senses: [
    {
      english: "to eat",
      partOfSpeech: "v",
      definitionVi: "Đưa thức ăn vào miệng.",
      examples: [{ vi: "Tôi ăn cơm.", en: "I eat rice." }],
    },
  ],
};

describe("findSrsCard", () => {
  it("finds a card linked by dictionaryKey", () => {
    const cards = [{ id: "1", front: "something", dictionaryKey: "ăn" }];
    expect(findSrsCard(cards, "ăn")?.id).toBe("1");
  });

  it("finds an older, unlinked card by its front (normalized)", () => {
    const cards = [{ id: "1", front: " Ăn " }];
    expect(findSrsCard(cards, "ăn")?.id).toBe("1");
  });

  it("is tone-sensitive", () => {
    const cards = [{ id: "1", front: "má" }];
    expect(findSrsCard(cards, "ma")).toBeUndefined();
  });

  it("doesn't match an unlinked front when that card is linked to another word", () => {
    const cards = [{ id: "1", front: "ăn", dictionaryKey: "ăn sáng" }];
    expect(findSrsCard(cards, "ăn")).toBeUndefined();
    expect(cardDictionaryKey(cards[0])).toBe("ăn sáng");
  });
});

describe("cardInputFromHeadword", () => {
  it("builds a flashcard linked by the stable dictionary key", () => {
    const index = DictionaryIndex.build([AN]);
    const input = cardInputFromHeadword(index.get("ăn")!);
    expect(input).toEqual({
      front: "ăn",
      back: "to eat",
      exampleSentence: "Tôi ăn cơm. — I eat rice.",
      partOfSpeech: "verb",
      tags: [],
      pronunciation: "",
      notes: "",
      dictionaryKey: "ăn",
    });
  });

  it("doesn't modify the dictionary entry", () => {
    const before = JSON.stringify(AN);
    cardInputFromHeadword(DictionaryIndex.build([AN]).get("ăn")!);
    expect(JSON.stringify(AN)).toBe(before);
  });
});

describe("personalInputFromCard", () => {
  it("maps a vocab card's fields onto a dictionary entry", () => {
    expect(
      personalInputFromCard({
        front: "xin chào",
        back: "hello",
        exampleSentence: "Xin chào cô!",
        partOfSpeech: "other",
        tags: ["greetings"],
        notes: "polite",
      }),
    ).toEqual({
      headword: "xin chào",
      english: "hello",
      partOfSpeech: "",
      additionalMeanings: [],
      exampleVi: "Xin chào cô!",
      exampleEn: "",
      notes: "polite",
    });
  });
});

describe("part of speech", () => {
  it("expands dataset abbreviations", () => {
    expect(partOfSpeechLabels("pron/n")).toEqual(["pronoun", "noun"]);
    expect(partOfSpeechLabels("cl")).toEqual(["classifier"]);
  });

  it("maps to and from the SRS's categories", () => {
    expect(toSrsPartOfSpeech("n/adj")).toBe("noun");
    expect(toSrsPartOfSpeech("part")).toBe("other");
    expect(toSrsPartOfSpeech(undefined)).toBe("");
    expect(fromSrsPartOfSpeech("adjective")).toBe("adj");
    expect(fromSrsPartOfSpeech("other")).toBe("");
  });
});

const FORM: PersonalEntryInput = {
  headword: "xin chào",
  english: "hello",
  partOfSpeech: "phr",
  additionalMeanings: ["hi", "", "Hello"],
  exampleVi: "Xin chào cô!",
  exampleEn: "Hello, teacher!",
  notes: "",
};

describe("personal entry form helpers", () => {
  it("turns the form into senses, skipping blank and repeated meanings", () => {
    expect(sensesFromInput(FORM)).toEqual([
      {
        english: "hello",
        partOfSpeech: "phr",
        examples: [{ vi: "Xin chào cô!", en: "Hello, teacher!" }],
      },
      { english: "hi", examples: [] },
    ]);
  });

  it("keeps details on extra meanings that the form doesn't show", () => {
    const previous = [
      { english: "hello", examples: [] },
      { english: "hi", partOfSpeech: "interj", examples: [{ vi: "Chào!" }] },
    ];
    expect(sensesFromInput(FORM, previous)[1]).toEqual(previous[1]);
  });

  it("round-trips through the edit form", () => {
    const entry = {
      key: "xin chào",
      headword: "xin chào",
      senses: sensesFromInput(FORM),
      notes: "n",
      createdAt: 1,
      updatedAt: 1,
    };
    expect(inputFromPersonalEntry(entry)).toEqual({ ...FORM, additionalMeanings: ["hi"], notes: "n" });
  });

  it("doesn't append a meaning that's already there", () => {
    const senses = [{ english: "Hello", examples: [] }];
    expect(appendSense(senses, { english: " hello ", examples: [] })).toBe(senses);
    expect(appendSense(senses, { english: "hi", examples: [] })).toHaveLength(2);
  });

  it("requires the Vietnamese word and the English meaning", () => {
    expect(validatePersonalEntryInput({ ...FORM, headword: "  ", english: "" })).toEqual({
      headword: "Enter the Vietnamese word or phrase.",
      english: "Enter its English meaning.",
    });
    expect(validatePersonalEntryInput(FORM)).toEqual({});
  });
});
