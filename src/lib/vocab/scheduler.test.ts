import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "./settings";
import { createNewCardFields } from "./srs";
import {
  buildStudyQueue,
  computeDailyBudget,
  computeForecast,
  computeProgressStats,
  computeReviewHeatmap,
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
    expect(heatmap).toHaveLength(7);
    const todayBucket = heatmap[heatmap.length - 1];
    expect(todayBucket.count).toBe(2);
  });
});
