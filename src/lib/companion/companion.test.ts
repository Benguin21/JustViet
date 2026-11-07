import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL_SETTINGS,
  activeGoals,
  checkEligibility,
  nextVocabTier,
  normalizeGoalSettings,
  progressFromReviews,
  vocabTier,
  xpEntitlement,
} from "./goals";
import { blankLedger, claimCount, ledgerForDay, localDayKey, settleLedger, totalXp } from "./ledger";
import { ART_BOX, MENU_KINDS, MENU_LIBRARY, THOUGHT, assignMenu, dayNumber, menuForDay, pickDish, thoughtFit } from "./menu";
import { CRACKS, FLAKES } from "./crackTables";
import { crackInk, crackProgress, hatchFor, newCracks, shellBitsFor, stageFor } from "./growth";
import { EAT_LINES, LINES, MOODS, eatLine, moodFor } from "./lines";

const TARGETS = { vocab: 5, grammar: 1, skills: 1 };
const progress = (vocab = 0, grammar = 0, skills = 0) => ({ vocab, grammar, skills });
const claims = (vocab = false, grammar = false, skills = false) => ({ vocab, grammar, skills });

describe("today's progress from Vocab reviews", () => {
  it("counts each card reviewed today once, however many times it was rated", () => {
    const logs = [{ cardId: "a" }, { cardId: "b" }, { cardId: "a" }, { cardId: "c" }, { cardId: "a" }];
    expect(progressFromReviews(logs)).toEqual({ vocab: 3, grammar: 0, skills: 0 });
    expect(progressFromReviews([])).toEqual({ vocab: 0, grammar: 0, skills: 0 });
  });
});

describe("goal settings", () => {
  it("defaults to Vocab only, since Grammar and Skills have no pages yet", () => {
    expect(activeGoals(DEFAULT_GOAL_SETTINGS)).toEqual(["vocab"]);
  });

  it("fills in and clamps saved settings", () => {
    const s = normalizeGoalSettings({ enabled: { grammar: true }, targets: { vocab: 500, skills: "x" } });
    expect(s.enabled).toEqual({ vocab: true, grammar: true, skills: false });
    expect(s.targets).toEqual({ vocab: 50, grammar: 1, skills: 1 });
    expect(activeGoals(s)).toEqual(["vocab", "grammar"]);
  });
});

describe("XP rules", () => {
  it("tiers vocab at 5/10/16 words to 10/15/20 XP, max 20", () => {
    expect([0, 3, 4, 5, 9, 10, 15, 16, 18, 40].map(vocabTier)).toEqual([0, 0, 0, 10, 10, 15, 15, 20, 20, 20]);
    expect(nextVocabTier(3)).toEqual({ more: 2, gain: 10 });
    expect(nextVocabTier(12)).toEqual({ more: 4, gain: 5 });
    expect(nextVocabTier(16)).toBeNull();
  });

  it("only counts a claim while its goal is eligible", () => {
    const ent = (target: number, words: number, claimed: boolean) =>
      xpEntitlement({ ...TARGETS, vocab: target }, progress(words), claims(claimed)).vocab;
    expect(ent(3, 3, true)).toBe(0);
    expect(ent(3, 5, true)).toBe(10);
    expect(ent(5, 5, true)).toBe(10);
    expect(ent(10, 10, true)).toBe(15);
    expect(ent(5, 18, false)).toBe(0);
    expect(ent(5, 4, true)).toBe(0);
    expect(checkEligibility(TARGETS, progress(5, 0, 2))).toEqual({ vocab: true, grammar: false, skills: true });
  });
});

