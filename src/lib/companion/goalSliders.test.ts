import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_SETTINGS, TARGET_LIMITS, goalTier, type GoalSettings } from "./goals";
import {
  GOALS_TAB_ORDER,
  TRACK_EMPTY,
  describeSave,
  lockNote,
  luminance,
  rampColor,
  sliderFraction,
  sliderValueText,
  targetText,
  tierText,
  trackBackground,
} from "./goalSliders";

const settings = (over: Partial<GoalSettings["targets"]> = {}, on: Partial<GoalSettings["enabled"]> = {}): GoalSettings => ({
  enabled: { ...DEFAULT_GOAL_SETTINGS.enabled, ...on },
  targets: { ...DEFAULT_GOAL_SETTINGS.targets, ...over },
});

describe("Goals tab sliders", () => {
  it("lists Grammar, Vocab, Skills, with their ranges", () => {
    expect(GOALS_TAB_ORDER).toEqual(["grammar", "vocab", "skills"]);
    expect(TARGET_LIMITS.grammar).toMatchObject({ min: 1, max: 5 });
    expect(TARGET_LIMITS.vocab).toMatchObject({ min: 1, max: 50 });
    expect(TARGET_LIMITS.skills).toMatchObject({ min: 1, max: 5 });
  });

  it("labels each tier with its bonus, changing at the right boundaries", () => {
    const label = (id: "grammar" | "vocab" | "skills", n: number) => tierText(goalTier(id, n));
    expect([1, 4, 5, 9, 10, 14, 15, 50].map((n) => label("vocab", n))).toEqual([
      "Starter · +0 XP",
      "Starter · +0 XP",
      "Small · +10 XP",
      "Small · +10 XP",
      "Medium · +20 XP",
      "Medium · +20 XP",
      "Big · +30 XP",
      "Big · +30 XP",
    ]);
    for (const id of ["grammar", "skills"] as const) {
      expect([1, 2, 3, 4, 5].map((n) => label(id, n))).toEqual([
        "Small · +10 XP",
        "Medium · +20 XP",
        "Big · +30 XP",
        "Big · +30 XP",
        "Big · +30 XP",
      ]);
    }
  });

  it("says the target in words", () => {
    expect(targetText("grammar", 2)).toBe("2 lessons per day");
    expect(targetText("grammar", 1)).toBe("1 lesson per day");
    expect(targetText("vocab", 15)).toBe("15 new flashcards per day");
    expect(targetText("skills", 3)).toBe("3 activities per day");
    expect(sliderValueText("vocab", 4)).toBe("4 new flashcards per day, Starter goal, 0 bonus XP");
  });

  it("darkens the selected track with every step toward a harder goal", () => {
    for (const id of GOALS_TAB_ORDER) {
      const { min, max } = TARGET_LIMITS[id];
      for (let n = min + 1; n <= max; n++) {
        expect(luminance(rampColor(id, n)), `${id} ${n}`).toBeLessThan(luminance(rampColor(id, n - 1)));
      }
    }
    // Each tier is darker than the one before it.
    const tiers = [1, 5, 10, 15].map((n) => luminance(rampColor("vocab", n)));
    expect([...tiers].sort((a, b) => b - a)).toEqual(tiers);
  });

  it("keeps the unselected part of the track pale", () => {
    expect(luminance(TRACK_EMPTY)).toBeGreaterThan(0.75);
    const bg = trackBackground("vocab", 15);
    expect(bg).toContain(TRACK_EMPTY);
    expect(sliderFraction("vocab", 1)).toBe(0);
    expect(sliderFraction("vocab", 50)).toBe(1);
    expect(bg).toContain(`calc(14px + (100% - 28px) * ${+(14 / 49).toFixed(4)})`);
  });
});

describe("telling the learner what a save changed", () => {
  it("starts a target today when that goal isn't underway", () => {
    expect(describeSave(settings(), settings({ grammar: 2 }), {})).toEqual(["Grammar: 2 lessons per day, starting today."]);
  });

  it("starts it tomorrow when today's goal is already underway", () => {
    expect(describeSave(settings(), settings({ vocab: 15 }), { vocab: 5 })).toEqual([
      "Vocab: 15 new flashcards per day from tomorrow. Today’s goal is already underway, so it stays at 5 (Small · +10 XP).",
    ]);
    // Setting it back to today's target is simply today's target again.
    expect(describeSave(settings({ vocab: 15 }), settings({ vocab: 5 }), { vocab: 5 })).toEqual([
      "Vocab: 5 new flashcards per day, starting today.",
    ]);
  });

  it("says when a goal is switched on or off", () => {
    expect(describeSave(settings(), settings({}, { skills: true, vocab: false }), {})).toEqual([
      "Vocab is off, so Home won’t show it.",
      "Skills is on, so it shows on Home.",
    ]);
  });

  it("notes a locked goal on its card while the chosen target differs", () => {
    expect(lockNote("grammar", 3, 1)).toBe(
      "Today’s goal is already underway, so today stays at 1 lesson (Small · +10 XP). This target starts tomorrow.",
    );
    expect(lockNote("grammar", 1, 1)).toBeNull();
    expect(lockNote("grammar", 3, undefined)).toBeNull();
  });
});
