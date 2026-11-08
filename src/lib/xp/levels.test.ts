import { describe, expect, it } from "vitest";
import { LEVEL_BENCHMARKS, LEVEL_XP, MAX_LEVEL, levelFor, levelProgress, levelThreshold } from "./levels";

describe("level table", () => {
  it("has 100 levels, starting at 0 XP and always rising", () => {
    expect(LEVEL_XP).toHaveLength(MAX_LEVEL);
    expect(LEVEL_XP[0]).toBe(0);
    for (let i = 1; i < LEVEL_XP.length; i++) expect(LEVEL_XP[i]).toBeGreaterThan(LEVEL_XP[i - 1]);
  });

  it("matches every benchmark exactly", () => {
    for (const [level, xp] of LEVEL_BENCHMARKS) expect(levelThreshold(level)).toBe(xp);
  });

  it("is the rounded linear interpolation between benchmarks (the spreadsheet's rule)", () => {
    for (let b = 0; b < LEVEL_BENCHMARKS.length - 1; b++) {
      const [l0, x0] = LEVEL_BENCHMARKS[b];
      const [l1, x1] = LEVEL_BENCHMARKS[b + 1];
      for (let l = l0; l <= l1; l++) expect(levelThreshold(l)).toBe(Math.round(x0 + ((x1 - x0) * (l - l0)) / (l1 - l0)));
    }
    expect(LEVEL_XP.slice(4, 11)).toEqual([700, 952, 1204, 1456, 1708, 1960, 2184]);
  });
});

describe("levelFor / levelProgress", () => {
  it("is the highest level whose threshold is at or below the XP", () => {
    expect([0, 174, 175, 699, 700, 951, 952, 1960, 251999, 252000].map(levelFor)).toEqual([1, 1, 2, 4, 5, 5, 6, 10, 99, 100]);
  });

  it("stays at Level 100 past 252,000 XP and never goes below Level 1", () => {
    expect(levelFor(1_000_000)).toBe(100);
    expect(levelFor(-50)).toBe(1);
    expect(levelProgress(300_000)).toMatchObject({ level: 100, to: null, toNext: 0, fraction: 1, isMax: true, xp: 300_000 });
  });

  it("measures progress between the current and next thresholds", () => {
    expect(levelProgress(800)).toMatchObject({ level: 5, from: 700, to: 952, toNext: 152 });
    expect(levelProgress(800).fraction).toBeCloseTo(100 / 252);
    expect(levelProgress(0)).toMatchObject({ level: 1, from: 0, to: 175, toNext: 175, fraction: 0 });
  });

  it("drops back a level when XP is taken back", () => {
    expect(levelProgress(710).level).toBe(5);
    expect(levelProgress(710 - 20).level).toBe(4);
  });
});
