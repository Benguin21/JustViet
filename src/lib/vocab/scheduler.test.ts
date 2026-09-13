import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "./settings";
import { createNewCardFields } from "./srs";
import {
  buildStudyQueue,
  computeDailyAverage,
  computeDailyBudget,
  computeForecast,
  computeHeatmapMonthLabels,
  computeProgressStats,
  computeReviewHeatmap,
  computeStudyStreaks,
  computeTodayStats,
} from "./scheduler";
import type { ReviewLogEntry, SrsSettings, VocabCard } from "./types";

const NOW = new Date("2026-01-01T12:00:00.000Z").getTime();

let nextId = 0;
function makeCard(overrides: Partial<VocabCard> = {}): VocabCard {
  nextId += 1;
  return {
    id: `card-${nextId}`,
    userId: "user-1",
    front: `front-${nextId}`,
    back: `back-${nextId}`,
    exampleSentence: "",
    partOfSpeech: "noun",
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...createNewCardFields(new Date(NOW)),
    ...overrides,
  };
}

function makeLog(overrides: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    id: `log-${Math.random()}`,
    cardId: "card-1",
    userId: "user-1",
    rating: "good",
    priorState: "new",
    resultState: "learning",
    reviewedAt: NOW,
    scheduledDays: 0,
    stabilityAfter: 1,
    difficultyAfter: 5,
    ...overrides,
  };
}

describe("computeDailyBudget", () => {
  it("counts new-card and review reviews separately from today's logs", () => {
    const logs = [
      makeLog({ priorState: "new" }),
      makeLog({ priorState: "new" }),
      makeLog({ priorState: "review" }),
      makeLog({ priorState: "learning" }), // mid-flight step, doesn't count against either budget
    ];
    const budget = computeDailyBudget(logs, DEFAULT_SRS_SETTINGS);
    expect(budget.newDoneToday).toBe(2);
    expect(budget.reviewsDoneToday).toBe(1);
    expect(budget.newRemaining).toBe(DEFAULT_SRS_SETTINGS.maxNewPerDay - 2);
    expect(budget.reviewsRemaining).toBe(DEFAULT_SRS_SETTINGS.maxReviewsPerDay - 1);
  });

  it("never goes negative once the limit is exceeded", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxNewPerDay: 1 };
    const logs = [makeLog({ priorState: "new" }), makeLog({ priorState: "new" })];
    expect(computeDailyBudget(logs, settings).newRemaining).toBe(0);
  });
});

describe("buildStudyQueue", () => {
  it("only includes cards that are actually due", () => {
    const dueCard = makeCard({ due: NOW - 1000 });
    const futureCard = makeCard({ due: NOW + 10 * 24 * 60 * 60 * 1000 });
    const queue = buildStudyQueue([dueCard, futureCard], DEFAULT_SRS_SETTINGS, {
      now: NOW,
      todaysLogs: [],
    });
    expect(queue.map((c) => c.id)).toEqual([dueCard.id]);
  });

  it("excludes suspended cards even if their due date has passed", () => {
    const suspended = makeCard({ due: NOW - 1000, suspended: true });
    const queue = buildStudyQueue([suspended], DEFAULT_SRS_SETTINGS, {
      now: NOW,
      todaysLogs: [],
    });
    expect(queue).toHaveLength(0);
  });

  it("caps new cards shown at the remaining daily new-card budget", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxNewPerDay: 2 };
    const newCards = Array.from({ length: 5 }, () => makeCard({ due: NOW - 1000 }));
    const queue = buildStudyQueue(newCards, settings, { now: NOW, todaysLogs: [] });
    expect(queue).toHaveLength(2);
  });

  it("respects new cards already studied today when computing remaining budget", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxNewPerDay: 2 };
    const newCards = Array.from({ length: 5 }, () => makeCard({ due: NOW - 1000 }));
    const logs = [makeLog({ priorState: "new" }), makeLog({ priorState: "new" })];
    const queue = buildStudyQueue(newCards, settings, { now: NOW, todaysLogs: logs });
    expect(queue).toHaveLength(0);
  });

  it("caps review cards shown at the remaining daily review budget", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxReviewsPerDay: 1 };
    const reviewCards = Array.from({ length: 3 }, () =>
      makeCard({ due: NOW - 1000, state: "review", stability: 10, difficulty: 5 }),
    );
    const queue = buildStudyQueue(reviewCards, settings, { now: NOW, todaysLogs: [] });
    expect(queue).toHaveLength(1);
  });

  it("always includes in-flight learning/relearning cards, ignoring daily caps", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxReviewsPerDay: 0, maxNewPerDay: 0 };
    const learningCard = makeCard({ due: NOW - 1000, state: "learning" });
    const queue = buildStudyQueue([learningCard], settings, { now: NOW, todaysLogs: [] });
    expect(queue.map((c) => c.id)).toEqual([learningCard.id]);
  });

  it("caps the total session size at maxCardsPerSession", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, maxCardsPerSession: 3, maxNewPerDay: 10 };
    const newCards = Array.from({ length: 10 }, () => makeCard({ due: NOW - 1000 }));
    const queue = buildStudyQueue(newCards, settings, { now: NOW, todaysLogs: [] });
    expect(queue).toHaveLength(3);
  });

  it("orders new cards by creation date when newCardOrder is 'added'", () => {
    const settings: SrsSettings = { ...DEFAULT_SRS_SETTINGS, newCardOrder: "added", mixNewWithReviews: false };
    const older = makeCard({ due: NOW - 1000, createdAt: NOW - 5000 });
    const newer = makeCard({ due: NOW - 1000, createdAt: NOW - 1000 });
    const queue = buildStudyQueue([newer, older], settings, { now: NOW, todaysLogs: [] });
    expect(queue.map((c) => c.id)).toEqual([older.id, newer.id]);
  });
});