describe("ledger", () => {
  it("applies only the difference and is idempotent", () => {
    const l0 = blankLedger("2026-10-18");
    l0.claims.vocab = true;
    const s1 = settleLedger(l0, TARGETS, progress(12));
    const s2 = settleLedger(s1.ledger, TARGETS, progress(12));
    expect(s1.delta).toBe(15);
    expect(s2.delta).toBe(0);
    expect(totalXp(s2.ledger)).toBe(15);
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

  it("files a new day's yesterday under its date, and a revisited date keeps its own entry", () => {
    const l0 = blankLedger("2026-10-18");
    l0.claims.vocab = true;
    const day1 = settleLedger(l0, TARGETS, progress(10)).ledger;
    const day2 = ledgerForDay(JSON.parse(JSON.stringify(day1)), "2026-10-19");
    expect(day2.claims.vocab).toBe(false);
    expect(day2.historyXp).toBe(15);
    expect(totalXp(day2)).toBe(15);
    const back = ledgerForDay(day2, "2026-10-18");
    expect(back.claims.vocab).toBe(true);
    expect(back.xp.vocab).toBe(15);
    expect(back.historyXp).toBe(0);
    expect(totalXp(back)).toBe(15);
  });

  it("starts blank from anything unreadable, and drops unknown dishes", () => {
    expect(ledgerForDay(null, "2026-1-1")).toEqual(blankLedger("2026-1-1"));
    expect(ledgerForDay({ v: 2 }, "2026-1-1")).toEqual(blankLedger("2026-1-1"));
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
  it("has stages at 0/250/600/1200", () => {
    expect([0, 249, 250, 599, 600, 1199, 1200].map((x) => stageFor(x).cur.en)).toEqual([
      "Hatching",
      "Hatching",
      "Baby Dragon",
      "Baby Dragon",
      "Young Dragon",
      "Young Dragon",
      "Majestic Dragon",
    ]);
    expect(stageFor(1500).next).toBeNull();
  });

  it("hatches through egg, peek and almost, with wiggle bands at 75 and 150", () => {
    expect([112, 113, 174, 175, 249, 250].map((x) => hatchFor(x).state)).toEqual([
      "egg",
      "peek",
      "peek",
      "almost",
      "almost",
      "hatched",
    ]);
    expect([0, 74, 75, 149, 150, 249].map((x) => hatchFor(x).wiggle)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(hatchFor(113).hole).toBe(0.8);
    expect(hatchFor(249).hole).toBe(1.85);
    // The reveal keeps going right up to hatching: 120 XP shows far less than 240 XP.
    expect([112, 113, 129, 130, 150, 175, 195, 215, 234, 235, 249, 250].map((x) => hatchFor(x).reveal)).toEqual([
      0, 1, 1, 2, 3, 4, 5, 6, 6, 7, 7, 0,
    ]);
    expect(hatchFor(240).hole - hatchFor(120).hole).toBeGreaterThan(0.8);
    expect([234, 235, 250].map((x) => hatchFor(x).ready)).toEqual([false, true, false]);
    expect([224, 225].map((x) => hatchFor(x).soon)).toEqual([false, true]);
    expect(hatchFor(199).frag.a).toBe(0);
    expect(hatchFor(200).frag.a).toBeCloseTo(0.3);
  });

  it("keeps the shell whole to 19 XP, then only grows its cracks; the pip is done by 112", () => {
    const early = CRACKS.filter((k) => !k.late).map((k) => k.id);
    expect(early.every((k) => crackProgress(19).pieces[k] === 0)).toBe(true);
    let prev = crackProgress(0).pieces;
    for (let xp = 1; xp <= 249; xp++) {
      const now = crackProgress(xp).pieces;
      for (const k of Object.keys(now)) expect(now[k]).toBeGreaterThanOrEqual(prev[k]);
      prev = now;
    }
    expect(early.every((k) => crackProgress(112).pieces[k] === 1)).toBe(true);
    expect(crackProgress(19).strength).toBe(0);
    expect(crackProgress(112).strength).toBe(1);
    expect(newCracks(15, 21)).toEqual(["r2a"]);
    expect(newCracks(60, 40)).toEqual([]);
  });

  it("draws cracks in a warm brown that never gets as dark as the outline", () => {
    expect(crackInk(0)).toBe("#b8a392");
    expect(crackInk(1)).toBe("#8f6c56");
  });

  it("turns flaky from 150 XP; curled flakes and crumbs go when it hatches, flaked patches stay", () => {
    expect(Object.values(shellBitsFor(149, false).flakes).some(Boolean)).toBe(false);
    const at249 = shellBitsFor(249, false);
    expect(Object.values(at249.flakes).every(Boolean)).toBe(true);
    expect(Object.values(at249.crumbs).every(Boolean)).toBe(true);
    const hatched = shellBitsFor(300, true);
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
