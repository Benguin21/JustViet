import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as limits from "./limits";
import { AVATAR_COLOR_IDS } from "./avatar";
import { CATEGORY_IDS, REPORT_REASONS } from "./types";

describe("rate-limit helpers", () => {
  it("counts whole seconds left", () => {
    expect(limits.waitSeconds(null, 1000, 60)).toBe(0);
    expect(limits.waitSeconds(0, 1000, 60)).toBe(59);
    expect(limits.waitSeconds(0, 59_001, 60)).toBe(1);
    expect(limits.waitSeconds(0, 60_000, 60)).toBe(0);
  });

  it("counts reports per UTC day", () => {
    const now = Date.UTC(2026, 10, 17, 23, 59);
    const today = limits.utcDay(now);
    expect(limits.reportsLeft(today, 5, now)).toBe(15);
    expect(limits.reportsLeft(today - 1, 20, now)).toBe(20);
    expect(limits.reportsLeft(today, 25, now)).toBe(0);
  });

  it("says please wait", () => {
    expect(limits.pleaseWait(1)).toBe("Please wait 1 second.");
    expect(limits.pleaseWait(12)).toBe("Please wait 12 seconds.");
  });
});

describe("firestore.rules mirrors limits.ts", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const constant = (name: string) => {
    const m = new RegExp(`function ${name}\\(\\) \\{ return ([^;]+); \\}`).exec(rules);
    if (!m) throw new Error(`firestore.rules has no function ${name}()`);
    return m[1].trim();
  };
  const list = (name: string) => [...constant(name).matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

  it.each([
    "TITLE_MIN",
    "TITLE_MAX",
    "BODY_MIN",
    "BODY_MAX",
    "RESPONSE_MAX",
    "REPLY_MAX",
    "REPORT_NOTE_MAX",
    "POST_INTERVAL_S",
    "RESPONSE_INTERVAL_S",
    "VOTE_INTERVAL_S",
    "REPORTS_PER_DAY",
    "RENAME_DAYS",
    "MAX_TOKENS",
  ] as const)("%s", (name) => {
    expect(Number(constant(name))).toBe(limits[name]);
  });

  it("has the same categories, avatar colours and report reasons", () => {
    expect(list("CATEGORIES")).toEqual([...CATEGORY_IDS].sort());
    expect(list("COLORS")).toEqual([...AVATAR_COLOR_IDS].sort());
    expect(list("REASONS")).toEqual(REPORT_REASONS.map((r) => r.id).sort());
  });
});
