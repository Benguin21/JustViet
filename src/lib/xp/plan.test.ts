import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_SETTINGS, goalTier, type GoalSettings } from "@/lib/companion/goals";
import { dayKeyIn } from "./day";
import { FLASHCARD_XP_CAP } from "./events";
import {
  blankDay,
  blankTotal,
  claimsOf,
  effectiveTargets,
  normalizeDay,
  planClaim,
  planGrammarLesson,
  planSkill,
  planVocabCard,
  type Ctx,
  type Plan,
} from "./plan";

const DAY = "2026-11-8";
const settings = (targets: Partial<GoalSettings["targets"]> = {}): GoalSettings => ({
  enabled: { vocab: true, grammar: true, skills: true },
  targets: { ...DEFAULT_GOAL_SETTINGS.targets, ...targets },
});
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ uid: "u", total: blankTotal(), day: blankDay(DAY), settings: settings(), ...over });
/** Applies a plan as the repository would, for the next step. */
const after = (c: Ctx, p: Plan | null): Ctx => (p ? { ...c, total: p.total, day: p.day } : c);

describe("goal tiers", () => {
  it("come from the selected target, at the brief's boundaries", () => {
    const g = [1, 2, 3, 4, 5].map((t) => goalTier("grammar", t));
    expect(g.map((x) => x.name)).toEqual(["Small", "Medium", "Big", "Big", "Big"]);
    expect(g.map((x) => x.bonus)).toEqual([10, 20, 30, 30, 30]);
    expect([1, 2, 3, 5].map((t) => goalTier("skills", t).bonus)).toEqual([10, 20, 30, 30]);
    const v = [1, 4, 5, 9, 10, 14, 15, 50].map((t) => goalTier("vocab", t));
    expect(v.map((x) => x.name)).toEqual(["Starter", "Starter", "Small", "Small", "Medium", "Medium", "Big", "Big"]);
    expect(v.map((x) => x.bonus)).toEqual([0, 0, 10, 10, 20, 20, 30, 30]);
  });
});

describe("activity XP", () => {
  it("pays 1 XP a Vocab card, once per card per day, and locks the day's Vocab target", () => {
    const c = ctx({ settings: settings({ vocab: 12 }) });
    const p = planVocabCard(c, { id: "log1", cardId: "c1" }, false)!;
    expect(p.event).toMatchObject({ id: "vocab_2026-11-8_c1", kind: "vocab.card", amount: 1, source: "log1", card: "c1" });
    expect(p.total).toEqual({ total: 1, rev: 1, last: "vocab_2026-11-8_c1" });
    expect(p.day.flash).toBe(1);
    expect(p.day.targets.vocab).toBe(12);
    expect(planVocabCard(after(c, p), { id: "log2", cardId: "c1" }, true)).toBeNull();
  });

  it("stops at 100 flashcards a day", () => {
    let c = ctx();
    for (let i = 0; i < 105; i++) c = after(c, planVocabCard(c, { id: "l" + i, cardId: "c" + i }, false));
    expect(c.total.total).toBe(FLASHCARD_XP_CAP);
    expect(c.day.flash).toBe(100);
    // Other XP still counts once the cap is reached.
    c = after(c, planSkill(c, "skills.reading", "r1", false));
    expect(c.total.total).toBe(130);
  });

  it("tells a new Grammar lesson (50) from a review on a later day (10); reopening it the same day pays nothing", () => {
    const c = ctx();
    const fresh = planGrammarLesson(c, "L1", null, false)!;
    expect(fresh.event).toMatchObject({ id: "grammar-new_L1", kind: "grammar.new", amount: 50 });
    expect(fresh.day.done.grammar).toBe(1);
    expect(planGrammarLesson(after(c, fresh), "L1", DAY, false)).toBeNull();
    const review = planGrammarLesson(c, "L1", "2026-11-1", false)!;
    expect(review.event).toMatchObject({ id: "grammar-review_2026-11-8_L1", kind: "grammar.review", amount: 10 });
    expect(planGrammarLesson(c, "L1", "2026-11-1", true)).toBeNull();
  });

  it("pays Reading and Listening 30 each, once per activity a day, both counting toward Skills", () => {
    let c = ctx();
    c = after(c, planSkill(c, "skills.reading", "a", false));
    c = after(c, planSkill(c, "skills.listening", "a", false));
    expect(planSkill(c, "skills.reading", "a", true)).toBeNull();
    expect(c.total.total).toBe(60);
    expect(c.day.done.skills).toBe(2);
  });
});