describe("computeTodayStats", () => {
  it("splits due cards into new vs already-scheduled", () => {
    const cards = [
      makeCard({ due: NOW - 1000 }), // new, due
      makeCard({ due: NOW - 1000, state: "review", stability: 10 }), // review, due
      makeCard({ due: NOW + 100000 }), // not due
    ];
    const stats = computeTodayStats(cards, NOW);
    expect(stats.due).toBe(2);
    expect(stats.new).toBe(1);
    expect(stats.reviews).toBe(1);
  });
});

describe("computeProgressStats", () => {
  it("buckets cards into learning / mature / suspended", () => {
    const cards = [
      makeCard(), // new -> learning bucket
      makeCard({ state: "review", scheduledDays: 30 }), // mature
      makeCard({ state: "review", scheduledDays: 5 }), // young review -> learning bucket
      makeCard({ suspended: true }),
    ];
    const stats = computeProgressStats(cards);
    expect(stats.total).toBe(4);
    expect(stats.mature).toBe(1);
    expect(stats.suspended).toBe(1);
    expect(stats.learning).toBe(2);
  });
});

describe("computeForecast", () => {
  it("buckets due cards by day for the next N days", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const cards = [
      makeCard({ due: NOW + DAY }),
      makeCard({ due: NOW + DAY + 1000 }), // same day as above
      makeCard({ due: NOW + 3 * DAY }),
      makeCard({ due: NOW + 20 * DAY }), // outside the 14-day window
    ];
    const forecast = computeForecast(cards, NOW, 14);
    expect(forecast).toHaveLength(14);
    expect(forecast.reduce((sum, d) => sum + d.count, 0)).toBe(3);
  });
});

