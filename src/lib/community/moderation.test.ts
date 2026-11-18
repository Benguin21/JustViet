import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MOD_ACTIONS,
  MOD_REASON_MAX,
  PLACEHOLDER_NAME_PATTERN,
  groupReports,
  isSuspended,
  parseRemovedKey,
  placeholderName,
  removedKey,
  suspensionEnd,
  type ReportRecord,
} from "./moderation";
import { nameKey, nameProblem } from "./names";
import { MOD_NOTIFICATION_TYPES } from "./notifications";

const DAY = 86_400_000;

describe("suspensions", () => {
  it("end after the chosen number of days and are over once passed", () => {
    const now = Date.UTC(2026, 10, 18);
    const until = suspensionEnd(now, 7);
    expect(until - now).toBe(7 * DAY);
    expect(isSuspended(until, now)).toBe(true);
    expect(isSuspended(until, until)).toBe(false);
    expect(isSuspended(null, now)).toBe(false);
  });
});

describe("placeholder names", () => {
  it("are Member and six digits, valid names whose key is their lowercase", () => {
    expect(placeholderName(() => 0.0042)).toBe("Member 004200");
    const n = placeholderName();
    expect(n).toMatch(PLACEHOLDER_NAME_PATTERN);
    expect(nameProblem(n)).toBeNull();
    expect(nameKey(n)).toBe(n.toLowerCase());
  });
});

describe("removed keys", () => {
  it("round-trip for posts and responses", () => {
    expect(removedKey("P1", null)).toBe("p_P1");
    expect(removedKey("P1", "R1")).toBe("r_P1_R1");
    expect(parseRemovedKey("p_P1")).toEqual({ post: "P1", response: null });
    expect(parseRemovedKey("r_P1_R1")).toEqual({ post: "P1", response: "R1" });
    expect(parseRemovedKey("x_1")).toBeNull();
  });
});

const report = (id: string, extra: Partial<ReportRecord>): ReportRecord => ({
  id, kind: "post", post: "P1", response: null, profile: null, reason: "spam", note: "", at: 0, ...extra,
});

describe("groupReports", () => {
  it("groups by target, counts reasons, keeps notes, most-reported first", () => {
    const groups = groupReports([
      report("a", { at: 5, reason: "spam", note: "selling things" }),
      report("b", { at: 1, kind: "profile", post: null, profile: "U1", reason: "harassment" }),
      report("c", { at: 3, reason: "off-topic" }),
      report("d", { at: 4, kind: "reply", response: "R9", reason: "spam" }),
      report("e", { at: 2, reason: "spam", note: "  " }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["post:P1", "profile:U1", "response:P1/R9"]);
    expect(groups[0]).toMatchObject({ reasons: { spam: 2, "off-topic": 1 }, notes: ["selling things"], firstAt: 2 });
    expect(groups[0].reports.map((r) => r.id)).toEqual(["e", "c", "a"]);
  });
});

describe("firestore.rules mirrors moderation", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const list = (name: string) => {
    const m = new RegExp(`function ${name}\\(\\) \\{ return ([^;]+); \\}`).exec(rules);
    if (!m) throw new Error(`firestore.rules has no function ${name}()`);
    return m[1];
  };
  it("has the same reason limit, actions and moderation notification types", () => {
    expect(Number(list("MOD_REASON_MAX"))).toBe(MOD_REASON_MAX);
    const ids = (s: string) => [...s.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(ids(list("MOD_ACTIONS"))).toEqual([...MOD_ACTIONS].sort());
    expect(ids(list("MOD_NOTIFICATIONS"))).toEqual([...MOD_NOTIFICATION_TYPES].sort());
  });
});
