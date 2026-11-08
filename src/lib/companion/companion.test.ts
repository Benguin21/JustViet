import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL_SETTINGS,
  activeGoals,
  checkEligibility,
  normalizeGoalSettings,
  progressFromReviews,
  xpEntitlement,
} from "./goals";
import { blankLedger, claimCount, ledgerChanges, ledgerForDay, ledgerFromDay, localDayKey, settleLedger, totalXp } from "./ledger";
import { blankDay } from "@/lib/xp/plan";
import { ART_BOX, MENU_KINDS, MENU_LIBRARY, THOUGHT, assignMenu, dayNumber, menuForDay, pickDish, thoughtFit } from "./menu";
import { CRACKS, FLAKES } from "./crackTables";
import { EGG_SPAN, HATCH_XP, crackInk, crackProgress, eggUnits, evolutionFor, hatchFor, newCracks, shellBitsFor, stageFor } from "./growth";
import { EAT_LINES, LINES, MOODS, eatLine, moodFor } from "./lines";

const TARGETS = { vocab: 5, grammar: 1, skills: 1 };
const progress = (vocab = 0, grammar = 0, skills = 0) => ({ vocab, grammar, skills });
const claims = (vocab = false, grammar = false, skills = false) => ({ vocab, grammar, skills });

describe("today's progress", () => {
  it("counts each new card studied today once, however many times it was rated, and not reviews of older cards", () => {
    const logs = [
      { cardId: "a", priorState: "new" },
      { cardId: "b", priorState: "new" },
      { cardId: "a", priorState: "learning" },
      { cardId: "c", priorState: "review" },
      { cardId: "a", priorState: "learning" },
    ];
    expect(progressFromReviews(logs)).toEqual({ vocab: 2, grammar: 0, skills: 0 });
    expect(progressFromReviews([])).toEqual({ vocab: 0, grammar: 0, skills: 0 });
  });

  it("takes Grammar and Skills from the day's completions", () => {
    expect(progressFromReviews([], { grammar: 2, skills: 3 })).toEqual({ vocab: 0, grammar: 2, skills: 3 });
  });
});

describe("goal settings", () => {
  it("defaults to Vocab only, since Grammar and Skills have no pages yet", () => {
    expect(activeGoals(DEFAULT_GOAL_SETTINGS)).toEqual(["vocab"]);
  });

  it("fills in and clamps saved settings to the sliders' ranges", () => {
    const s = normalizeGoalSettings({ enabled: { grammar: true }, targets: { vocab: 500, grammar: 9, skills: "x" } });
    expect(s.enabled).toEqual({ vocab: true, grammar: true, skills: false });
    expect(s.targets).toEqual({ vocab: 50, grammar: 5, skills: 1 });
    expect(normalizeGoalSettings({ targets: { vocab: 0, grammar: 2.6 } }).targets).toEqual({ vocab: 1, grammar: 3, skills: 1 });
    expect(activeGoals(s)).toEqual(["vocab", "grammar"]);
  });
});

describe("goal bonuses", () => {
  it("come from the target's tier, not from how much more was done, and only while eligible", () => {
    const ent = (target: number, words: number, claimed: boolean) =>
      xpEntitlement({ ...TARGETS, vocab: target }, progress(words), claims(claimed)).vocab;
    expect(ent(3, 3, true)).toBe(0); // Starter
    expect(ent(3, 30, true)).toBe(0);
    expect(ent(5, 5, true)).toBe(10);
    expect(ent(5, 18, true)).toBe(10); // a Small goal stays Small however many cards
    expect(ent(10, 10, true)).toBe(20);
    expect(ent(15, 15, true)).toBe(30);
    expect(ent(5, 18, false)).toBe(0);
    expect(ent(5, 4, true)).toBe(0);
    const g = (target: number, done: number) => xpEntitlement({ ...TARGETS, grammar: target }, progress(0, done), claims(false, true)).grammar;
    expect([g(1, 3), g(2, 2), g(3, 3), g(2, 1)]).toEqual([10, 20, 30, 0]);
    expect(checkEligibility(TARGETS, progress(5, 0, 2))).toEqual({ vocab: true, grammar: false, skills: true });
  });
});

