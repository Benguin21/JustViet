import { describe, expect, it } from "vitest";
import { compareVietnamese, firstLetter, sortByVietnamese } from "./collation";

const sorted = (words: string[]) => [...words].sort(compareVietnamese);

describe("compareVietnamese", () => {
  it("orders tones ngang < huyền < hỏi < ngã < sắc < nặng", () => {
    expect(sorted(["bạ", "bá", "bã", "bả", "bà", "ba"])).toEqual(["ba", "bà", "bả", "bã", "bá", "bạ"]);
  });

  it("follows the Vietnamese alphabet: a < ă < â, d < đ, e < ê, o < ô < ơ, u < ư", () => {
    expect(sorted(["âm", "ăn", "an"])).toEqual(["an", "ăn", "âm"]);
    expect(sorted(["đi", "dì", "e"])).toEqual(["dì", "đi", "e"]);
    expect(sorted(["ơn", "ôm", "on"])).toEqual(["on", "ôm", "ơn"]);
    expect(sorted(["ưa", "uống"])).toEqual(["uống", "ưa"]);
  });

  it("puts letters before tones: different letters outrank a tone difference", () => {
    // "bác" (b-a-c, sắc) comes before "bài" (b-a-i, huyền) because c < i.
    expect(sorted(["bài", "bác"])).toEqual(["bác", "bài"]);
  });

  it("groups multi-syllable words under their first syllable, dictionary-style", () => {
    expect(sorted(["bà con", "bác", "ba ba", "bà", "ba", "bác sĩ"])).toEqual([
      "ba",
      "ba ba",
      "bà",
      "bà con",
      "bác",
      "bác sĩ",
    ]);
  });

  it("is case-insensitive", () => {
    expect(sorted(["Việt Nam", "việc", "viết"])).toEqual(["việc", "viết", "Việt Nam"]);
  });

  it("handles decomposed Unicode the same as precomposed", () => {
    expect(compareVietnamese("chào", "chào")).toBe(0);
  });
});

describe("sortByVietnamese", () => {
  it("sorts objects by a headword accessor", () => {
    const items = [{ w: "mà" }, { w: "ma" }, { w: "má" }];
    expect(sortByVietnamese(items, (i) => i.w).map((i) => i.w)).toEqual(["ma", "mà", "má"]);
  });
});

describe("firstLetter", () => {
  it("files words under their tone-less first letter", () => {
    expect(firstLetter("ắt")).toBe("ă");
    expect(firstLetter("Đà Nẵng")).toBe("đ");
    expect(firstLetter("ưu tiên")).toBe("ư");
    expect(firstLetter("à")).toBe("a");
  });

  it("uses # for non-Vietnamese initial letters", () => {
    expect(firstLetter("wifi")).toBe("#");
    expect(firstLetter("3D")).toBe("#");
  });
});
