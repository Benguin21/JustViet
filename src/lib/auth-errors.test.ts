import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { authErrorCode, friendlyAuthError, isUserCancelled } from "./auth-errors";

const err = (code: string) => new FirebaseError(code, `Firebase: Error (${code}).`);

describe("friendlyAuthError", () => {
  it("gives wrong-email and wrong-password the same message (no account enumeration)", () => {
    const messages = ["auth/invalid-credential", "auth/invalid-login-credentials", "auth/wrong-password", "auth/user-not-found"].map(
      (code) => friendlyAuthError(err(code), "login"),
    );
    expect(new Set(messages)).toEqual(new Set(["Incorrect email or password."]));
  });

  it("words a wrong password differently when re-confirming identity", () => {
    expect(friendlyAuthError(err("auth/invalid-credential"), "reauth")).toBe("That password isn't right. Please try again.");
  });

  it("never says outright that an email is registered at signup", () => {
    const message = friendlyAuthError(err("auth/email-already-in-use"), "signup");
    expect(message).not.toMatch(/already exists|is registered|already have an account/i);
    expect(message).toMatch(/logging in or resetting/);
  });

  it.each([
    ["auth/popup-blocked", /pop-ups/],
    ["auth/account-exists-with-different-credential", /Log in with your password first/],
    ["auth/credential-already-in-use", /different JustViet account/],
    ["auth/requires-recent-login", /confirm it's you/],
    ["auth/expired-action-code", /expired/],
    ["auth/invalid-action-code", /already been used/],
    ["auth/too-many-requests", /wait/],
    ["auth/network-request-failed", /connection/],
    ["auth/password-does-not-meet-requirements", /10 characters/],
    ["auth/unauthorized-domain", /authorised/],
  ])("maps %s", (code, pattern) => {
    expect(friendlyAuthError(err(code))).toMatch(pattern);
  });

  it("says when Google sign-in isn't turned on yet", () => {
    expect(friendlyAuthError(err("auth/operation-not-allowed"), "google")).toMatch(/Google sign-in isn't turned on/);
  });

  it("falls back to a generic message for unknown codes and non-Firebase errors", () => {
    expect(friendlyAuthError(err("auth/something-new"))).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError(new Error("boom"))).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError("weird")).toBe("Something went wrong. Please try again.");
  });

  it("passes the 'not configured' message through", () => {
    expect(friendlyAuthError(new Error("Firebase isn't configured yet. Add keys."))).toMatch(/isn't configured/);
  });
});

describe("helpers", () => {
  it("reads codes and recognises user cancellations", () => {
    expect(authErrorCode(err("auth/popup-blocked"))).toBe("auth/popup-blocked");
    expect(authErrorCode(new Error("x"))).toBeNull();
    expect(isUserCancelled(err("auth/popup-closed-by-user"))).toBe(true);
    expect(isUserCancelled(err("auth/cancelled-popup-request"))).toBe(true);
    expect(isUserCancelled(err("auth/popup-blocked"))).toBe(false);
  });
});
