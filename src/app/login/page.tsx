"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import {
  completeGoogleRedirect,
  isFirebaseConfigured,
  linkPendingGoogle,
  pendingGoogleLinkFromError,
  signInWithGoogle,
  useAuth,
  type PendingGoogleLink,
} from "@/lib/auth-context";
import { friendlyAuthError, isUserCancelled } from "@/lib/auth-errors";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  // useSearchParams (for ?next= and ?view=) needs a Suspense boundary in
  // production builds — see node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
  return (
    <Suspense fallback={<Spinner />}>
      <LoginPageContent />
    </Suspense>
  );
}

function Spinner() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
        aria-hidden="true"
      />
    </main>
  );
}

function initialMode(view: string | null): Mode {
  return view === "signup" || view === "forgot" ? view : "login";
}

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<Mode>(() => initialMode(params.get("view")));
  const [email, setEmail] = useState("");
  // While an auth action is in flight, hold off redirecting even if
  // Firebase already reports a signed-in user (e.g. signup still has to
  // set the name and send the verification email).
  const [busyCount, setBusyCount] = useState(0);
  const [checkingRedirect, setCheckingRedirect] = useState(isFirebaseConfigured);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [pendingLink, setPendingLink] = useState<PendingGoogleLink | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  // A brand-new account (email signup, or a first Google sign-in) always
  // starts on Home, where Rồng Con's intro runs — not on `next`.
  const [newAccount, setNewAccount] = useState(false);
  const destination = newAccount ? DEFAULT_AFTER_LOGIN : next;

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
    setBusyCount((n) => n + 1);
    try {
      return await action();
    } finally {
      setBusyCount((n) => n - 1);
    }
  }, []);

  const handleGoogleError = useCallback((err: unknown) => {
    if (isUserCancelled(err)) return;
    const link = pendingGoogleLinkFromError(err);
    if (link) {
      // The email already has a password account. Ask them to log in with
      // it once; then Google gets linked to that same account.
      setPendingLink(link);
      setEmail(link.email ?? "");
      setMode("login");
      setPageError(null);
      return;
    }
    setPageError(friendlyAuthError(err, "google"));
  }, []);

  // Finish a Google sign-in that fell back to a full-page redirect.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    completeGoogleRedirect()
      .then((outcome) => {
        if (!cancelled && outcome === "new-account") setNewAccount(true);
      })
      .catch((err) => {
        if (!cancelled) handleGoogleError(err);
      })
      .finally(() => {
        if (!cancelled) setCheckingRedirect(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handleGoogleError]);

  // Signed in (now or already): go where they were headed (Home for new accounts).
  useEffect(() => {
    if (!loading && user && busyCount === 0 && !checkingRedirect && !pendingLink && !linkProblem) {
      router.replace(destination);
    }
  }, [loading, user, busyCount, checkingRedirect, pendingLink, linkProblem, destination, router]);

  async function handleGoogle() {
    if (googleBusy) return;
    setPageError(null);
    setGoogleBusy(true);
    try {
      const outcome = await run(async () => {
        const result = await signInWithGoogle();
        // Set inside `run`, so it's in place before the redirect effect fires.
        if (result === "new-account") setNewAccount(true);
        return result;
      });
      if (outcome === "redirecting") return; // the browser is leaving for Google
    } catch (err) {
      handleGoogleError(err);
    }
    setGoogleBusy(false);
  }

  /** After a password login that was started to connect Google. */
  async function linkAfterLogin() {
    if (!pendingLink) return;
    try {
      await linkPendingGoogle(pendingLink);
    } catch (err) {
      setLinkProblem(
        `You're logged in, but we couldn't connect Google: ${friendlyAuthError(err, "link")} You can try again from Settings.`,
      );
    } finally {
      setPendingLink(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-linear-to-b from-yellow-100 via-paper to-red-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          aria-label="JustViet home"
          className="mx-auto mb-8 block w-fit rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
        >
          <Logo />
        </Link>

        {!isFirebaseConfigured && (
          <p className="mb-4 rounded-xl border-2 border-yellow-500 bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700">
            Firebase isn&apos;t configured yet. Copy{" "}
            <code className="rounded bg-yellow-200 px-1">.env.local.example</code>{" "}
            to <code className="rounded bg-yellow-200 px-1">.env.local</code>{" "}
            and add your Firebase project keys to enable login.
          </p>
        )}

        <div className="rounded-3xl border-2 border-ink-300/40 bg-surface p-6 shadow-[0_6px_0_rgba(74,47,34,0.08)] sm:p-8">
          {linkProblem ? (
            <div className="flex flex-col gap-4 text-center" role="alert">
              <p className="font-semibold text-ink-700">{linkProblem}</p>
              <Button onClick={() => setLinkProblem(null)}>Continue</Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mb-6 flex rounded-2xl bg-yellow-100 p-1" role="tablist" aria-label="Log in or sign up">
                  {(["login", "signup"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={mode === tab}
                      onClick={() => {
                        setMode(tab);
                        setPageError(null);
                      }}
                      className={`flex-1 rounded-xl py-2 text-sm font-bold tracking-wide uppercase transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
                        mode === tab ? "bg-surface text-red-500 shadow-sm" : "text-ink-500"
                      }`}
                    >
                      {tab === "login" ? "Log In" : "Sign Up"}
                    </button>
                  ))}
                </div>
              )}

              {mode === "forgot" && (
                <h1 className="font-heading mb-6 text-center text-2xl font-extrabold">Reset your password</h1>
              )}

              {pendingLink && mode === "login" && (
                <div className="mb-5 rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-ink-700" role="status">
                  <p className="font-bold text-ink-900">You already have a JustViet account</p>
                  <p className="mt-1">
                    {pendingLink.email ? (
                      <>
                        <span className="font-semibold">{pendingLink.email}</span> already signs in with a password.
                      </>
                    ) : (
                      "That email already signs in with a password."
                    )}{" "}
                    Log in with your password once and we&apos;ll connect Google to the same account — your progress
                    stays put, and you can use either from now on.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPendingLink(null)}
                    className="mt-2 rounded text-xs font-bold text-ink-500 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                  >
                    Cancel connecting Google
                  </button>
                </div>
              )}

              {mode !== "forgot" && !pendingLink && (
                <div className="mb-5 flex flex-col gap-5">
                  <GoogleButton
                    onClick={handleGoogle}
                    loading={googleBusy}
                    disabled={!isFirebaseConfigured}
                    label={mode === "signup" ? "Sign up with Google" : "Continue with Google"}
                  />
                  <OrDivider />
                </div>
              )}

              {pageError && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                  {pageError}
                </p>
              )}

              {mode === "login" && (
                <LoginForm
                  key={pendingLink ? "linking" : "login"}
                  initialEmail={email}
                  run={run}
                  onLoggedIn={linkAfterLogin}
                  onForgotPassword={(typed) => {
                    setEmail(typed);
                    setPageError(null);
                    setMode("forgot");
                  }}
                />
              )}
              {mode === "signup" && <SignupForm run={run} onCreated={() => setNewAccount(true)} />}
              {mode === "forgot" && (
                <ForgotPasswordForm initialEmail={email} onBackToLogin={() => setMode("login")} />
              )}
              {mode === "signup" && (
                <p className="mt-4 text-center text-xs text-ink-500">
                  By creating an account (including with Google), you agree to our{" "}
                  <Link href="/terms" className="font-bold text-ink-700 underline-offset-2 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-bold text-ink-700 underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>

        <nav aria-label="JustViet" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-ink-500">
          <Link href="/" className="rounded hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
            About JustViet
          </Link>
          <Link href="/privacy" className="rounded hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
            Privacy
          </Link>
          <Link href="/terms" className="rounded hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
            Terms
          </Link>
        </nav>
      </div>
    </main>
  );
}