describe("ledger", () => {
  it("applies only the difference and is idempotent", () => {
    const l0 = blankLedger("2026-10-18", 40);
    l0.claims.vocab = true;
    const s1 = settleLedger(l0, TARGETS, progress(12));
    const s2 = settleLedger(s1.ledger, TARGETS, progress(12));
    expect(s1.delta).toBe(10);
    expect(s2.delta).toBe(0);
    expect(totalXp(s2.ledger)).toBe(50);
  });

  it("drops a claim when the target is raised above progress", () => {
    const l0 = blankLedger("2026-10-18");
    l0.claims.vocab = true;
    const s1 = settleLedger(l0, TARGETS, progress(6));
    const s2 = settleLedger(s1.ledger, { ...TARGETS, vocab: 10 }, progress(6));
    expect(s2.ledger.claims.vocab).toBe(false);
    expect(s2.delta).toBe(-10);
  });

  it("keeps a switched-off goal's claim and XP frozen", () => {
    const l0 = blankLedger("2026-10-18");
    l0.claims.grammar = true;
    const s1 = settleLedger(l0, TARGETS, progress(0, 1), ["vocab", "grammar"]);
    expect(s1.delta).toBe(10);
    // Grammar switched off, and its progress no longer read: nothing changes.
    const s2 = settleLedger(s1.ledger, TARGETS, progress(0, 0), ["vocab"]);
    expect(s2.delta).toBe(0);
    expect(s2.ledger.claims.grammar).toBe(true);
    expect(claimCount(s2.ledger, ["vocab"])).toBe(0);
    expect(claimCount(s2.ledger, ["vocab", "grammar"])).toBe(1);
  });

  it("moves yesterday's bonuses into the history on a new day", () => {
    const l0 = blankLedger("2026-10-18", 100);
    l0.claims.vocab = true;
    const day1 = settleLedger(l0, TARGETS, progress(10)).ledger;
    const day2 = ledgerForDay(JSON.parse(JSON.stringify(day1)), "2026-10-19");
    expect(day2.claims.vocab).toBe(false);
    expect(day2.historyXp).toBe(110);
    expect(totalXp(day2)).toBe(110);
  });

  it("reads today from the XP ledger's day record", () => {
    const d = blankDay("2026-11-8");
    d.seq.vocab = 3;
    d.bonus.vocab = 20;
    d.items.vocab = "pho";
    const l = ledgerFromDay(345, d);
    expect(l.claims).toEqual({ vocab: true, grammar: false, skills: false });
    expect(l.xp.vocab).toBe(20);
    expect(l.historyXp).toBe(325);
    expect(totalXp(l)).toBe(345);
  });

  it("sends only what changed: claims to pay or take back, and Home's bookkeeping", () => {
    const a = ledgerFromDay(0, blankDay("2026-11-8"));
    expect(ledgerChanges(a, a)).toEqual({ day: "2026-11-8", claims: [], extras: null });
    const b = { ...a, claims: { ...a.claims, vocab: true }, items: { vocab: "pho" } };
    expect(ledgerChanges(a, b)).toEqual({
      day: "2026-11-8",
      claims: [{ goal: "vocab", want: true }],
      extras: { items: { vocab: "pho" }, announced: a.announced, greeted: false },
    });
    expect(ledgerChanges(b, a).claims).toEqual([{ goal: "vocab", want: false }]);
  });

  it("starts blank from anything unreadable, and drops unknown dishes", () => {
    expect(ledgerForDay(null, "2026-1-1")).toEqual(blankLedger("2026-1-1"));
    expect(ledgerForDay({ v: 3 }, "2026-1-1")).toEqual(blankLedger("2026-1-1"));
    const saved = { ...blankLedger("2026-1-1"), items: { vocab: "pho", grammar: "pizza" } };
    expect(ledgerForDay(saved, "2026-1-1").items).toEqual({ vocab: "pho" });
  });

  it("uses the local calendar day, unpadded", () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-1-5");
  });
});

