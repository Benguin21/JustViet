/**
 * The numbers the Vocabulary intro shows, worked out by the real scheduler (`srs.ts`) with the
 * learner's own settings, so the tutorial never promises intervals the app doesn't use. Pure,
 * like srs.ts (tested in tutorial.test.ts).
 */
import { applyReview, createNewCardFields, formatInterval, previewIntervals } from "./srs";
import type { CardRating, SrsFields, SrsSettings } from "./types";

export interface LadderStep {
  /** How long until the next review, in ms. */
  ms: number;
  /** The same, as the rating buttons show it ("10 min", "3 days"). */
  label: string;
}

/**
 * The wait before each review of a brand-new card that's rated Good every time it comes up:
 * the "each review, the wait grows" picture. Fuzz is turned off so it's the same every time.
 */
export function reviewLadder(settings: SrsSettings, reviews = 5, start: number = Date.now()): LadderStep[] {
  const steady: SrsSettings = { ...settings, enableFuzz: false };
  let card: SrsFields = createNewCardFields(new Date(start));
  let at = start;
  const out: LadderStep[] = [];
  for (let i = 0; i < reviews; i++) {
    const next = applyReview(card, "good", steady, new Date(at)).card;
    const ms = next.due - at;
    out.push({ ms, label: formatInterval(ms) });
    at = next.due;
    card = next;
  }
  return out;
}

/** What each rating button would say for a brand-new card (the intro's practice card). */
export function newCardRatingLabels(settings: SrsSettings, now: number = Date.now()): Record<CardRating, string> {
  const previews = previewIntervals(createNewCardFields(new Date(now)), { ...settings, enableFuzz: false }, new Date(now));
  return {
    again: previews.again.label,
    hard: previews.hard.label,
    good: previews.good.label,
    easy: previews.easy.label,
  };
}
