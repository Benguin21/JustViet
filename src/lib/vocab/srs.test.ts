import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "./settings";
import {
  applyReview,
  createNewCardFields,
  effectiveStatus,
  formatInterval,
  isDue,
  previewIntervals,
  rescheduleForRetention,
} from "./srs";
import type { SrsFields, SrsSettings } from "./types";

const NOW = new Date("2026-01-01T12:00:00.000Z");
const settings: SrsSettings = DEFAULT_SRS_SETTINGS;

function freshCard(): SrsFields {
  return createNewCardFields(NOW);
}

describe("createNewCardFields", () => {
  it("starts a card in the new state, due immediately, with zeroed history", () => {
    const card = freshCard();
    expect(card.state).toBe("new");
    expect(card.suspended).toBe(false);
    expect(card.due).toBe(NOW.getTime());
    expect(card.reviewCount).toBe(0);
    expect(card.lapseCount).toBe(0);
    expect(card.lastReview).toBeNull();
  });
});

describe("isDue / effectiveStatus", () => {
  it("a brand new card is due immediately", () => {
    const card = freshCard();
    expect(isDue(card, NOW.getTime())).toBe(true);
  });

  it("suspended cards are never due, regardless of their due date", () => {
    const card = { ...freshCard(), suspended: true, due: NOW.getTime() - 1000 };
    expect(isDue(card, NOW.getTime())).toBe(false);
    expect(effectiveStatus(card)).toBe("suspended");
  });

  it("effectiveStatus reflects the underlying SRS state when not suspended", () => {
    const card = freshCard();
    expect(effectiveStatus(card)).toBe("new");
  });
});

