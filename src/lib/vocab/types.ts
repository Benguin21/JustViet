/**
 * Shared types for the Vocab SRS feature. This module has no dependency on
 * Firestore or React — it's the vocabulary between the algorithm
 * (`srs.ts`), the data layer (`repository.ts`), and the UI.
 *
 * All timestamps are plain epoch milliseconds (not Firestore Timestamp or
 * Date) so the SRS math in `srs.ts` stays pure and independently testable;
 * `repository.ts` is the only place that converts to/from Firestore's
 * Timestamp type.
 */

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "other",
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** The four FSRS-style ratings a user can give a card during review. */
export const RATINGS = ["again", "hard", "good", "easy"] as const;
export type CardRating = (typeof RATINGS)[number];

/**
 * A card's scheduling state. `suspended` is tracked as a separate boolean
 * on the card (see `VocabCard.suspended`) rather than folded in here, so a
 * card's underlying SRS progress isn't lost while it's suspended — but the
 * UI treats "suspended" as a fifth status alongside these four (see
 * `effectiveStatus` in `srs.ts`).
 */
export const CARD_STATES = ["new", "learning", "review", "relearning"] as const;
export type CardState = (typeof CARD_STATES)[number];

/** A card's state for display purposes, including the "suspended" override. */
export type CardStatus = CardState | "suspended";

/** The SRS scheduling fields every vocab card carries. */
export interface SrsFields {
  state: CardState;
  suspended: boolean;
  /** Epoch ms this card is next due for review. */
  due: number;
  /** FSRS memory-stability estimate (days), 0 for never-reviewed cards. */
  stability: number;
  /** FSRS difficulty estimate, 1-10. */
  difficulty: number;
  /** The interval FSRS scheduled at the last review, in days. */
  scheduledDays: number;
  /** Epoch ms of the last review, or null if never reviewed. */
  lastReview: number | null;
  reviewCount: number;
  lapseCount: number;
  /**
   * Internal step counter ts-fsrs uses to track progress through
   * learning/relearning steps. Must be round-tripped to/from the library;
   * treat it as an opaque implementation detail.
   */
  fsrsLearningSteps: number;
}

export interface VocabCard extends SrsFields {
  id: string;
  userId: string;
  front: string;
  back: string;
  exampleSentence: string;
  partOfSpeech: PartOfSpeech;
  tags: string[];
  /**
   * Optional, added for batch import. `?` because cards created before
   * this field existed won't have it in Firestore — always guard reads
   * (`card.pronunciation ?? ""`) rather than assuming it's present.
   */
  pronunciation?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Fields the create-card form collects; the repository fills in the rest. */
export type NewVocabCardInput = {
  front: string;
  back: string;
  exampleSentence: string;
  partOfSpeech: PartOfSpeech;
  tags: string[];
  pronunciation?: string;
  notes?: string;
};

/** Fields the edit-card form can change; SRS progress is untouched. */
export type VocabCardEdit = NewVocabCardInput;

export interface ReviewLogEntry {
  id: string;
  cardId: string;
  userId: string;
  rating: CardRating;
  /** The card's state right before this review (used for daily-limit accounting). */
  priorState: CardState;
  /** The card's resulting state right after this review. */
  resultState: CardState;
  reviewedAt: number;
  /** Interval scheduled by this review, in days. */
  scheduledDays: number;
  stabilityAfter: number;
  difficultyAfter: number;
}

export type NewCardOrder = "added" | "random";

export interface SrsSettings {
  // Daily limits
  maxNewPerDay: number;
  maxReviewsPerDay: number;
  maxCardsPerSession: number;

  // New card settings
  /** FSRS step-duration strings, e.g. ["1m", "10m"]. */
  learningSteps: string[];
  newCardOrder: NewCardOrder;
  mixNewWithReviews: boolean;

  // Review settings
  /** Upper bound on any scheduled interval, in days. */
  maximumInterval: number;
  /** Lower bound on a graduated review interval, in days. */
  minimumInterval: number;

  // Lapse settings
  relearningSteps: string[];
  /** Lower bound on the interval right after a lapse recovers, in days. */
  minimumIntervalAfterLapse: number;

  // Algorithm (FSRS) settings
  /** Target probability of recall, 0-1 (typically 0.8-0.97). */
  desiredRetention: number;
  /** Add small randomness to intervals so cards don't clump together. */
  enableFuzz: boolean;
}
