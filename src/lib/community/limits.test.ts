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

  it("finds links and web addresses in any case", () => {
    const cases: [string, string][] = [
      ["see https://a.com/x now", "https://a.com/x"],
      ["HTTP://b.org", "HTTP://b.org"],
      ["Go to www.example.vn.", "www.example.vn"],
      ["Join t.me/spam today", "t.me/spam"],
      ["(bit.ly/abc)", "bit.ly/abc"],
      ["“learnjustviet.com”!", "learnjustviet.com"],
      ["Write to a@Gmail.COM", "a@Gmail.COM"],
      ["Dòng 1\nhttps://x.io", "https://x.io"],
    ];
    for (const [text, link] of cases) expect(limits.findLink(text), text).toBe(link);
    expect(limits.linkProblem("Go to www.example.vn.")).toBe("Links aren't allowed in the Community. Please remove “www.example.vn”.");
  });

  it("leaves ordinary dotted text alone", () => {
    for (const text of ["Xin chào, v.v. và e.g. i.e. 3.5 a.m.", "TP.HCM là thành phố lớn.", "example.company", "Node.js and console.log", "Hết.\nCảm ơn."]) {
      expect(limits.findLink(text), text).toBeNull();
    }
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
  ] as const)("%s", (name) => {
    expect(Number(constant(name))).toBe(limits[name]);
  });

  it("uses the same link pattern", () => {
    expect(constant("LINK_PATTERN")).toBe(`'${limits.LINK_PATTERN}'`);
  });

  it("has the same categories, avatar colours and report reasons", () => {
    expect(list("CATEGORIES")).toEqual([...CATEGORY_IDS].sort());
    expect(list("COLORS")).toEqual([...AVATAR_COLOR_IDS].sort());
    expect(list("REASONS")).toEqual(REPORT_REASONS.map((r) => r.id).sort());
  });
});
