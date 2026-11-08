import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareVietnamese } from "./collation";
import { briefDefinition, DictionaryIndex } from "./dictionary-index";
import { headwordKey } from "./normalize";
import type { PersonalEntry, SharedDictionaryFile, SharedEntry } from "./types";

function shared(headword: string, english: string, extra: Partial<SharedEntry> = {}): SharedEntry {
  return { key: headwordKey(headword), headword, senses: [{ english, examples: [] }], ...extra };
}

function personal(headword: string, english: string): PersonalEntry {
  return {
    key: headwordKey(headword),
    headword,
    senses: [{ english, examples: [] }],
    notes: "",
    createdAt: 1,
    updatedAt: 1,
  };
}

const SAMPLE: SharedEntry[] = [
  shared("học", "to study"),
  shared("học sinh", "student"),
  shared("đại học", "university"),
  shared("tiếng Việt", "Vietnamese language"),
  shared("tôi", "I / me"),
  shared("ma", "ghost"),
  shared("má", "mother (Southern)"),
  shared("mà", "but"),
  shared("ăn", "to eat"),
  shared("ăn sáng", "to eat breakfast"),
];

describe("DictionaryIndex.build", () => {
  it("lists headwords in Vietnamese dictionary order", () => {
    const index = DictionaryIndex.build(SAMPLE);
    const words = index.headwords.map((h) => h.headword);
    expect(words).toEqual([...words].sort(compareVietnamese));
    expect(words.slice(0, 2)).toEqual(["ăn", "ăn sáng"]);
  });

  it("shows a personal entry for a shared word as an overlay, not a duplicate headword", () => {
    const index = DictionaryIndex.build(SAMPLE, [personal("Học", "to learn (my note)")]);
    expect(index.size).toBe(SAMPLE.length);
    const hoc = index.get("học");
    expect(hoc?.shared?.senses[0].english).toBe("to study");
    expect(hoc?.personal?.senses[0].english).toBe("to learn (my note)");
    expect(briefDefinition(hoc!)).toBe("to study; to learn (my note)");
  });

  it("adds custom words in their correct alphabetical position", () => {
    const index = DictionaryIndex.build(SAMPLE, [personal("mạ", "rice seedling")]);
    const words = index.headwords.map((h) => h.headword);
    expect(words.indexOf("mạ")).toBe(words.indexOf("má") + 1);
    expect(index.get("mạ")?.shared).toBeUndefined();
    expect(index.get("mạ")?.personal).toBeDefined();
  });

  it("never lets a personal entry replace shared data", () => {
    const index = DictionaryIndex.build(SAMPLE, [personal("ăn", "something else")]);
    expect(index.get("ăn")?.shared?.senses).toEqual([{ english: "to eat", examples: [] }]);
  });

  it("records each headword's jump-bar letter", () => {
    const index = DictionaryIndex.build(SAMPLE);
    expect(index.letters[index.indexOf("đại học")]).toBe("đ");
    expect(index.letters[index.indexOf("ăn")]).toBe("ă");
  });
});

describe("DictionaryIndex.get", () => {
  const index = DictionaryIndex.build(SAMPLE);

  it("looks up by any capitalization/encoding of the headword", () => {
    expect(index.get("TIẾNG VIỆT")?.headword).toBe("tiếng Việt");
    expect(index.get("học")?.headword).toBe("học"); // decomposed dot below
  });

  it("is tone-sensitive", () => {
    expect(index.get("má")?.shared?.senses[0].english).toBe("mother (Southern)");
    expect(index.get("mả")).toBeUndefined();
  });
});

