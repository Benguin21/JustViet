import { FirebaseError } from "firebase/app";

/**
 * Where an error happened, for the few codes whose best wording depends on
 * the flow (e.g. "invalid-credential" means a wrong password at login but
 * a wrong *current* password when re-confirming in Settings).
 */
export type AuthErrorContext =
  | "login"
  | "signup"
  | "google"
  | "reset-request"
  | "reauth"
  | "link"
  | "action-link"
  | "settings";

/** The Firebase error code, or null for anything that isn't a FirebaseError. */
export function authErrorCode(error: unknown): string | null {
  return error instanceof FirebaseError ? error.code : null;
}

/** Errors that mean "the user backed out" — callers usually stay quiet instead of showing a message. */
export function isUserCancelled(error: unknown): boolean {
  const code = authErrorCode(error);
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled";
}

/**
 * Turns a Firebase Auth error into a short, friendly message for a form,
 * instead of a raw "auth/xyz" code.
 *
 * Written to work with Firebase's email enumeration protection (on by
 * default for newer projects): messages never confirm whether an email
 * address has an account. Wrong email and wrong password get the same
 * message, and password-reset requests always look successful. One
 * unavoidable exception: Firebase itself still reports
 * "auth/email-already-in-use" when signing up with a taken email, so the
 * signup message is worded as gently as possible.
 */
export function friendlyAuthError(error: unknown, context: AuthErrorContext = "login"): string {
  if (error instanceof Error && error.message.includes("Firebase isn't configured")) {
    return error.message;
  }
  const code = authErrorCode(error);
  if (!code) return "Something went wrong. Please try again.";

  switch (code) {
    // ----- email / password -----
    case "auth/invalid-email":
    case "auth/missing-email":
      return "That email address doesn't look right.";
    case "auth/missing-password":
      return "Please enter a password.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return context === "reauth" || context === "settings"
        ? "That password isn't right. Please try again."
        : "Incorrect email or password.";
    case "auth/email-already-in-use":
      return context === "settings"
        ? "That email address can't be used. Please try a different one."
        : "We couldn't create an account with that email. If it's yours, try logging in or resetting your password.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "That password doesn't meet the requirements. Use at least 10 characters.";
    case "auth/user-disabled":
      return "This account has been turned off. Please contact JustViet support.";

    // ----- rate limits / network -----
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/quota-exceeded":
      return "We've sent too many emails recently. Please try again later.";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "Network error. Check your connection and try again.";

    // ----- Google sign-in and linking -----
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Google sign-in was cancelled.";
    case "auth/account-exists-with-different-credential":
      return "You already have a JustViet account with this email. Log in with your password first, then you can connect Google.";
    case "auth/credential-already-in-use":
      return "That Google account is already connected to a different JustViet account.";
    case "auth/provider-already-linked":
      return "Google is already connected to your account.";
    case "auth/no-such-provider":
      return "Google isn't connected to your account.";
    case "auth/operation-not-allowed":
      return context === "google" || context === "link"
        ? "Google sign-in isn't turned on for JustViet yet."
        : "That sign-in method isn't turned on for JustViet yet.";
    case "auth/unauthorized-domain":
      return "Google sign-in isn't allowed on this web address yet. (The site's domain needs to be authorised in Firebase.)";
    case "auth/web-storage-unsupported":
    case "auth/operation-not-supported-in-this-environment":
      return "Your browser is blocking what Google sign-in needs. Try turning off private browsing or allowing cookies for this site.";

    // ----- sessions -----
    case "auth/requires-recent-login":
      return "For your security, please confirm it's you and try again.";
    case "auth/user-token-expired":
    case "auth/invalid-user-token":
    case "auth/user-mismatch":
      return context === "reauth"
        ? "That's a different account. Please confirm with the account you're signed in to."
        : "Your session has expired. Please log in again.";

    // ----- email links (verify, reset, change email) -----
    case "auth/expired-action-code":
      return "This link has expired. Please request a new one.";
    case "auth/invalid-action-code":
      return "This link has already been used or isn't valid. Please request a new one.";
    case "auth/invalid-new-email":
      return "That email address doesn't look right.";
    case "auth/unauthorized-continue-uri":
    case "auth/invalid-continue-uri":
    case "auth/missing-continue-uri":
      return "We couldn't send that email because this site's address isn't set up in Firebase yet.";

    default:
      return "Something went wrong. Please try again.";
  }
}
