import { FirebaseError } from "firebase/app";
import { pleaseWait } from "./limits";
import { formatDate } from "./posts";

/** Too soon after the last action of this kind (the rules would refuse it anyway). */
export class RateLimitError extends Error {
  readonly seconds: number;
  constructor(seconds: number) {
    super(pleaseWait(seconds));
    this.name = "RateLimitError";
    this.seconds = seconds;
  }
}

export class NameTakenError extends Error {
  constructor() {
    super("That name is already taken. Please choose another.");
    this.name = "NameTakenError";
  }
}

export class RenameTooSoonError extends Error {
  readonly nextAt: number;
  constructor(nextAt: number) {
    super(`You can change your name again on ${formatDate(nextAt)}.`);
    this.name = "RenameTooSoonError";
    this.nextAt = nextAt;
  }
}

export class AlreadyReportedError extends Error {
  constructor() {
    super("You've already reported this. Thanks for letting us know.");
    this.name = "AlreadyReportedError";
  }
}

export class ReportLimitError extends Error {
  constructor() {
    super("You've reached today's limit for reports. Please try again tomorrow.");
    this.name = "ReportLimitError";
  }
}

/** A moderator suspended the member: no posting, responding, voting, editing or reporting until then. */
export class SuspendedError extends Error {
  readonly until: number;
  constructor(until: number) {
    super(`You're suspended from posting until ${formatDate(until)}.`);
    this.name = "SuspendedError";
    this.until = until;
  }
}

/** Only moderators can do that. */
export class NotModeratorError extends Error {
  constructor() {
    super("Only moderators can do that. If you were just made a moderator, sign out and back in.");
    this.name = "NotModeratorError";
  }
}

/** The post or response was deleted (or never existed). */
export class GoneError extends Error {
  constructor(message = "This was deleted, so it can't be changed.") {
    super(message);
    this.name = "GoneError";
  }
}

const KNOWN = [
  RateLimitError,
  NameTakenError,
  RenameTooSoonError,
  AlreadyReportedError,
  ReportLimitError,
  GoneError,
  SuspendedError,
  NotModeratorError,
];

/** A short, friendly message for anything a Community action throws. Mirrors firestore-errors.ts. */
export function friendlyCommunityError(error: unknown): string {
  if (KNOWN.some((E) => error instanceof E)) return (error as Error).message;
  if (error instanceof Error && error.message.includes("Firebase isn't configured")) return error.message;
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again.";
  }
  switch (error.code) {
    case "permission-denied":
      return "That didn't go through. If you just did the same thing, wait a few seconds and try again.";
    case "unauthenticated":
      return "You've been signed out. Please log in again.";
    case "unavailable":
    case "deadline-exceeded":
      return "Network error. Check your connection and try again.";
    case "resource-exhausted":
      return "Too many requests right now. Please try again in a moment.";
    case "failed-precondition":
      return "Something changed while you were working. Please refresh and try again.";
    case "not-found":
      return "That no longer exists.";
    default:
      return "Something went wrong. Please try again.";
  }
}
