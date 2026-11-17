"use client";

/**
 * The one place that touches `firebase/auth`. Components read state with
 * `useAuth()` and call the action functions exported below; nothing else
 * in the app imports `firebase/auth`.
 *
 * Sign-in methods: email + password, and Google (popup first, falling
 * back to a full-page redirect if the browser blocks the popup). One
 * account per email address — see "Accounts and sign-in methods" in
 * AGENTS.md for how Google and password sign-in share an account.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  unlink,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type ActionCodeSettings,
  type OAuthCredential,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { authErrorCode } from "@/lib/auth-errors";

export const GOOGLE_PROVIDER_ID = "google.com";
export const PASSWORD_PROVIDER_ID = "password";

type AuthContextValue = {
  user: User | null;
  /** True until we know whether a user is signed in. */
  loading: boolean;
  /**
   * Whether the signed-in user's email is verified. Google accounts are
   * verified from the start. The Community feature requires this.
   */
  emailVerified: boolean;
  /** Which sign-in methods the account has. */
  providers: { password: boolean; google: boolean };
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Firebase mutates the `User` object in place (display name, verified
 * flag, linked providers), which React can't see. Every action below calls
 * `notifyUserChanged()` afterwards, and the provider bumps a version so
 * `useAuth()` consumers re-render with the new values.
 */
const userChangeListeners = new Set<() => void>();
function notifyUserChanged() {
  userChangeListeners.forEach((listener) => listener());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [version, setVersion] = useState(0);
  // If Firebase isn't configured, onAuthStateChanged will never fire, so
  // there's nothing to wait for — start "loaded" in that case.
  const [loading, setLoading] = useState(() => Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    const bump = () => setVersion((v) => v + 1);
    userChangeListeners.add(bump);
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      bump();
    });
    return () => {
      userChangeListeners.delete(bump);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const providerIds = new Set(user?.providerData.map((p) => p.providerId) ?? []);
    return {
      user,
      loading,
      emailVerified: Boolean(user?.emailVerified),
      providers: {
        password: providerIds.has(PASSWORD_PROVIDER_ID),
        google: providerIds.has(GOOGLE_PROVIDER_ID),
      },
    };
    // `version` changes whenever the (mutable) user object changed in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, version]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function requireAuth() {
  if (!auth) {
    throw new Error(
      "Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local (see .env.local.example).",
    );
  }
  return auth;
}

function requireUser(): User {
  const current = requireAuth().currentUser;
  if (!current) throw new Error("You need to be signed in to do that.");
  return current;
}

export { isFirebaseConfigured };