describe("computeReviewHeatmap", () => {
  it("counts reviews per day across the window", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const logs = [
      makeLog({ reviewedAt: NOW }),
      makeLog({ reviewedAt: NOW }),
      makeLog({ reviewedAt: NOW - DAY }),
    ];
    const heatmap = computeReviewHeatmap(logs, NOW, 7);
    const real = heatmap.filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    expect(real).toHaveLength(7);
    // The last cell is always today, regardless of any leading padding.
    const todayBucket = heatmap.at(-1);
    expect(todayBucket?.count).toBe(2);
  });

  it("shows zero (not missing) for a real day with no logged reviews", () => {
    // Leading nulls are expected (weekday-alignment padding) — every *real*
    // day cell should still be an explicit 0, not absent.
    const heatmap = computeReviewHeatmap([], NOW, 7);
    for (const cell of heatmap) {
      if (cell === null) continue;
      expect(cell.count).toBe(0);
    }
    expect(heatmap.some((cell) => cell !== null)).toBe(true);
  });

  it("pads the start so every row lines up with its real Mon-Sun weekday", () => {
    // Core invariant: row index (position mod 7) must match the cell's
    // actual local weekday (Mon=0..Sun=6) for every non-null cell — this
    // is what the UI's static "Mon..Sun" row labels rely on. Checked
    // structurally (not against a hardcoded date/weekday) so it holds
    // regardless of which timezone the test runs in.
    const heatmap = computeReviewHeatmap([], NOW, 30);
    heatmap.forEach((cell, index) => {
      if (!cell) return;
      const mondayIndexed = (new Date(cell.date).getDay() + 6) % 7;
      expect(mondayIndexed).toBe(index % 7);
    });
  });

  it("has fewer than 7 leading padding cells and no trailing padding", () => {
    const heatmap = computeReviewHeatmap([], NOW, 14);
    const firstRealIndex = heatmap.findIndex((cell) => cell !== null);
    expect(firstRealIndex).toBeGreaterThanOrEqual(0);
    expect(firstRealIndex).toBeLessThan(7);
    expect(heatmap.at(-1)).not.toBeNull();
  });
});

describe("computeDailyAverage", () => {
  it("averages over every day in the window, not just days with activity", () => {
    // Mirrors the spec example: 20 / 0 / 40 across 3 days averages to 20/day.
    const heatmap = [
      { date: NOW - 2 * 86_400_000, count: 20 },
      { date: NOW - 1 * 86_400_000, count: 0 },
      { date: NOW, count: 40 },
    ];
    expect(computeDailyAverage(heatmap)).toBe(20);
  });

  it("ignores leading null padding cells rather than counting them as zero days", () => {
    const withPadding = [null, null, { date: NOW, count: 10 }];
    const withoutPadding = [{ date: NOW, count: 10 }];
    expect(computeDailyAverage(withPadding)).toBe(computeDailyAverage(withoutPadding));
  });

  it("returns 0 for an all-empty window instead of NaN", () => {
    expect(computeDailyAverage([null, null])).toBe(0);
    expect(computeDailyAverage([])).toBe(0);
  });
});

describe("computeStudyStreaks", () => {
  const DAY = 86_400_000;

  it("counts today toward the current streak when today has activity", () => {
    const logs = [
      makeLog({ reviewedAt: NOW }),
      makeLog({ reviewedAt: NOW - DAY }),
      makeLog({ reviewedAt: NOW - 2 * DAY }),
    ];
    expect(computeStudyStreaks(logs, NOW).current).toBe(3);
  });

  it("doesn't break the streak just because today hasn't been studied yet", () => {
    // "Today" isn't over — an ongoing streak through yesterday should
    // still show as live, not reset to 0.
    const logs = [makeLog({ reviewedAt: NOW - DAY }), makeLog({ reviewedAt: NOW - 2 * DAY })];
    expect(computeStudyStreaks(logs, NOW).current).toBe(2);
  });

  it("is 0 when there's a real gap (neither today nor yesterday studied)", () => {
    const logs = [makeLog({ reviewedAt: NOW - 3 * DAY })];
    expect(computeStudyStreaks(logs, NOW).current).toBe(0);
  });

  it("a zero-activity day in the middle breaks the streak", () => {
    const logs = [
      makeLog({ reviewedAt: NOW }), // today
      // NOW - DAY: a gap, no log
      makeLog({ reviewedAt: NOW - 2 * DAY }),
      makeLog({ reviewedAt: NOW - 3 * DAY }),
    ];
    expect(computeStudyStreaks(logs, NOW).current).toBe(1);
  });

  it("longest streak reflects the best historical run, even after it's since broken", () => {
    const logs = [
      // An old 4-day streak, then a gap, then today's 1-day streak.
      makeLog({ reviewedAt: NOW - 10 * DAY }),
      makeLog({ reviewedAt: NOW - 9 * DAY }),
      makeLog({ reviewedAt: NOW - 8 * DAY }),
      makeLog({ reviewedAt: NOW - 7 * DAY }),
      makeLog({ reviewedAt: NOW }),
    ];
    const streaks = computeStudyStreaks(logs, NOW);
    expect(streaks.current).toBe(1);
    expect(streaks.longest).toBe(4);
  });

  it("multiple reviews on the same day only count once toward the streak", () => {
    const logs = [
      makeLog({ reviewedAt: NOW }),
      makeLog({ reviewedAt: NOW }),
      makeLog({ reviewedAt: NOW }),
    ];
    expect(computeStudyStreaks(logs, NOW).current).toBe(1);
  });

  it("handles a streak crossing a month boundary", () => {
    // Local dates, so this is unambiguous regardless of test-runner timezone.
    const jan31 = new Date(2026, 0, 31, 9).getTime();
    const feb1 = new Date(2026, 1, 1, 9).getTime();
    const feb2 = new Date(2026, 1, 2, 9).getTime();
    const logs = [
      makeLog({ reviewedAt: jan31 }),
      makeLog({ reviewedAt: feb1 }),
      makeLog({ reviewedAt: feb2 }),
    ];
    expect(computeStudyStreaks(logs, feb2).current).toBe(3);
  });

  it("handles a streak crossing a year boundary", () => {
    const dec30 = new Date(2025, 11, 30, 9).getTime();
    const dec31 = new Date(2025, 11, 31, 9).getTime();
    const jan1 = new Date(2026, 0, 1, 9).getTime();
    const logs = [
      makeLog({ reviewedAt: dec30 }),
      makeLog({ reviewedAt: dec31 }),
      makeLog({ reviewedAt: jan1 }),
    ];
    expect(computeStudyStreaks(logs, jan1).current).toBe(3);
    expect(computeStudyStreaks(logs, jan1).longest).toBe(3);
  });

  it("uses the complete log history rather than a windowed subset", () => {
    // A 30-day-old streak should still count toward "longest" even though
    // it would have fallen outside a typical ~14-week heatmap window.
    const logs = [
      makeLog({ reviewedAt: NOW - 40 * DAY }),
      makeLog({ reviewedAt: NOW - 39 * DAY }),
      makeLog({ reviewedAt: NOW - 38 * DAY }),
      makeLog({ reviewedAt: NOW - 37 * DAY }),
      makeLog({ reviewedAt: NOW - 36 * DAY }),
    ];
    expect(computeStudyStreaks(logs, NOW).longest).toBe(5);
  });
});