describe("first review of a new card", () => {
  it("Again keeps the card in learning, due within the first learning step", () => {
    const card = freshCard();
    const { card: after } = applyReview(card, "again", settings, NOW);
    expect(after.state).toBe("learning");
    expect(after.due).toBeGreaterThan(NOW.getTime());
    // First learning step is "1m" by default.
    expect(after.due - NOW.getTime()).toBeLessThanOrEqual(2 * 60_000);
    expect(after.reviewCount).toBe(1);
    expect(after.lapseCount).toBe(0);
  });

  it("Easy graduates the card straight to review with a multi-day interval", () => {
    const card = freshCard();
    const { card: after } = applyReview(card, "easy", settings, NOW);
    expect(after.state).toBe("review");
    expect(after.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(after.stability).toBeGreaterThan(0);
  });

  it("Good with default two-step learning does not graduate on the first review", () => {
    const card = freshCard();
    const { card: after } = applyReview(card, "good", settings, NOW);
    expect(after.state).toBe("learning");
    expect(after.reviewCount).toBe(1);
  });
});

describe("graduating through learning steps", () => {
  it("Good twice graduates a card to review", () => {
    let card = freshCard();
    ({ card } = applyReview(card, "good", settings, NOW));
    expect(card.state).toBe("learning");

    const secondReviewAt = new Date(card.due);
    ({ card } = applyReview(card, "good", settings, secondReviewAt));
    expect(card.state).toBe("review");
    expect(card.scheduledDays).toBeGreaterThanOrEqual(1);
  });
});

describe("lapses", () => {
  it("rating Again on a review-state card sends it to relearning and counts a lapse", () => {
    let card = freshCard();
    ({ card } = applyReview(card, "easy", settings, NOW)); // graduate to review
    expect(card.state).toBe("review");
    const lapseCountBefore = card.lapseCount;

    const reviewAt = new Date(card.due);
    ({ card } = applyReview(card, "again", settings, reviewAt));

    expect(card.state).toBe("relearning");
    expect(card.lapseCount).toBe(lapseCountBefore + 1);
  });

  it("recovering from relearning respects the minimum-interval-after-lapse setting", () => {
    let card = freshCard();
    ({ card } = applyReview(card, "easy", settings, NOW));
    const lapseAt = new Date(card.due);
    ({ card } = applyReview(card, "again", settings, lapseAt));
    expect(card.state).toBe("relearning");

    const strictSettings: SrsSettings = { ...settings, minimumIntervalAfterLapse: 3 };
    const recoverAt = new Date(card.due);
    const { card: recovered } = applyReview(card, "good", strictSettings, recoverAt);

    expect(recovered.state).toBe("review");
    expect(recovered.scheduledDays).toBeGreaterThanOrEqual(3);
  });
});

describe("difficulty extremes", () => {
  it("repeatedly rating Easy keeps intervals growing and difficulty low", () => {
    let card = freshCard();
    let at = NOW;
    for (let i = 0; i < 5; i++) {
      ({ card } = applyReview(card, "easy", settings, at));
      at = new Date(card.due);
    }
    expect(card.state).toBe("review");
    expect(card.difficulty).toBeLessThan(5);
    expect(card.scheduledDays).toBeGreaterThan(10);
  });

  it("repeatedly rating Again keeps the card in relearning with rising difficulty", () => {
    let card = freshCard();
    ({ card } = applyReview(card, "easy", settings, NOW)); // graduate once
    let at = new Date(card.due);
    for (let i = 0; i < 4; i++) {
      ({ card } = applyReview(card, "again", settings, at));
      at = new Date(card.due);
    }
    // Lapses count Review -> Relearning transitions, not every retry within
    // relearning (matches Anki/FSRS semantics) — so failing Again inside
    // relearning repeatedly still counts as a single lapse.
    expect(card.state).toBe("relearning");
    expect(card.lapseCount).toBe(1);
    expect(card.difficulty).toBeGreaterThan(5);
  });
});

describe("multiple reviews in one day", () => {
  it("handles a second review minutes after the first without erroring", () => {
    let card = freshCard();
    ({ card } = applyReview(card, "good", settings, NOW));
    const fiveMinLater = new Date(NOW.getTime() + 5 * 60_000);
    const { card: after } = applyReview(card, "good", settings, fiveMinLater);
    expect(after.reviewCount).toBe(2);
  });
});

describe("long review intervals respect the maximum-interval setting", () => {
  it("caps scheduled days at the configured maximum", () => {
    const cappedSettings: SrsSettings = { ...settings, maximumInterval: 30 };
    let card = freshCard();
    let at = NOW;
    for (let i = 0; i < 10; i++) {
      ({ card } = applyReview(card, "easy", cappedSettings, at));
      at = new Date(card.due);
    }
    expect(card.scheduledDays).toBeLessThanOrEqual(30);
  });
});

describe("changing SRS settings changes scheduling behavior", () => {
  it("a higher desired retention produces shorter review intervals", () => {
    const lowRetention: SrsSettings = { ...settings, desiredRetention: 0.8 };
    const highRetention: SrsSettings = { ...settings, desiredRetention: 0.97 };

    const card = { ...freshCard(), state: "review" as const, stability: 20, difficulty: 5 };

    const low = previewIntervals(card, lowRetention, NOW).good;
    const high = previewIntervals(card, highRetention, NOW).good;

    expect(high.scheduledDays).toBeLessThan(low.scheduledDays);
  });

  it("a shorter first learning step changes when Again is next due", () => {
    const fastSettings: SrsSettings = { ...settings, learningSteps: ["1m"] };
    const slowSettings: SrsSettings = { ...settings, learningSteps: ["30m"] };

    const fast = applyReview(freshCard(), "again", fastSettings, NOW).card;
    const slow = applyReview(freshCard(), "again", slowSettings, NOW).card;

    expect(fast.due).toBeLessThan(slow.due);
  });
});

describe("previewIntervals", () => {
  it("returns all four ratings without mutating the input card", () => {
    const card = freshCard();
    const preview = previewIntervals(card, settings, NOW);
    expect(Object.keys(preview).sort()).toEqual(["again", "easy", "good", "hard"]);
    expect(card.state).toBe("new"); // unchanged
    // Easy should schedule further out than Again.
    expect(preview.easy.dueAt).toBeGreaterThan(preview.again.dueAt);
  });
});

describe("rescheduleForRetention", () => {
  it("leaves new/learning cards untouched", () => {
    const card = freshCard();
    const result = rescheduleForRetention(card, settings, NOW.getTime());
    expect(result).toEqual(card);
  });

  it("shortens the interval of a review card when retention target increases", () => {
    const reviewCard: SrsFields = {
      ...freshCard(),
      state: "review",
      stability: 20,
      difficulty: 5,
    };
    const relaxed = rescheduleForRetention(
      reviewCard,
      { ...settings, desiredRetention: 0.8 },
      NOW.getTime(),
    );
    const strict = rescheduleForRetention(
      reviewCard,
      { ...settings, desiredRetention: 0.97 },
      NOW.getTime(),
    );
    expect(strict.scheduledDays).toBeLessThan(relaxed.scheduledDays);
  });
});

describe("formatInterval", () => {
  it("formats sub-minute, minute, hour, day, month, and year ranges", () => {
    expect(formatInterval(30_000)).toBe("<1 min");
    expect(formatInterval(10 * 60_000)).toBe("10 min");
    expect(formatInterval(5 * 3_600_000)).toBe("5 hr");
    expect(formatInterval(4 * 86_400_000)).toBe("4 days");
    expect(formatInterval(1 * 86_400_000)).toBe("1 day");
    expect(formatInterval(60 * 86_400_000)).toMatch(/mo$/);
    expect(formatInterval(400 * 86_400_000)).toMatch(/yr$/);
  });
});
