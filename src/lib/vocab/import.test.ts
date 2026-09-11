import { describe, expect, it } from "vitest";
import {
  buildImportPreview,
  detectDelimiter,
  parseImportText,
  toNewCardInput,
} from "./import";

describe("detectDelimiter", () => {
  it("detects tab-separated data (Excel/Sheets paste)", () => {
    expect(detectDelimiter("eat\tăn\nschool\ttrường")).toBe("tab");
  });

  it("detects comma-separated data", () => {
    expect(detectDelimiter("eat,ăn\nschool,trường")).toBe("comma");
  });

  it("detects semicolon-separated data", () => {
    expect(detectDelimiter("eat;ăn\nschool;trường")).toBe("semicolon");
  });

  it("detects pipe-separated data", () => {
    expect(detectDelimiter("eat|ăn\nschool|trường")).toBe("pipe");
  });

  it("falls back to tab for a single unsplittable line", () => {
    expect(detectDelimiter("just one word")).toBe("tab");
  });
});

describe("parseImportText", () => {
  it("parses tab-separated data with a header row, mapping by column name", () => {
    const text = [
      "English\tVietnamese\tPart of Speech\tExample\tTags",
      "eat\tăn\tverb\tTôi ăn cơm.\tfood",
      "school\ttrường\tnoun\tTôi đi học.\teducation",
    ].join("\n");

    const result = parseImportText(text);
    expect(result.delimiterUsed).toBe("tab");
    expect(result.hadHeaderRow).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      english: "eat",
      vietnamese: "ăn",
      partOfSpeech: "verb",
      example: "Tôi ăn cơm.",
      tags: ["food"],
    });
  });

  it("maps columns correctly even when the header order is shuffled", () => {
    const text = ["Vietnamese\tTags\tEnglish", "ăn\tfood\teat"].join("\n");
    const result = parseImportText(text);
    expect(result.hadHeaderRow).toBe(true);
    expect(result.rows[0]).toMatchObject({ english: "eat", vietnamese: "ăn", tags: ["food"] });
  });

  it("parses headerless data assuming English, Vietnamese column order", () => {
    const text = ["eat\tăn", "school\ttrường", "beautiful\tđẹp"].join("\n");
    const result = parseImportText(text);
    expect(result.hadHeaderRow).toBe(false);
    expect(result.rows).toEqual([
      expect.objectContaining({ english: "eat", vietnamese: "ăn" }),
      expect.objectContaining({ english: "school", vietnamese: "trường" }),
      expect.objectContaining({ english: "beautiful", vietnamese: "đẹp" }),
    ]);
  });

  it("parses comma-separated data", () => {
    const text = "eat,ăn,verb\nschool,trường,noun";
    const result = parseImportText(text, "comma");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ english: "eat", vietnamese: "ăn", partOfSpeech: "verb" });
  });

  it("respects an explicit delimiter override, even with commas inside a cell", () => {
    const text = "hello, hi\thello, chào";
    const result = parseImportText(text, "tab");
    expect(result.rows[0]).toMatchObject({ english: "hello, hi", vietnamese: "hello, chào" });
  });

  it("supports all optional columns: part of speech, example, tags, pronunciation, notes", () => {
    const text = [
      "English\tVietnamese\tPart of Speech\tExample\tTags\tPronunciation\tNotes",
      "eat\tăn\tverb\tTôi ăn cơm.\tfood, common\tan\tCommon verb",
    ].join("\n");
    const result = parseImportText(text);
    expect(result.rows[0]).toEqual({
      line: 2,
      english: "eat",
      vietnamese: "ăn",
      partOfSpeech: "verb",
      example: "Tôi ăn cơm.",
      tags: ["food", "common"],
      pronunciation: "an",
      notes: "Common verb",
    });
  });

  it("defaults missing optional columns to blank rather than throwing", () => {
    const result = parseImportText("eat\tăn");
    expect(result.rows[0]).toMatchObject({
      partOfSpeech: "other",
      example: "",
      tags: [],
      pronunciation: "",
      notes: "",
    });
  });

  it("preserves Vietnamese diacritics exactly", () => {
    const result = parseImportText("beautiful\tđẹp\nschool\ttrường\nhello\txin chào");
    expect(result.rows.map((r) => r.vietnamese)).toEqual(["đẹp", "trường", "xin chào"]);
  });

  it("drops blank lines instead of producing empty rows", () => {
    const result = parseImportText("eat\tăn\n\n\nschool\ttrường\n");
    expect(result.rows).toHaveLength(2);
  });

  it("normalizes common part-of-speech abbreviations", () => {
    const text = "eat\tăn\tv\nbeautiful\tđẹp\tadj";
    const result = parseImportText(text, "tab");
    expect(result.rows[0].partOfSpeech).toBe("verb");
    expect(result.rows[1].partOfSpeech).toBe("adjective");
  });
});