describe("computeHeatmapMonthLabels", () => {
  it("places one label per month at the column where that month first appears", () => {
    // Two months' worth of daily cells, laid out exactly like the real
    // heatmap grid (7 rows per column).
    const start = new Date(2026, 0, 15); // Jan 15, 2026
    const heatmap = Array.from({ length: 21 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { date: d.getTime(), count: 0 };
    });

    const labels = computeHeatmapMonthLabels(heatmap);
    const monthNames = labels.map((l) => l.label);
    expect(monthNames).toEqual(["Jan", "Feb"]);
    // Columns must be non-hardcoded and strictly increasing.
    expect(labels[1].columnIndex).toBeGreaterThan(labels[0].columnIndex);
  });

  it("handles a year boundary (Dec -> Jan)", () => {
    const start = new Date(2025, 11, 20); // Dec 20, 2025
    const heatmap = Array.from({ length: 20 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { date: d.getTime(), count: 0 };
    });

    const labels = computeHeatmapMonthLabels(heatmap);
    expect(labels.map((l) => l.label)).toEqual(["Dec", "Jan"]);
  });

  it("skips null padding cells without emitting a spurious label", () => {
    const jan1 = new Date(2026, 0, 1).getTime();
    const heatmap = [null, null, { date: jan1, count: 0 }];
    const labels = computeHeatmapMonthLabels(heatmap);
    expect(labels).toEqual([{ columnIndex: 0, label: "Jan" }]);
  });

  it("derives label positions purely from cell dates, not fixed offsets", () => {
    // Same data, shifted by a week of extra leading padding — the label's
    // columnIndex should shift by exactly one column, proving it isn't hardcoded.
    const jan1 = new Date(2026, 0, 1).getTime();
    const withoutPadding = computeHeatmapMonthLabels([{ date: jan1, count: 0 }]);
    const sevenPaddingCells = new Array(7).fill(null);
    const withPadding = computeHeatmapMonthLabels([...sevenPaddingCells, { date: jan1, count: 0 }]);
    expect(withPadding[0].columnIndex).toBe(withoutPadding[0].columnIndex + 1);
  });
});
