import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_SETTINGS, TARGET_LIMITS, goalTier, type GoalSettings } from "./goals";
import {
  BLOCK_EMPTY,
  blockTextColor,
  GOALS_TAB_ORDER,
  OFF_TEXT,
  TARGET_CHOICES,
  choiceLabel,
  describeSave,
  formFromSaved,
  lockNote,
  luminance,
  offLabel,
  rampColor,
  snapNote,
  snapTarget,
  targetText,
  tierText,
} from "./goalSelectors";

const settings = (over: Partial<GoalSettings["targets"]> = {}, on: Partial<GoalSettings["enabled"]> = {}): GoalSettings => ({
  enabled: { ...DEFAULT_GOAL_SETTINGS.enabled, ...on },
  targets: { ...DEFAULT_GOAL_SETTINGS.targets, ...over },
});

describe("Goals tab selectors", () => {
  it("lists Grammar, Vocab, Skills, each with five choices", () => {
    expect(GOALS_TAB_ORDER).toEqual(["grammar", "vocab", "skills"]);
    expect(TARGET_CHOICES).toEqual({ grammar: [1, 2, 3, 4, 5], vocab: [5, 10, 15, 20, 25], skills: [1, 2, 3, 4, 5] });
  });

  it("leaves the stored ranges wide, so targets locked under the old slider still read back", () => {
    expect(TARGET_LIMITS.vocab).toMatchObject({ min: 1, max: 50 });
    expect(TARGET_LIMITS.grammar).toMatchObject({ min: 1, max: 5 });
    expect(TARGET_LIMITS.skills).toMatchObject({ min: 1, max: 5 });
  });

  it("labels each choice's tier with its bonus", () => {
    const label = (id: "grammar" | "vocab" | "skills", n: number) => tierText(goalTier(id, n));
    expect(TARGET_CHOICES.vocab.map((n) => label("vocab", n))).toEqual([
      "Small goal · +10 XP",
      "Medium goal · +20 XP",
      "Big goal · +30 XP",
      "Big goal · +30 XP",
      "Big goal · +30 XP",
    ]);
    for (const id of ["grammar", "skills"] as const) {
      expect(TARGET_CHOICES[id].map((n) => label(id, n))).toEqual([
        "Small goal · +10 XP",
        "Medium goal · +20 XP",
        "Big goal · +30 XP",
        "Big goal · +30 XP",
        "Big goal · +30 XP",
      ]);
    }
    // An old Vocab target locked for today still has its own tier.
    expect(label("vocab", 3)).toBe("Starter goal · +0 XP");
    expect(OFF_TEXT).toBe("Goal off · 0 XP");
  });

  it("says each choice in words", () => {
    expect(targetText("grammar", 2)).toBe("2 lessons per day");
    expect(targetText("grammar", 1)).toBe("1 lesson per day");
    expect(targetText("vocab", 15)).toBe("15 new flashcards per day");
    expect(targetText("skills", 3)).toBe("3 activities per day");
    expect(choiceLabel("vocab", 15)).toBe("15 new flashcards per day, Big goal, 30 bonus XP");
    expect(offLabel("vocab")).toBe("0 new flashcards per day, goal off");
  });

  it("darkens each block toward the harder end, from a pale empty block", () => {
    for (const id of GOALS_TAB_ORDER) {
      const shades = TARGET_CHOICES[id].map((n) => luminance(rampColor(id, n)));
      for (let i = 1; i < shades.length; i++) expect(shades[i], `${id} block ${i + 1}`).toBeLessThan(shades[i - 1]);
    }
    expect(luminance(BLOCK_EMPTY)).toBeGreaterThan(0.75);
  });

  it("writes each block's number in a colour that stands out from its fill", () => {
    const contrast = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    for (const id of GOALS_TAB_ORDER) {
      for (const n of TARGET_CHOICES[id]) {
        const fill = rampColor(id, n);
        // 19px bold numbers are large text by WCAG, which needs 3:1.
        expect(contrast(fill, blockTextColor(fill)), `${id} ${n}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("old saved targets", () => {
  it("snaps a Vocab target to the nearest choice", () => {
    const cases: [number, number][] = [
      [1, 5],
      [4, 5],
      [7, 5],
      [8, 10],
      [12, 10],
      [13, 15],
      [17, 15],
      [18, 20],
      [22, 20],
      [23, 25],
      [30, 25],
      [50, 25],
    ];
    for (const [saved, shown] of cases) expect(snapTarget("vocab", saved), `${saved}`).toBe(shown);
    for (const n of [1, 2, 3, 4, 5]) expect(snapTarget("grammar", n)).toBe(n);
  });

  it("starts the form from the saved goals, snapping only goals that are on", () => {
    const saved = settings({ vocab: 7, grammar: 3, skills: 2 }, { vocab: true, grammar: true, skills: false });
    expect(formFromSaved(saved)).toEqual({
      enabled: { vocab: true, grammar: true, skills: false },
      targets: { vocab: 5, grammar: 3, skills: 2 },
    });
    // Off keeps its last target exactly, even one the selector doesn't offer.
    expect(formFromSaved(settings({ vocab: 7 }, { vocab: false })).targets.vocab).toBe(7);
  });

  it("explains a snapped target on its card until another is picked", () => {
    const saved = settings({ vocab: 7 }, { vocab: true });
    const form = formFromSaved(saved);
    expect(snapNote("vocab", saved, form)).toBe(
      "Your saved goal is 7 new flashcards a day, which isn’t one of the choices any more. Save goals to switch to 5 new flashcards.",
    );
    expect(snapNote("vocab", saved, { ...form, targets: { ...form.targets, vocab: 20 } })).toBeNull();
    expect(snapNote("vocab", saved, { ...form, enabled: { ...form.enabled, vocab: false } })).toBeNull();
    expect(snapNote("vocab", settings({ vocab: 10 }, { vocab: true }), formFromSaved(settings({ vocab: 10 })))).toBeNull();
  });
});

describe("telling the learner what a save changed", () => {
  it("starts a target today when that goal isn't underway", () => {
    expect(describeSave(settings({}, { grammar: true }), settings({ grammar: 2 }, { grammar: true }), {})).toEqual([
      "Grammar: 2 lessons per day, starting today.",
    ]);
  });

  it("starts it tomorrow when today's goal is already underway", () => {
    expect(describeSave(settings(), settings({ vocab: 15 }), { vocab: 5 })).toEqual([
      "Vocab: 15 new flashcards per day from tomorrow. Today’s goal is already underway, so it stays at 5 (Small goal · +10 XP).",
    ]);
    // Setting it back to today's target is simply today's target again.
    expect(describeSave(settings({ vocab: 15 }), settings({ vocab: 5 }), { vocab: 5 })).toEqual([
      "Vocab: 5 new flashcards per day, starting today.",
    ]);
  });

  it("says when a goal is turned on or off", () => {
    expect(describeSave(settings(), settings({}, { skills: true, vocab: false }), {})).toEqual([
      "Vocab is off, so Home won’t show it.",
      "Skills is on, so it shows on Home.",
    ]);
    // Turning a goal on at a new target says both.
    expect(describeSave(settings(), settings({ grammar: 3 }, { grammar: true }), {})).toEqual([
      "Grammar is on, so it shows on Home.",
      "Grammar: 3 lessons per day, starting today.",
    ]);
  });

  it("notes a locked goal on its card while the chosen target differs, and never while it's off", () => {
    expect(lockNote("grammar", true, 3, 1)).toBe(
      "Today’s goal is already underway, so today stays at 1 lesson (Small goal · +10 XP). This target starts tomorrow.",
    );
    expect(lockNote("grammar", true, 1, 1)).toBeNull();
    expect(lockNote("grammar", true, 3, undefined)).toBeNull();
    expect(lockNote("grammar", false, 3, 1)).toBeNull();
  });

  it("shows a target locked under the old slider exactly", () => {
    expect(lockNote("vocab", true, 5, 3)).toBe(
      "Today’s goal is already underway, so today stays at 3 new flashcards (Starter goal · +0 XP). This target starts tomorrow.",
    );
    expect(lockNote("vocab", true, 25, 30)).toBe(
      "Today’s goal is already underway, so today stays at 30 new flashcards (Big goal · +30 XP). This target starts tomorrow.",
    );
  });
});
