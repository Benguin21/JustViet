import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetStore, store } from "@/test/fake-firestore";

vi.mock("firebase/firestore", async () => await import("@/test/fake-firestore"));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: undefined, isFirebaseConfigured: true }));

const dictRepo = await import("./repository");
const vocabRepo = await import("@/lib/vocab/repository");
const { DuplicateDictionaryEntryError } = await import("./errors");

const INPUT = {
  headword: "xin chào",
  english: "hello",
  partOfSpeech: "",
  additionalMeanings: [],
  exampleVi: "",
  exampleEn: "",
  notes: "",
};

beforeEach(() => resetStore());

describe("personal dictionary entries", () => {
  it("stores entries under the signed-in user only", async () => {
    await dictRepo.createPersonalEntry("u1", INPUT);
    expect(await dictRepo.fetchPersonalEntries("u1")).toHaveLength(1);
    expect(await dictRepo.fetchPersonalEntries("u2")).toEqual([]);
    expect(Array.from(store.keys())).toEqual([
      `users/u1/dictionaryEntries/${dictRepo.personalEntryDocId("xin chào")}`,
    ]);
  });

  it("can't create the same word twice, even with simultaneous requests", async () => {
    const results = await Promise.allSettled([
      dictRepo.createPersonalEntry("u1", INPUT),
      dictRepo.createPersonalEntry("u1", { ...INPUT, headword: "  Xin   Chào " }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(DuplicateDictionaryEntryError);
    expect(await dictRepo.fetchPersonalEntries("u1")).toHaveLength(1);
  });

  it("allows words that differ only in tone", async () => {
    await dictRepo.createPersonalEntry("u1", { ...INPUT, headword: "ma", english: "ghost" });
    await dictRepo.createPersonalEntry("u1", { ...INPUT, headword: "má", english: "mother" });
    expect(await dictRepo.fetchPersonalEntries("u1")).toHaveLength(2);
  });

  it("adds meanings to one entry instead of duplicating the word", async () => {
    await dictRepo.addSensesToEntry("u1", "ăn", [{ english: "to consume", examples: [] }]);
    await dictRepo.addSensesToEntry("u1", "Ăn", [
      { english: "To consume", examples: [] }, // same gloss — not repeated
      { english: "to win (a game)", examples: [] },
    ]);
    const [entry] = await dictRepo.fetchPersonalEntries("u1");
    expect(entry.senses.map((s) => s.english)).toEqual(["to consume", "to win (a game)"]);
  });

  it("keeps the key and creation date when edited", async () => {
    const created = await dictRepo.createPersonalEntry("u1", INPUT);
    const updated = await dictRepo.updatePersonalEntry("u1", created, { ...INPUT, english: "hi there" });
    expect(updated).toMatchObject({ key: created.key, createdAt: created.createdAt });
    expect((await dictRepo.fetchPersonalEntries("u1"))[0].senses[0].english).toBe("hi there");
  });
});

describe("ensureEntryForWord (the SRS form's dictionary checkbox)", () => {
  it("links to a shared entry without writing anything", async () => {
    const result = await dictRepo.ensureEntryForWord("u1", { ...INPUT, headword: "ăn" }, (k) => k === "ăn");
    expect(result).toEqual({ key: "ăn", outcome: "linked-shared" });
    expect(store.size).toBe(0);
  });

  it("creates a personal entry when the word isn't in the dictionary, then links to it", async () => {
    const first = await dictRepo.ensureEntryForWord("u1", INPUT, () => false);
    const second = await dictRepo.ensureEntryForWord("u1", { ...INPUT, english: "other" }, () => false);
    expect(first.outcome).toBe("created");
    expect(second.outcome).toBe("linked-personal");
    const entries = await dictRepo.fetchPersonalEntries("u1");
    expect(entries).toHaveLength(1);
    expect(entries[0].senses[0].english).toBe("hello"); // not overwritten
  });
});

describe("createDictionaryCard (Add to Vocabulary)", () => {
  const CARD = {
    front: "ăn",
    back: "to eat",
    exampleSentence: "",
    partOfSpeech: "verb" as const,
    tags: [],
    dictionaryKey: "ăn",
  };

  it("creates exactly one card, even when clicked twice at once", async () => {
    const [a, b] = await Promise.all([
      vocabRepo.createDictionaryCard("u1", CARD),
      vocabRepo.createDictionaryCard("u1", CARD),
    ]);
    expect([a.created, b.created].sort()).toEqual([false, true]);
    expect(a.card.id).toBe(b.card.id);
    expect(await vocabRepo.fetchCards("u1")).toHaveLength(1);
    expect((await vocabRepo.fetchCards("u1"))[0].dictionaryKey).toBe("ăn");
  });

  it("never resets an existing card's SRS progress", async () => {
    const { card } = await vocabRepo.createDictionaryCard("u1", CARD);
    const path = `users/u1/vocabCards/${card.id}`;
    store.set(path, { ...store.get(path), state: "review", reviewCount: 7, stability: 12.5 });

    const again = await vocabRepo.createDictionaryCard("u1", CARD);
    expect(again.created).toBe(false);
    expect(again.card).toMatchObject({ state: "review", reviewCount: 7, stability: 12.5 });
  });

  it("deleting a dictionary entry leaves the vocab card and its history alone", async () => {
    await dictRepo.createPersonalEntry("u1", { ...INPUT, headword: "ăn", english: "to eat" });
    const { card } = await vocabRepo.createDictionaryCard("u1", CARD);
    store.set("users/u1/reviewLogs/log1", { cardId: card.id, rating: "good", reviewedAt: 1 });

    await dictRepo.deletePersonalEntry("u1", "ăn");
    expect(await dictRepo.fetchPersonalEntries("u1")).toEqual([]);
    expect(await vocabRepo.fetchCards("u1")).toHaveLength(1);
    expect(store.has("users/u1/reviewLogs/log1")).toBe(true);
  });

  it("omits the link field for ordinary cards (Firestore rejects undefined)", async () => {
    const created = await vocabRepo.createCard("u1", { ...CARD, dictionaryKey: undefined });
    expect("dictionaryKey" in created).toBe(false);
  });
});
