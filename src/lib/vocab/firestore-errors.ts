import { FirebaseError } from "firebase/app";

/** Turns a Firestore error into a short, friendly message for form/UI error states. */
export function friendlyFirestoreError(error: unknown): string {
  if (error instanceof Error && error.message.includes("Firebase isn't configured")) {
    return error.message;
  }
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "permission-denied":
      return "You don't have permission to do that.";
    case "unauthenticated":
      return "You've been signed out. Please log in again.";
    case "unavailable":
    case "deadline-exceeded":
      return "Network error. Check your connection and try again.";
    case "resource-exhausted":
      return "Too many requests right now. Please try again in a moment.";
    case "not-found":
      return "That card no longer exists.";
    default:
      return "Something went wrong. Please try again.";
  }
}
