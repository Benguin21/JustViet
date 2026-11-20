import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "./settings";
import { newCardRatingLabels, reviewLadder } from "./tutorial";

const NOW = new Date("2026-01-01T12:00:00.000Z").getTime();

describe("reviewLadder", () => {
  it("starts with the learning step, then waits longer after every review", () => {
    const ladder = reviewLadder(DEFAULT_SRS_SETTINGS, 5, NOW);
    expect(ladder).toHaveLength(5);
    expect(ladder[0].label).toBe("10 min"); // the second of the default "1m 10m" steps
    for (let i = 1; i < ladder.length; i++) expect(ladder[i].ms).toBeGreaterThan(ladder[i - 1].ms);
    expect(ladder[1].ms).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000); // graduated: a day or more
  });

  it("is the same every time, even with fuzz on", () => {
    const fuzzy = { ...DEFAULT_SRS_SETTINGS, enableFuzz: true };
    expect(reviewLadder(fuzzy, 5, NOW)).toEqual(reviewLadder(fuzzy, 5, NOW));
  });
});

describe("newCardRatingLabels", () => {
  it("labels all four ratings for a new card, Again soonest", () => {
    const labels = newCardRatingLabels(DEFAULT_SRS_SETTINGS, NOW);
    expect(labels.again).toBe("1 min");
    expect(labels.good).toBe("10 min");
    expect(Object.values(labels).every((l) => l.length > 0)).toBe(true);
  });
});