function googleProvider() {
  const provider = new GoogleAuthProvider();
  // Always show Google's account chooser, so people with several Google
  // accounts can pick the right one.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Where links in Firebase's emails send people afterwards ("continue URL").
 * Must be on a domain authorised in the Firebase console (localhost is by
 * default).
 */
function emailLinkSettings(continuePath: string): ActionCodeSettings | undefined {
  if (typeof window === "undefined") return undefined;
  return { url: `${window.location.origin}${continuePath}` };
}

/**
 * Sends an auth email with a continue URL; if Firebase rejects the URL
 * (e.g. the site is opened on a domain that isn't authorised yet), sends
 * it without one rather than failing.
 */
async function withContinueUrl(send: (settings: ActionCodeSettings | undefined) => Promise<void>, continuePath: string) {
  try {
    await send(emailLinkSettings(continuePath));
  } catch (err) {
    const code = authErrorCode(err);
    if (code === "auth/unauthorized-continue-uri" || code === "auth/invalid-continue-uri") {
      await send(undefined);
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------------- sign-in

/** Creates an account, sets the display name and sends a verification email. */
export async function signUp(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  try {
    await withContinueUrl((s) => sendEmailVerification(credential.user, s), "/home");
  } catch {
    // The account exists either way; the banner offers "Resend".
  }
  notifyUserChanged();
  return credential.user;
}

/** Logs an existing user in with email + password. */
export async function logIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return credential.user;
}

/** "new-account" when this Google sign-in just created the JustViet account. */
export type GoogleSignInOutcome = "signed-in" | "new-account";

/**
 * Signs in (or signs up) with Google. Uses a popup; if the browser blocks
 * it, switches to a full-page redirect and resolves "redirecting" — the
 * result is then picked up by `completeGoogleRedirect()` when the page
 * loads again.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome | "redirecting"> {
  const a = requireAuth();
  try {
    const result = await signInWithPopup(a, googleProvider());
    notifyUserChanged();
    return getAdditionalUserInfo(result)?.isNewUser ? "new-account" : "signed-in";
  } catch (err) {
    if (authErrorCode(err) === "auth/popup-blocked") {
      await signInWithRedirect(a, googleProvider());
      return "redirecting";
    }
    throw err;
  }
}

/**
 * Finishes a Google sign-in or link that fell back to a redirect: "none"
 * if there wasn't one. Throws the same errors a popup would (e.g.
 * `auth/account-exists-with-different-credential`).
 */
export async function completeGoogleRedirect(): Promise<GoogleSignInOutcome | "none"> {
  const result = await getRedirectResult(requireAuth());
  if (!result) return "none";
  notifyUserChanged();
  return getAdditionalUserInfo(result)?.isNewUser ? "new-account" : "signed-in";
}

/**
 * A Google sign-in that hit an existing password account with the same
 * email. Holding on to it lets us link Google once the user has proven
 * they own the account by logging in with their password.
 */
export interface PendingGoogleLink {
  credential: OAuthCredential;
  email: string | null;
}

export function pendingGoogleLinkFromError(error: unknown): PendingGoogleLink | null {
  if (authErrorCode(error) !== "auth/account-exists-with-different-credential") return null;
  const credential = GoogleAuthProvider.credentialFromError(error as FirebaseError);
  if (!credential) return null;
  const email = (error as FirebaseError).customData?.email;
  return { credential, email: typeof email === "string" ? email : null };
}

/** Links a pending Google sign-in to the account the user just logged in to. */
export async function linkPendingGoogle(link: PendingGoogleLink) {
  await linkWithCredential(requireUser(), link.credential);
  notifyUserChanged();
}

/** Signs the current user out. */
export async function logOut() {
  await signOut(requireAuth());
}

// --------------------------------------------------------------- recovery

/**
 * Sends a password-reset email. Always resolves for unknown addresses too,
 * so the UI can show the same message either way and never reveal whether
 * an email has an account. (With Firebase's email enumeration protection
 * on, Firebase itself behaves this way; this also covers projects where
 * it's off.)
 */
export async function requestPasswordReset(email: string) {
  try {
    await withContinueUrl((s) => sendPasswordResetEmail(requireAuth(), email.trim(), s), "/login");
  } catch (err) {
    if (authErrorCode(err) === "auth/user-not-found") return;
    throw err;
  }
}

// ------------------------------------------------- email links (/auth/action)

export type EmailActionInfo = {
  operation: string;
  /** The email the link is about (for recover-email: the address being restored). */
  email: string | null;
  previousEmail: string | null;
};

/** Reads what an email link will do without using it up. */
export async function inspectEmailAction(code: string): Promise<EmailActionInfo> {
  const info = await checkActionCode(requireAuth(), code);
  return {
    operation: info.operation,
    email: info.data.email ?? null,
    previousEmail: info.data.previousEmail ?? null,
  };
}

/** Uses a verify-email, recover-email or verify-new-email link. */
export async function applyEmailAction(code: string) {
  await applyActionCode(requireAuth(), code);
  // If this browser is signed in, pick up the change (e.g. now verified).
  const current = requireAuth().currentUser;
  if (current) {
    try {
      await refreshUser();
    } catch {
      // An email change ends the old session; the page handles signing in again.
    }
  }
}

/** Checks a reset-password link and returns the account's email. */
export async function checkPasswordResetLink(code: string): Promise<string> {
  return verifyPasswordResetCode(requireAuth(), code);
}

/** Sets a new password from a reset-password link. */
export async function completePasswordReset(code: string, newPassword: string) {
  await confirmPasswordReset(requireAuth(), code, newPassword);
}

// ------------------------------------------------------- verification state

/**
 * Re-reads the user from Firebase (e.g. after they clicked the verification
 * link in another tab). When the email has just become verified, also
 * refreshes the ID token, so Firestore rules that check
 * `request.auth.token.email_verified` see the change right away.
 */
export async function refreshUser() {
  const current = requireAuth().currentUser;
  if (!current) return;
  const wasVerified = current.emailVerified;
  await reload(current);
  if (current.emailVerified && !wasVerified) await current.getIdToken(true);
  notifyUserChanged();
}

/** Re-sends the verification email to the signed-in user. */
export async function resendVerificationEmail() {
  const current = requireUser();
  await withContinueUrl((s) => sendEmailVerification(current, s), "/home");
}

// ------------------------------------------------------------- settings

export async function updateDisplayName(name: string) {
  await updateProfile(requireUser(), { displayName: name.trim() });
  notifyUserChanged();
}

/** Confirms it's really the user (Firebase requires this before sensitive changes). */
export async function reauthenticateWithPassword(password: string) {
  const current = requireUser();
  if (!current.email) throw new Error("Your account has no email address.");
  await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
}

/** Confirms it's really the user with a Google popup. */
export async function reauthenticateWithGoogle() {
  await reauthenticateWithPopup(requireUser(), googleProvider());
}

/** Changes the password after re-checking the current one. */
export async function changePassword(currentPassword: string, newPassword: string) {
  await reauthenticateWithPassword(currentPassword);
  await updatePassword(requireUser(), newPassword);
  notifyUserChanged();
}

/**
 * Starts an email change: Firebase emails a confirmation link to the new
 * address, and the change only happens when that link is used (the old
 * address also gets a "was this you?" link to undo it). May throw
 * `auth/requires-recent-login`.
 */
export async function requestEmailChange(newEmail: string) {
  const current = requireUser();
  await withContinueUrl((s) => verifyBeforeUpdateEmail(current, newEmail.trim(), s), "/settings");
}

/**
 * For accounts that only use Google: emails a link to create a password.
 * (With email enumeration protection on, Firebase doesn't allow adding a
 * password directly from the browser, so we use the reset-link flow, which
 * also proves the user still controls the email address.)
 */
export async function sendPasswordSetupEmail() {
  const current = requireUser();
  if (!current.email) throw new Error("Your account has no email address.");
  await withContinueUrl((s) => sendPasswordResetEmail(requireAuth(), current.email!, s), "/settings");
}

/** Connects Google to the signed-in account (popup, falling back to redirect). */
export async function linkGoogle(): Promise<"linked" | "redirecting"> {
  const current = requireUser();
  try {
    await linkWithPopup(current, googleProvider());
    notifyUserChanged();
    return "linked";
  } catch (err) {
    if (authErrorCode(err) === "auth/popup-blocked") {
      await linkWithRedirect(current, googleProvider());
      return "redirecting";
    }
    throw err;
  }
}

/** Disconnects Google — refused if it's the account's only way to sign in. */
export async function unlinkGoogle() {
  const current = requireUser();
  const hasPassword = current.providerData.some((p) => p.providerId === PASSWORD_PROVIDER_ID);
  if (!hasPassword) {
    throw new Error("Add a password before disconnecting Google, so you can still sign in.");
  }
  await unlink(current, GOOGLE_PROVIDER_ID);
  notifyUserChanged();
}
