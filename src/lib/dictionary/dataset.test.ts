import { describe, expect, it } from "vitest";
import { mapDatasetRows } from "./dataset";

const HEADER = [
  "Vietnamese",
  "English Translation",
  "Definition (Viet)",
  "Part of Speech",
  "Example Sentence (Viet)",
  "Example Sentence (English)",
  "Difficulty",
];

describe("mapDatasetRows", () => {
  it("maps the current spreadsheet's columns onto the schema", () => {
    const result = mapDatasetRows([
      HEADER,
      ["ăn", "to eat", "Đưa thức ăn vào miệng.", "v", "Tôi ăn cơm.", "I eat rice.", "Beginner I"],
    ]);
    expect(result.entries).toEqual([
      {
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
      },
    ]);
    expect(result.unmappedHeaders).toEqual([]);
  });

  it("matches headers by name, not position, and ignores unknown columns", () => {
    const result = mapDatasetRows([
      ["Notes", "english", "Word"],
      ["x", "hello", "xin chào"],
    ]);
    expect(result.entries[0]).toMatchObject({ headword: "xin chào", senses: [{ english: "hello" }] });
    expect(result.unmappedHeaders).toEqual(["Notes"]);
  });

  it("throws a helpful error when required columns are missing", () => {
    expect(() => mapDatasetRows([["Foo", "Bar"], ["a", "b"]])).toThrow(/Vietnamese column/);
  });

  it("merges rows for the same headword into one entry with several senses", () => {
    const result = mapDatasetRows([
      HEADER,
      ["ba", "three", "", "num", "", "", ""],
      ["Ba", "father (Southern)", "", "n", "", "", ""],
    ]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].senses.map((s) => s.english)).toEqual(["three", "father (Southern)"]);
    expect(result.issues).toEqual([{ row: 3, problem: "merged-duplicate", headword: "Ba" }]);
  });

  it("keeps words that differ only in tone as separate entries", () => {
    const result = mapDatasetRows([HEADER, ["ma", "ghost"], ["má", "mother"], ["mà", "but"]]);
    expect(result.entries.map((e) => e.headword)).toEqual(["ma", "mà", "má"]);
  });

  it("skips blank rows and reports rows missing required fields", () => {
    const result = mapDatasetRows([HEADER, ["", "", ""], ["", "orphan"], ["lẻ", ""], ["ok", "fine"]]);
    expect(result.rowCount).toBe(3);
    expect(result.entries.map((e) => e.headword)).toEqual(["ok"]);
    expect(result.issues.map((i) => i.problem)).toEqual(["missing-vietnamese", "missing-english"]);
  });

  it("normalizes Unicode and whitespace in headwords", () => {
    const result = mapDatasetRows([HEADER, ["  xin   chào ", "hello"]]);
    expect(result.entries[0].headword).toBe("xin chào");
    expect(result.entries[0].key).toBe("xin chào");
  });
});
