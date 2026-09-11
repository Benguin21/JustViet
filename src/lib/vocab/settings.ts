import type { SrsSettings } from "./types";

export const DEFAULT_SRS_SETTINGS: SrsSettings = {
  maxNewPerDay: 20,
  maxReviewsPerDay: 200,
  maxCardsPerSession: 50,

  learningSteps: ["1m", "10m"],
  newCardOrder: "added",
  mixNewWithReviews: true,

  maximumInterval: 36500,
  minimumInterval: 1,

  relearningSteps: ["10m"],
  minimumIntervalAfterLapse: 1,

  desiredRetention: 0.9,
  enableFuzz: false,
};

/** Matches ts-fsrs's step-duration format: a number followed by m/h/d. */
const STEP_PATTERN = /^\d+(\.\d+)?(m|h|d)$/;

export function parseSteps(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function formatSteps(steps: string[]): string {
  return steps.join(" ");
}

export type SrsSettingsErrors = Partial<Record<keyof SrsSettings, string>>;

/**
 * Validates a settings object before it's persisted. Returns an empty
 * object when everything's valid, otherwise a map of field -> message.
 */
export function validateSrsSettings(settings: SrsSettings): SrsSettingsErrors {
  const errors: SrsSettingsErrors = {};

  const positiveInt = (value: number) => Number.isInteger(value) && value >= 0;

  if (!positiveInt(settings.maxNewPerDay)) {
    errors.maxNewPerDay = "Must be a whole number, 0 or more.";
  }
  if (!positiveInt(settings.maxReviewsPerDay)) {
    errors.maxReviewsPerDay = "Must be a whole number, 0 or more.";
  }
  if (!positiveInt(settings.maxCardsPerSession) || settings.maxCardsPerSession < 1) {
    errors.maxCardsPerSession = "Must be a whole number, 1 or more.";
  }

  if (settings.learningSteps.length === 0) {
    errors.learningSteps = "Add at least one step, e.g. \"1m 10m\".";
  } else if (!settings.learningSteps.every((s) => STEP_PATTERN.test(s))) {
    errors.learningSteps = "Use values like 1m, 10m, 1h, or 1d.";
  }

  if (settings.relearningSteps.length === 0) {
    errors.relearningSteps = "Add at least one step, e.g. \"10m\".";
  } else if (!settings.relearningSteps.every((s) => STEP_PATTERN.test(s))) {
    errors.relearningSteps = "Use values like 1m, 10m, 1h, or 1d.";
  }

  if (!(settings.maximumInterval >= 1)) {
    errors.maximumInterval = "Must be 1 day or more.";
  }
  if (!(settings.minimumInterval >= 1)) {
    errors.minimumInterval = "Must be 1 day or more.";
  }
  if (
    !errors.maximumInterval &&
    !errors.minimumInterval &&
    settings.minimumInterval > settings.maximumInterval
  ) {
    errors.minimumInterval = "Can't be greater than the maximum interval.";
  }

  if (!(settings.minimumIntervalAfterLapse >= 1)) {
    errors.minimumIntervalAfterLapse = "Must be 1 day or more.";
  }

  if (!(settings.desiredRetention >= 0.7 && settings.desiredRetention <= 0.99)) {
    errors.desiredRetention = "Must be between 70% and 99%.";
  }

  return errors;
}

/** Fills in any missing fields with defaults (e.g. after loading an older settings doc). */
export function withSettingsDefaults(partial: Partial<SrsSettings>): SrsSettings {
  return { ...DEFAULT_SRS_SETTINGS, ...partial };
}
