import { describe, expect, it } from "vitest";
import { MAX_PREFIX, MAX_TOKENS } from "./limits";
import { matchesQuery, parseQuery, rankRelated, rankSearchResults, relatedTokens, searchTokens } from "./search";

const post = (id: string, title: string, body = "", createdAt = 0) => ({ id, title, body, createdAt });

describe("searchTokens", () => {
  it("stores accent-folded prefixes of 2+ letters", () => {
    expect(searchTokens("Học sinh", "")).toEqual(["ho", "hoc", "si", "sin", "sinh"]);
  });

  it("puts the title first, dedupes, and caps the count", () => {
    const tokens = searchTokens("phở", "phở bò " + Array.from({ length: 700 }, (_, i) => String.fromCharCode(97 + (i % 26), 97 + (Math.floor(i / 26) % 26)) + "q").join(" "));
    expect(tokens.slice(0, 2)).toEqual(["ph", "pho"]);
    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens.length).toBe(MAX_TOKENS);
  });

  it("cuts long words at MAX_PREFIX letters and skips one-letter words", () => {
    const tokens = searchTokens("a supercalifragilistic", "");
    expect(tokens).not.toContain("a");
    expect(Math.max(...tokens.map((t) => t.length))).toBe(MAX_PREFIX);
  });
});

describe("parseQuery", () => {
  it("folds words, keeps the accented form for ranking, picks the longest as the token", () => {
    expect(parseQuery("Học  tiếng")).toEqual({ words: ["hoc", "tieng"], exact: ["học", "tiếng"], token: "tieng" });
  });

  it("ignores one-letter words and duplicates", () => {
    expect(parseQuery("a hoc HỌC")).toEqual({ words: ["hoc"], exact: ["hoc"], token: "hoc" });
    expect(parseQuery("  ").token).toBeNull();
  });
});

describe("matching", () => {
  it('finds "học" from "hoc", and word starts', () => {
    expect(matchesQuery(post("1", "Học sinh là gì?"), parseQuery("hoc"))).toBe(true);
    expect(matchesQuery(post("1", "Học sinh là gì?"), parseQuery("hoc si"))).toBe(true);
  });

  it("doesn't match inside a word, and needs every word", () => {
    expect(matchesQuery(post("1", "Học sinh"), parseQuery("oc"))).toBe(false);
    expect(matchesQuery(post("1", "Học sinh"), parseQuery("hoc pho"))).toBe(false);
  });

  it("ranks exact-accent matches first, then title matches, then newer", () => {
    const posts = [
      post("a", "Tôi muốn hóc", "", 3), // "hóc" folds to "hoc" but isn't "học"
      post("b", "About pronunciation", "học", 2),
      post("c", "Học tiếng Việt", "", 1),
      post("d", "Học mỗi ngày", "", 4),
    ];
    expect(rankSearchResults(posts, parseQuery("học")).map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("related posts", () => {
  it("uses the meaningful words of the title", () => {
    expect(relatedTokens("What is the difference between ăn and dùng?")).toEqual(["dung"]);
    expect(relatedTokens("Cách dùng từ 'được' trong câu")).toEqual(["cach", "dung", "cau"]);
  });

  it("ranks by shared title words and leaves out the draft itself", () => {
    const candidates = [post("x", "Dùng từ được"), post("y", "Cách dùng từ được", "", 1), post("z", "Unrelated"), post("me", "Cách dùng")];
    expect(rankRelated(candidates, "Cách dùng được", "me").map((p) => p.id)).toEqual(["y", "x"]);
  });
});