describe("buildImportPreview", () => {
  const parse = (text: string) => parseImportText(text).rows;

  it("flags missing English and missing Vietnamese, unchecked by default", () => {
    const rows = parse("\tăn\nschool\t");
    const preview = buildImportPreview(rows, []);
    expect(preview[0].problems).toEqual(["missing-english"]);
    expect(preview[0].included).toBe(false);
    expect(preview[1].problems).toEqual(["missing-vietnamese"]);
    expect(preview[1].included).toBe(false);
  });

  it("marks a row ok and included when both fields are present and unique", () => {
    const rows = parse("eat\tăn");
    const preview = buildImportPreview(rows, []);
    expect(preview[0].problems).toEqual([]);
    expect(preview[0].included).toBe(true);
  });

  it("flags a row as a duplicate of an existing card", () => {
    const rows = parse("eat\tăn");
    const preview = buildImportPreview(rows, [{ front: "ăn", back: "eat" } as never]);
    expect(preview[0].problems).toEqual(["duplicate-existing"]);
    expect(preview[0].included).toBe(false);
  });

  it("existing-card duplicate check is case-insensitive and trims whitespace", () => {
    const rows = parse(" Eat \t ĂN ");
    const preview = buildImportPreview(rows, [{ front: "ăn", back: "eat" } as never]);
    expect(preview[0].problems).toContain("duplicate-existing");
  });

  it("flags the second occurrence of a duplicate within the same paste, not the first", () => {
    const rows = parse("eat\tăn\neat\tăn");
    const preview = buildImportPreview(rows, []);
    expect(preview[0].problems).toEqual([]);
    expect(preview[0].included).toBe(true);
    expect(preview[1].problems).toEqual(["duplicate-in-batch"]);
    expect(preview[1].included).toBe(false);
  });

  it("summarizes new/duplicate/invalid counts matching a mixed paste", () => {
    const rows = parse(
      ["eat\tăn", "eat\tăn", "school\ttrường", "\tđẹp", "beautiful\t"].join("\n"),
    );
    const preview = buildImportPreview(rows, [{ front: "trường", back: "school" } as never]);
    const ok = preview.filter((r) => r.problems.length === 0);
    const duplicates = preview.filter((r) => r.problems.some((p) => p.startsWith("duplicate")));
    const invalid = preview.filter((r) => r.problems.some((p) => p.startsWith("missing")));
    expect(ok).toHaveLength(1); // "eat/ăn" (first occurrence)
    expect(duplicates).toHaveLength(2); // "eat/ăn" repeat + "school/trường" already exists
    expect(invalid).toHaveLength(2); // missing english, missing vietnamese
  });
});

describe("toNewCardInput", () => {
  it("maps Vietnamese to front and English to back, matching the manual Add Card form", () => {
    const [row] = buildImportPreview(parseImportText("eat\tăn\tverb\tTôi ăn cơm.\tfood").rows, []);
    expect(toNewCardInput(row)).toMatchObject({
      front: "ăn",
      back: "eat",
      exampleSentence: "Tôi ăn cơm.",
      partOfSpeech: "verb",
      tags: ["food"],
    });
  });
});