describe("goal claims", () => {
  it("pays the tier bonus once, takes back only the bonus when unticked, and restores it once when reticked", () => {
    let c = ctx({ settings: settings({ grammar: 2 }) });
    c = after(c, planGrammarLesson(c, "L1", null, false));
    c = after(c, planGrammarLesson(c, "L2", null, false));
    expect(c.total.total).toBe(100);
    const claim = planClaim(c, "grammar", true, true)!;
    expect(claim.event).toMatchObject({ id: "goal_2026-11-8_grammar_1", kind: "goal.claim", amount: 20, seq: 1 });
    c = after(c, claim);
    expect(c.total.total).toBe(120);
    expect(planClaim(c, "grammar", true, true)).toBeNull();
    const un = planClaim(c, "grammar", false, true)!;
    expect(un.event).toMatchObject({ kind: "goal.unclaim", amount: -20, seq: 2, reverses: "goal_2026-11-8_grammar_1" });
    c = after(c, un);
    expect(c.total.total).toBe(100);
    expect(planClaim(c, "grammar", false, true)).toBeNull();
    c = after(c, planClaim(c, "grammar", true, true));
    expect(c.total.total).toBe(120);
    expect(claimsOf(c.day).grammar).toBe(true);
  });

  it("keeps today's bonus at the target locked when the goal became active, whatever Goals says now", () => {
    let c = ctx({ settings: settings({ vocab: 5 }) });
    c = after(c, planVocabCard(c, { id: "l", cardId: "c" }, false));
    c = { ...c, settings: settings({ vocab: 20 }) };
    expect(effectiveTargets(c.settings, c.day).vocab).toBe(5);
    const claim = planClaim(c, "vocab", true, true)!;
    expect(claim.event.amount).toBe(10);
    // Flipping it back and forth never stacks bonuses.
    c = after(c, claim);
    for (let i = 0; i < 5; i++) {
      c = after(c, planClaim(c, "vocab", false, true));
      c = after(c, planClaim(c, "vocab", true, true));
    }
    expect(c.total.total).toBe(11);
  });

  it("a target saved before the goal is active today applies today", () => {
    const c = ctx({ settings: settings({ vocab: 15 }) });
    expect(effectiveTargets(c.settings, c.day).vocab).toBe(15);
    expect(planClaim(c, "vocab", true, true)!.event.amount).toBe(30);
  });

  it("refuses to claim a goal that isn't ready", () => {
    const c = ctx({ settings: settings({ skills: 2 }) });
    expect(planClaim(c, "vocab", true, false)).toBeNull();
    expect(planClaim(after(c, planSkill(c, "skills.reading", "a", false)), "skills", true, true)).toBeNull();
  });

  it("a Starter Vocab target feeds Rồng Con for no bonus", () => {
    const p = planClaim(ctx({ settings: settings({ vocab: 3 }) }), "vocab", true, true)!;
    expect(p.event.amount).toBe(0);
    expect(claimsOf(p.day).vocab).toBe(true);
  });
});

describe("stored records", () => {
  it("normalizes a day read back from storage", () => {
    const d = normalizeDay({ targets: { vocab: 80, grammar: "x" }, seq: { vocab: 3 }, flash: 500, items: { vocab: "pho", grammar: "nope" } }, DAY);
    expect(d.targets).toEqual({ vocab: 50 });
    expect(claimsOf(d)).toEqual({ vocab: true, grammar: false, skills: false });
    expect(d.flash).toBe(100);
    expect(d.items).toEqual({ vocab: "pho" });
  });

  it("counts days in the learner's established time zone", () => {
    const ms = Date.UTC(2026, 10, 8, 6, 30); // 06:30 UTC on 8 Nov
    expect(dayKeyIn(ms, "UTC")).toBe("2026-11-8");
    expect(dayKeyIn(ms, "America/Los_Angeles")).toBe("2026-11-7");
    expect(dayKeyIn(ms, "Asia/Ho_Chi_Minh")).toBe("2026-11-8");
  });
});
