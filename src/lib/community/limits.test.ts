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

describe("daily caps and links", () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 18, 12);
  const joinedLongAgo = now - 30 * DAY;
  const joinedToday = now - 60_000;

  it("treats a member as new for their first 3 days", () => {
    expect(limits.isNewMember(joinedToday, now)).toBe(true);
    expect(limits.isNewMember(now - 3 * DAY + 1000, now)).toBe(true);
    expect(limits.isNewMember(now - 3 * DAY, now)).toBe(false);
  });

  it("counts per UTC day and resets on a new day", () => {
    const today = limits.utcDay(now);
    expect(limits.countAction("post", { countDay: today, dayPosts: 2, dayResponses: 5, dayVotes: 7 }, now)).toEqual({
      countDay: today, dayPosts: 3, dayResponses: 5, dayVotes: 7,
    });
    expect(limits.countAction("vote", { countDay: today - 1, dayPosts: 9, dayResponses: 9, dayVotes: 299 }, now)).toEqual({
      countDay: today, dayPosts: 0, dayResponses: 0, dayVotes: 1,
    });
  });

  it("has lower caps for new members", () => {
    const today = limits.utcDay(now);
    expect(limits.dailyLeft("post", { countDay: today, dayPosts: 3 }, joinedToday, now)).toBe(0);
    expect(limits.dailyLeft("post", { countDay: today, dayPosts: 3 }, joinedLongAgo, now)).toBe(7);
    expect(limits.dailyLeft("vote", {}, joinedLongAgo, now)).toBe(300);
    expect(limits.dailyLimitMessage("post", true)).toMatch(/3 posts for new members/);
  });

  it("counts links like the rules do, and allows none for new members", () => {
    expect(limits.countLinks("see https://a.com and HTTP://b.org and [x](https://c.net)")).toBe(3);
    expect(limits.countLinks("no links, just www.example.com")).toBe(0);
    expect(limits.linkProblem("https://a.com", joinedToday, now)).toMatch(/New members/);
    expect(limits.linkProblem("https://a.com", joinedLongAgo, now)).toBeNull();
    expect(limits.linkProblem("https://a.com https://b.com https://c.com https://d.com", joinedLongAgo, now)).toMatch(/at most 3/);
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
    "POSTS_PER_DAY",
    "RESPONSES_PER_DAY",
    "VOTES_PER_DAY",
    "NEW_MEMBER_DAYS",
    "NEW_POSTS_PER_DAY",
    "NEW_RESPONSES_PER_DAY",
    "NEW_VOTES_PER_DAY",
    "MAX_LINKS",
  ] as const)("%s", (name) => {
    expect(Number(constant(name))).toBe(limits[name]);
  });

  it("has the same categories, avatar colours and report reasons", () => {
    expect(list("CATEGORIES")).toEqual([...CATEGORY_IDS].sort());
    expect(list("COLORS")).toEqual([...AVATAR_COLOR_IDS].sort());
    expect(list("REASONS")).toEqual(REPORT_REASONS.map((r) => r.id).sort());
  });
});