describe("daily menu", () => {
  const LIB = {
    food: MENU_LIBRARY.food.map((x) => x.key),
    drink: MENU_LIBRARY.drink.map((x) => x.key),
    dessert: MENU_LIBRARY.dessert.map((x) => x.key),
  };

  it("has 12 foods, 10 drinks and 10 desserts, each with a measured drawing", () => {
    expect([LIB.food.length, LIB.drink.length, LIB.dessert.length]).toEqual([12, 10, 10]);
    expect(MENU_KINDS).toEqual(["food", "drink", "dessert"]);
    expect(Object.keys(ART_BOX).sort()).toEqual([...LIB.food, ...LIB.drink, ...LIB.dessert].sort());
  });

  it("serves one dish of each kind per learner and local day; every kind changes daily; whole libraries come round", () => {
    for (const u of ["demo-learner", "uid-A", "x9Kq2"]) {
      let prev: ReturnType<typeof menuForDay> | null = null;
      const seen = { food: new Set<string>(), drink: new Set<string>(), dessert: new Set<string>() };
      for (let i = -200; i < 300; i++) {
        const k = localDayKey(new Date(2026, 9, 20 + i));
        const m = menuForDay(u, k);
        expect(menuForDay(u, k)).toEqual(m);
        for (const kind of MENU_KINDS) {
          expect(m[kind].kind).toBe(kind);
          expect(LIB[kind]).toContain(m[kind].key);
          seen[kind].add(m[kind].key);
          if (prev) expect(m[kind].key).not.toBe(prev[kind].key);
        }
        prev = m;
      }
      for (const kind of MENU_KINDS) expect(seen[kind].size).toBe(LIB[kind].length);
    }
    const n0 = dayNumber("2026-10-20");
    const start = Math.floor(n0 / 12) * 12;
    const foods = Array.from({ length: 12 }, (_, i) => pickDish("demo-learner", "food", start + i).key);
    expect(new Set(foods).size).toBe(12);
  });

  it("matches the prototype's menu for the same learner and day", () => {
    // Same hash, shuffle and rotation as the HomeDraft board, so a learner sees the same dishes.
    const a = menuForDay("demo-learner", "2026-10-27");
    const b = menuForDay("demo-learner", "2026-10-27");
    expect(a).toEqual(b);
    expect(menuForDay("someone-else", "2026-10-27")).not.toEqual(undefined);
  });

  it("gives active goals food, then drink, then dessert; a dish already fed stays put", () => {
    const d = menuForDay("demo-learner", "2026-10-27");
    const kinds = (active: ("vocab" | "grammar" | "skills")[], kept = {}) => {
      const a = assignMenu(d, active, kept);
      return active.map((id) => a[id]!.kind).join();
    };
    expect(kinds(["vocab", "grammar", "skills"])).toBe("food,drink,dessert");
    expect(kinds(["vocab", "skills"])).toBe("food,drink");
    expect(kinds(["grammar"])).toBe("food");
    expect(assignMenu(d, [], {})).toEqual({});
    expect(kinds(["grammar", "skills"], { grammar: d.drink.key })).toBe("drink,food");
    expect(kinds(["vocab", "grammar", "skills"], { vocab: "trada" })).toBe("drink,food,dessert");
  });

  it("centres every dish in the thought cloud and fits it inside", () => {
    for (const k of Object.keys(ART_BOX)) {
      const f = thoughtFit(k);
      const b = ART_BOX[k];
      const s = f.size / 80;
      expect(Math.abs(f.x + (b[0] + b[2] / 2) * s - THOUGHT.cx)).toBeLessThan(0.2);
      expect(Math.abs(f.y + (b[1] + b[3] / 2) * s - THOUGHT.cy)).toBeLessThan(0.2);
      expect((b[2] + 3) * s).toBeLessThanOrEqual(THOUGHT.w + 0.2);
      expect((b[3] + 3) * s).toBeLessThanOrEqual(THOUGHT.h + 0.2);
    }
  });
});

