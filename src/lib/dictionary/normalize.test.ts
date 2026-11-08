import { describe, expect, it } from "vitest";
import {
  cleanHeadword,
  decomposeSyllable,
  foldDiacritics,
  headwordKey,
  splitSyllables,
} from "./normalize";

describe("headwordKey", () => {
  it("treats different capitalization as the same headword", () => {
    expect(headwordKey("Xin Chào")).toBe(headwordKey("xin chào"));
  });

  it("treats precomposed and decomposed Unicode as the same headword", () => {
    const precomposed = "xin chào"; // à as one code point
    const decomposed = "xin chào"; // a + combining grave
    expect(precomposed).not.toBe(decomposed);
    expect(headwordKey(precomposed)).toBe(headwordKey(decomposed));
  });

  it("trims and collapses repeated/odd whitespace", () => {
    expect(headwordKey("  xin   chào \t")).toBe("xin chào");
    expect(headwordKey("xin chào")).toBe("xin chào"); // non-breaking space
    expect(headwordKey("xin​ chào")).toBe("xin chào"); // zero-width space
  });

  it("keeps words that differ only in tone marks distinct", () => {
    const keys = ["ma", "má", "mà", "mả", "mã", "mạ"].map(headwordKey);
    expect(new Set(keys).size).toBe(6);
  });

  it("keeps other diacritics distinct too (a/ă/â, d/đ, o/ơ)", () => {
    expect(headwordKey("an")).not.toBe(headwordKey("ăn"));
    expect(headwordKey("an")).not.toBe(headwordKey("ân"));
    expect(headwordKey("di")).not.toBe(headwordKey("đi"));
    expect(headwordKey("on")).not.toBe(headwordKey("ơn"));
  });

  it("lowercases Vietnamese capitals with diacritics", () => {
    expect(headwordKey("ĐƯỜNG")).toBe("đường");
    expect(headwordKey("Việt Nam")).toBe("việt nam");
  });
});

describe("cleanHeadword", () => {
  it("keeps the original capitalization for display", () => {
    expect(cleanHeadword("  Việt   Nam ")).toBe("Việt Nam");
  });
});

describe("foldDiacritics", () => {
  it("strips tones and letter marks, and maps đ to d", () => {
    expect(foldDiacritics("Đường phố")).toBe("duong pho");
    expect(foldDiacritics("mà")).toBe(foldDiacritics("má"));
  });
});

describe("splitSyllables / decomposeSyllable", () => {
  it("splits on whitespace", () => {
    expect(splitSyllables(" học  đại học ")).toEqual(["học", "đại", "học"]);
  });

  it("separates the tone from the letters", () => {
    expect(decomposeSyllable("ộ")).toEqual({ letters: "ô", tone: "nang" });
    expect(decomposeSyllable("ắt")).toEqual({ letters: "ăt", tone: "sac" });
    expect(decomposeSyllable("đường")).toEqual({ letters: "đương", tone: "huyen" });
    expect(decomposeSyllable("ba")).toEqual({ letters: "ba", tone: "ngang" });
  });
});
