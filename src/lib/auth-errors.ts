import { FirebaseError } from "firebase/app";

/**
 * Turns a Firebase Auth error into a short, friendly message we can show
 * next to a form instead of a raw "auth/xyz" error code.
 */
export function friendlyAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Please choose a password with at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/missing-password":
      return "Please enter a password.";
    default:
      return "Something went wrong. Please try again.";
  }
}