describe("growth", () => {
  // The egg's looks are drawn on its own 0-250 scale; this is the XP where one starts.
  const at = (units: number) => Math.ceil((units * HATCH_XP) / EGG_SPAN);

  it("follows the level: egg to Level 4, hatched at Level 5, full body from Level 10, an evolution every 10 levels", () => {
    expect(HATCH_XP).toBe(700);
    expect([0, 699, 700, 1959, 1960, 4199, 4200, 252000].map((x) => stageFor(x).name)).toEqual([
      "Hatching",
      "Hatching",
      "Baby Dragon",
      "Baby Dragon",
      "Young Dragon",
      "Young Dragon",
      "Majestic Dragon",
      "Majestic Dragon",
    ]);
    expect([1, 4, 5, 9, 10, 19, 20, 30, 99, 100].map((l) => evolutionFor(l).index)).toEqual([0, 0, 1, 1, 2, 2, 3, 4, 10, 11]);
    expect([9, 10].map((l) => evolutionFor(l).fullBody)).toEqual([false, true]);
    expect([699, 700].map((x) => hatchFor(x).state)).toEqual(["almost", "hatched"]);
    expect(eggUnits(350)).toBe(125);
    expect(eggUnits(5000)).toBe(EGG_SPAN);
  });

  it("hatches through egg, peek and almost, with wiggle bands at 75 and 150", () => {
    expect([at(113) - 1, at(113), at(175) - 1, at(175), 699, 700].map((x) => hatchFor(x).state)).toEqual([
      "egg",
      "peek",
      "peek",
      "almost",
      "almost",
      "hatched",
    ]);
    expect([0, at(75) - 1, at(75), at(150) - 1, at(150), 699].map((x) => hatchFor(x).wiggle)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(hatchFor(at(113)).hole).toBe(0.8);
    expect(hatchFor(699).hole).toBe(1.85);
    // The reveal keeps going right up to hatching: early peeks show far less than late ones.
    expect([112, 113, 130, 150, 175, 195, 215, 235].map((u) => hatchFor(at(u)).reveal)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(hatchFor(at(130) - 1).reveal).toBe(1);
    expect(hatchFor(700).reveal).toBe(0);
    expect(hatchFor(at(240)).hole - hatchFor(at(120)).hole).toBeGreaterThan(0.8);
    expect([at(235) - 1, at(235), 700].map((x) => hatchFor(x).ready)).toEqual([false, true, false]);
    expect([at(225) - 1, at(225)].map((x) => hatchFor(x).soon)).toEqual([false, true]);
    expect(hatchFor(at(200) - 1).frag.a).toBe(0);
    expect(hatchFor(at(200)).frag.a).toBeCloseTo(0.3, 1);
  });

  it("keeps the shell whole to 19 on the egg's scale, then only grows its cracks; the pip is done by 112", () => {
    const early = CRACKS.filter((k) => !k.late).map((k) => k.id);
    expect(early.every((k) => crackProgress(at(19)).pieces[k] === 0)).toBe(true);
    let prev = crackProgress(0).pieces;
    for (let xp = 1; xp <= 699; xp++) {
      const now = crackProgress(xp).pieces;
      for (const k of Object.keys(now)) expect(now[k]).toBeGreaterThanOrEqual(prev[k]);
      prev = now;
    }
    expect(early.every((k) => crackProgress(at(112)).pieces[k] === 1)).toBe(true);
    expect(crackProgress(at(19)).strength).toBe(0);
    expect(crackProgress(at(112)).strength).toBe(1);
    expect(newCracks(at(15), at(21))).toEqual(["r2a"]);
    expect(newCracks(at(60), at(40))).toEqual([]);
  });

  it("draws cracks in a warm brown that never gets as dark as the outline", () => {
    expect(crackInk(0)).toBe("#b8a392");
    expect(crackInk(1)).toBe("#8f6c56");
  });

  it("turns flaky from 150 on the egg's scale; curled flakes and crumbs go when it hatches, flaked patches stay", () => {
    expect(Object.values(shellBitsFor(at(150) - 1, false).flakes).some(Boolean)).toBe(false);
    const late = shellBitsFor(699, false);
    expect(Object.values(late.flakes).every(Boolean)).toBe(true);
    expect(Object.values(late.crumbs).every(Boolean)).toBe(true);
    const hatched = shellBitsFor(900, true);
    expect(Object.values(hatched.flakes).filter(Boolean).length).toBe(FLAKES.length);
    expect(Object.values(hatched.crumbs).some(Boolean)).toBe(false);
    expect(Object.values(hatched.lifts).some(Boolean)).toBe(false);
  });
});

describe("lines", () => {
  it("reacts to each dish kind in its own words", () => {
    expect(eatLine({ key: "pho" })).toBe(LINES.eat);
    expect(eatLine({ key: "trada" })).toBe(EAT_LINES.drink);
    expect(eatLine({ key: "banhflan" }).vi).toBe("Ngọt xỉu luôn!");
  });

  it("sets the mood from the goals fed", () => {
    expect(moodFor(0, 0)).toMatch(/Waiting/);
    expect(moodFor(0, 3)).toBe(MOODS[0]);
    expect(moodFor(1, 3)).toBe(MOODS[1]);
    expect(moodFor(2, 3)).toBe(MOODS[2]);
    expect(moodFor(3, 3)).toBe(MOODS[3]);
    expect(moodFor(0, 1)).toBe(MOODS[0]);
    expect(moodFor(1, 1)).toBe(MOODS[3]);
  });
});