describe("DictionaryIndex.search", () => {
  const index = DictionaryIndex.build(SAMPLE);
  const words = (q: string) => index.search(q).map((r) => r.headword.headword);

  it("finds Vietnamese words, exact match first, then prefix matches", () => {
    expect(words("học").slice(0, 2)).toEqual(["học", "học sinh"]);
    expect(index.search("học")[0].kind).toBe("exact");
  });

  it("finds words containing the query (compounds)", () => {
    expect(words("học")).toContain("đại học");
  });

  it("suggests accent-insensitive matches after exact ones, without merging them", () => {
    const results = index.search("mà");
    expect(results[0]).toMatchObject({ kind: "exact", headword: { headword: "mà" } });
    const similar = results.filter((r) => r.kind === "similar-spelling").map((r) => r.headword.headword);
    expect(similar).toEqual(["ma", "má"]);
  });

  it("puts every match with the typed accents before accent-insensitive ones", () => {
    // "đại học" contains "học" exactly, so it beats "hóc"-style loose matches.
    const idx = DictionaryIndex.build([...SAMPLE, shared("hóc", "to be stuck in the throat")]);
    const results = idx.search("học").map((r) => `${r.headword.headword}:${r.kind}`);
    expect(results).toEqual([
      "học:exact",
      "học sinh:headword",
      "đại học:headword",
      "hóc:similar-spelling",
    ]);
  });

  it("doesn't flag accent-free queries' matches as merely similar", () => {
    const results = index.search("hoc");
    expect(results.map((r) => r.headword.headword).slice(0, 2)).toEqual(["học", "học sinh"]);
    expect(results.every((r) => r.kind !== "similar-spelling")).toBe(true);
  });

  it("finds words by typing without diacritics", () => {
    expect(words("hoc sinh")).toContain("học sinh");
    expect(words("dai hoc")).toContain("đại học");
  });

  it("searches English definitions, preferring whole-word and shorter matches", () => {
    expect(words("eat")).toEqual(["ăn", "ăn sáng"]);
    expect(words("student")).toEqual(["học sinh"]);
    expect(words("stud")).toEqual(["học sinh", "học"]); // "student" (shorter gloss), "to study"
    expect(words("eat")).not.toContain("thịt"); // "meat" is not a match for "eat"
    expect(index.search("student")[0].kind).toBe("english");
  });

  it("is case-insensitive for English", () => {
    expect(words("VIETNAMESE")).toEqual(["tiếng Việt"]);
  });

  it("returns nothing for an empty query", () => {
    expect(index.search("   ")).toEqual([]);
  });
});

describe("DictionaryIndex.segment / matchesAt (future in-context lookup)", () => {
  const index = DictionaryIndex.build(SAMPLE);
  const spans = (text: string) => index.segment(text).map((m) => text.slice(m.start, m.end));

  it("matches multi-syllable words, preferring the longest match", () => {
    expect(spans("Tôi đang học tiếng Việt.")).toEqual(["Tôi", "học", "tiếng Việt"]);
    expect(spans("Học sinh học đại học")).toEqual(["Học sinh", "học", "đại học"]);
  });

  it("doesn't join syllables across punctuation", () => {
    expect(spans("Tôi học. Sinh viên")).toEqual(["Tôi", "học"]);
  });

  it("returns every entry covering a position, longest first", () => {
    const text = "Em là học sinh.";
    const offset = text.indexOf("học");
    expect(index.matchesAt(text, offset).map((m) => m.headword.headword)).toEqual(["học sinh", "học"]);
    expect(index.matchesAt(text, text.indexOf("sinh")).map((m) => m.headword.headword)).toEqual([
      "học sinh",
    ]);
    expect(index.matchesAt(text, 0)).toEqual([]); // "Em" isn't in the sample
  });

  it("works on decomposed (NFD) text, with offsets into the original string", () => {
    const text = "Tôi ăn sáng".normalize("NFD");
    const [, match] = index.segment(text);
    expect(text.slice(match.start, match.end).normalize("NFC")).toBe("ăn sáng");
  });
});

describe("with the real shared dataset", () => {
  const file = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../public/dictionary/shared.json"), "utf8"),
  ) as SharedDictionaryFile;
  const index = DictionaryIndex.build(file.entries);

  it("has unique, normalized keys and an English meaning for every entry", () => {
    const keys = file.entries.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of file.entries) {
      expect(entry.key).toBe(headwordKey(entry.headword));
      expect(entry.senses.length).toBeGreaterThan(0);
      expect(entry.senses.every((s) => s.english.length > 0)).toBe(true);
    }
  });

  it("is stored in Vietnamese dictionary order", () => {
    const words = file.entries.map((e) => e.headword);
    expect(words).toEqual(index.headwords.map((h) => h.headword));
  });

  it("supports lookups of multi-word expressions", () => {
    expect(index.maxSyllables).toBeGreaterThan(1);
    expect(index.get("bác sĩ")?.shared?.senses[0].english).toBe("doctor");
  });
});

describe("performance with a large dataset", () => {
  it("builds and searches 30,000 entries quickly", () => {
    const syllables = ["ba", "bà", "cá", "đi", "học", "sinh", "nhà", "ăn", "uống", "mẹ"];
    const big: SharedEntry[] = [];
    for (let i = 0; i < 30_000; i++) {
      const word = `${syllables[i % 10]} ${syllables[Math.floor(i / 10) % 10]} ${i}`;
      big.push(shared(word, `meaning number ${i}`));
    }
    const t0 = performance.now();
    const index = DictionaryIndex.build(big);
    const t1 = performance.now();
    index.search("hoc");
    index.search("meaning 123");
    const t2 = performance.now();
    expect(index.size).toBe(30_000);
    // Generous bounds (CI machines vary); real-world numbers are far lower.
    expect(t1 - t0).toBeLessThan(3000);
    expect(t2 - t1).toBeLessThan(500);
  });
});
