import { describe, expect, it } from "vitest";
import { loginPathFor, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each([
    ["/vocab-srs", "/vocab-srs"],
    ["/dictionary?word=%C4%91%C3%A3", "/dictionary?word=%C4%91%C3%A3"],
    ["/community/post/abc#answer-2", "/community/post/abc#answer-2"],
    ["/settings", "/settings"],
  ])("keeps the same-site path %s", (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "vocab-srs",
    "/login",
    "/login?next=/home",
    "/auth/action?mode=resetPassword",
    "/home\nSet-Cookie: x",
    `/${"a".repeat(2001)}`,
  ])("falls back to /home for %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/home");
  });

  it("uses a custom fallback", () => {
    expect(safeNextPath("//evil.example", "/somewhere")).toBe("/somewhere");
  });
});

describe("loginPathFor", () => {
  it("adds ?next= for pages other than Home", () => {
    expect(loginPathFor("/dictionary?word=ăn")).toBe(`/login?next=${encodeURIComponent("/dictionary?word=%C4%83n")}`);
    expect(loginPathFor("/vocab-srs")).toBe("/login?next=%2Fvocab-srs");
  });

  it("leaves it off for Home and unsafe paths", () => {
    expect(loginPathFor("/home")).toBe("/login");
    expect(loginPathFor("//evil.example")).toBe("/login");
    expect(loginPathFor(null)).toBe("/login");
  });
});
