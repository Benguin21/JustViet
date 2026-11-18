import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RESERVED_ANYWHERE,
  RESERVED_EXACT,
  RESERVED_WORDS,
  VIET_LETTERS,
  cleanName,
  isReservedKey,
  nameKey,
  nameProblem,
  renameStatus,
  suggestName,
} from "./names";

const DAY = 86_400_000;

describe("nameKey", () => {
  it("ignores case and accents, so look-alike names collide", () => {
    expect(nameKey("Bảo Ngọc")).toBe("bao ngoc");
    expect(nameKey("bao ngoc")).toBe(nameKey("BẢO NGỌC"));
    expect(nameKey("Đức")).toBe("duc");
    expect(nameKey("Thầy Vinh")).toBe("thay vinh");
  });

  it("treats precomposed and decomposed accents the same", () => {
    expect(nameKey("Hà")).toBe(nameKey("Hà"));
  });

  it("cleans spaces first", () => {
    expect(nameKey("  Lan   Anh ")).toBe("lan anh");
    expect(cleanName(" Lan  Anh ")).toBe("Lan Anh");
  });
});

describe("nameProblem", () => {
  it("accepts letters (with Vietnamese accents), digits, spaces and . _ -", () => {
    for (const ok of ["Lan", "Bảo Ngọc", "nguyen_van.a-1", "Ước Mơ 2026", "Ánh"]) expect(nameProblem(ok)).toBeNull();
  });

  it("enforces 3–30 characters", () => {
    expect(nameProblem("ab")).toMatch(/at least 3/);
    expect(nameProblem("a".repeat(30))).toBeNull();
    expect(nameProblem("a".repeat(31))).toMatch(/at most 30/);
  });

  it("refuses other symbols and letters from other alphabets", () => {
    expect(nameProblem("hi!there")).toMatch(/letters, numbers/);
    expect(nameProblem("Аnna")).toMatch(/letters, numbers/); // Cyrillic А
    expect(nameProblem("名前です")).toMatch(/letters, numbers/);
    expect(nameProblem("me@mail.com")).toMatch(/letters, numbers/);
  });

  it("needs a letter or digit at both ends", () => {
    expect(nameProblem(".lan")).toMatch(/Start and end/);
    expect(nameProblem("lan-")).toMatch(/Start and end/);
    expect(nameProblem("___")).toMatch(/Start and end/);
  });

  it("blocks reserved names, including accented and spaced-out versions", () => {
    for (const bad of ["admin", "Admin123", "the moderator", "mod", "Lan mod", "staff", "JustViet", "just viet", "Just.Viet fan", "Cô Tươi", "co tuoi", "Thầy Vinh", "thayvinh2", "Rồng Con", "support", "Official"]) {
      expect(nameProblem(bad), bad).toMatch(/reserved/);
    }
  });

  it("doesn't block names that only contain a reserved word inside another word", () => {
    for (const ok of ["Modern Lan", "Teamwork", "Marco Tuoi", "Systematic", "Mode"]) expect(nameProblem(ok), ok).toBeNull();
  });
});

describe("isReservedKey", () => {
  it("works on keys", () => {
    expect(isReservedKey("co tuoi")).toBe(true);
    expect(isReservedKey("lan anh")).toBe(false);
  });
});

describe("suggestName", () => {
  it("pre-fills from the account name, never from an email", () => {
    expect(suggestName("Bảo Ngọc")).toBe("Bảo Ngọc");
    expect(suggestName("someone@example.com")).toBe("");
    expect(suggestName(null)).toBe("");
  });

  it("drops characters that aren't allowed and fixes the ends", () => {
    expect(suggestName("Lan (Anh)!")).toBe("Lan Anh");
    expect(suggestName("-- Minh --")).toBe("Minh");
    expect(suggestName("Jo")).toBe("");
    expect(suggestName("Admin")).toBe("");
  });
});

describe("renameStatus", () => {
  it("allows the first change any time, then once every 30 days", () => {
    const now = Date.UTC(2026, 10, 17);
    expect(renameStatus(null, now)).toEqual({ allowed: true, nextAt: null });
    expect(renameStatus(now - 29 * DAY, now)).toEqual({ allowed: false, nextAt: now + DAY });
    expect(renameStatus(now - 30 * DAY, now).allowed).toBe(true);
  });
});

describe("firestore.rules mirrors the name rules", () => {
  const rules = readFileSync("firestore.rules", "utf8");

  it("uses the same reserved-name patterns", () => {
    expect(rules).toContain(RESERVED_ANYWHERE);
    expect(rules).toContain(RESERVED_EXACT);
    expect(rules).toContain(RESERVED_WORDS);
  });

  it("folds exactly the same accented letters", () => {
    const fn = /function nameKeyOf\(n\) \{([\s\S]*?)\}/.exec(rules)?.[1] ?? "";
    const pairs = [...fn.matchAll(/\.replace\('\[([^\]]+)\]', '([a-z])'\)/g)].map((m) => [m[2], m[1]] as const);
    expect(pairs.length).toBe(Object.keys(VIET_LETTERS).length);
    for (const [base, chars] of pairs) {
      expect([...chars].sort().join(""), base).toBe([...VIET_LETTERS[base]].sort().join(""));
    }
    // ...and the name pattern allows exactly those letters.
    const allowed = /function nameOk\(n\)[\s\S]*?matches\('\^\[A-Za-z0-9([^\]]+)\]/.exec(rules)?.[1] ?? "";
    expect([...allowed].sort().join("")).toBe([...Object.values(VIET_LETTERS).join("")].sort().join(""));
  });
});
