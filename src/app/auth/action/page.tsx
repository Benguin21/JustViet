"use client";

/**
 * Handles the links in Firebase's account emails — reset password, verify
 * email, recover email (undo an email change) and verify a new email —
 * inside JustViet instead of on Firebase's default page. Doing it here is
 * what lets password resets follow JustViet's password rules (10+
 * characters, not common, not breached), which Firebase's default page
 * doesn't apply.
 *
 * To use it, set the action URL on the Firebase console's email templates
 * to `<site origin>/auth/action` (see "Email links" in AGENTS.md).
 * Firebase appends `?mode=…&oobCode=…&continueUrl=…`.
 */
import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import {
  applyEmailAction,
  checkPasswordResetLink,
  completePasswordReset,
  inspectEmailAction,
  isFirebaseConfigured,
  logIn,
  logOut,
  requestPasswordReset,
  useAuth,
} from "@/lib/auth-context";
import { authErrorCode, friendlyAuthError } from "@/lib/auth-errors";
import { validateNewPassword } from "@/lib/auth/new-password";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "@/lib/auth/next-path";

export default function AuthActionPage() {
  return (
    <Suspense fallback={<Shell><Spinner /></Shell>}>
      <AuthActionContent />
    </Suspense>
  );
}

function Shell({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-linear-to-b from-yellow-100 via-paper to-red-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />
        <div className="rounded-3xl border-2 border-ink-300/40 bg-surface p-6 shadow-[0_6px_0_rgba(74,47,34,0.08)] sm:p-8">
          {title && <h1 className="font-heading mb-5 text-center text-2xl font-extrabold">{title}</h1>}
          {children}
        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-6" role="status" aria-label="Loading">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500" aria-hidden="true" />
    </div>
  );
}

/** Only follow a continue URL back into this same site. */
function continuePathFrom(continueUrl: string | null): string {
  if (!continueUrl || typeof window === "undefined") return DEFAULT_AFTER_LOGIN;
  try {
    const url = new URL(continueUrl);
    if (url.origin !== window.location.origin) return DEFAULT_AFTER_LOGIN;
    return safeNextPath(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}

/**
 * Runs an action for a given one-time code at most once per page load.
 * React's StrictMode runs effects twice in development, and using a
 * one-time code twice would show "already used" right after succeeding.
 */
const onceByCode = new Map<string, Promise<unknown>>();
function once<T>(key: string, action: () => Promise<T>): Promise<T> {
  if (!onceByCode.has(key)) onceByCode.set(key, action());
  return onceByCode.get(key) as Promise<T>;
}

type LinkProblem = { message: string; expired: boolean };

function linkProblemFrom(err: unknown): LinkProblem {
  return { message: friendlyAuthError(err, "action-link"), expired: authErrorCode(err) === "auth/expired-action-code" };
}

/** A full-width button that navigates (a real button, not a button inside a link). */
function GoButton({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return <Button onClick={() => router.push(href)}>{children}</Button>;
}

function ProblemState({ problem, retryHref, retryLabel }: { problem: LinkProblem; retryHref: string; retryLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center" role="alert">
      <span className="text-4xl" aria-hidden="true">
        {problem.expired ? "⏰" : "🔗"}
      </span>
      <p className="font-semibold text-ink-700">{problem.message}</p>
      <GoButton href={retryHref}>{retryLabel}</GoButton>
    </div>
  );
}

function AuthActionContent() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const continuePath = continuePathFrom(params.get("continueUrl"));

  if (!isFirebaseConfigured) {
    return (
      <Shell title="Something's not set up">
        <p className="text-center font-semibold text-ink-700">Firebase isn&apos;t configured for this site yet.</p>
      </Shell>
    );
  }
  if (!code) {
    return (
      <Shell title="Link not valid">
        <ProblemState
          problem={{ message: "This link is incomplete. Please use the full link from your email.", expired: false }}
          retryHref="/login"
          retryLabel="Go to Log In"
        />
      </Shell>
    );
  }

  switch (mode) {
    case "resetPassword":
      return <ResetPassword code={code} continuePath={continuePath} />;
    case "verifyEmail":
      return <ApplyLink code={code} kind="verifyEmail" continuePath={continuePath} />;
    case "verifyAndChangeEmail":
      return <ApplyLink code={code} kind="verifyAndChangeEmail" continuePath={continuePath} />;
    case "recoverEmail":
      return <RecoverEmail code={code} />;
    default:
      return (
        <Shell title="Link not valid">
          <ProblemState
            problem={{ message: "We don't recognise this link. Please use the latest link from your email.", expired: false }}
            retryHref="/login"
            retryLabel="Go to Log In"
          />
        </Shell>
      );
  }
}

// ------------------------------------------------------------ reset password

function ResetPassword({ code, continuePath }: { code: string; continuePath: string }) {
  const [state, setState] = useState<
    { step: "checking" } | { step: "form"; email: string } | { step: "done"; signedIn: boolean } | { step: "problem"; problem: LinkProblem }
  >({ step: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    once(`check:${code}`, () => checkPasswordResetLink(code))
      .then((email) => !cancelled && setState({ step: "form", email }))
      .catch((err) => !cancelled && setState({ step: "problem", problem: linkProblemFrom(err) }));
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || state.step !== "form") return;
    setError(null);
    setSubmitting(true);
    const check = await validateNewPassword(password, confirm);
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      setSubmitting(false);
      return;
    }
    setErrors({});
    try {
      await completePasswordReset(code, password);
    } catch (err) {
      const code_ = authErrorCode(err);
      if (code_ === "auth/expired-action-code" || code_ === "auth/invalid-action-code") {
        setState({ step: "problem", problem: linkProblemFrom(err) });
      } else {
        setError(friendlyAuthError(err, "action-link"));
      }
      setSubmitting(false);
      return;
    }
    // Sign them straight in with the new password; if that doesn't work for
    // any reason, they can just log in.
    let signedIn = false;
    try {
      await logIn(state.email, password);
      signedIn = true;
    } catch {
      // fall through to the "Log in" button
    }
    setState({ step: "done", signedIn });
  }

  if (state.step === "checking") return <Shell title="Reset your password"><Spinner /></Shell>;
  if (state.step === "problem") {
    return (
      <Shell title="Reset your password">
        <ProblemState problem={state.problem} retryHref="/login?view=forgot" retryLabel="Send a New Link" />
      </Shell>
    );
  }
  if (state.step === "done") {
    return (
      <Shell title="Password updated">
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <span className="text-4xl" aria-hidden="true">
            🔒
          </span>
          <p className="font-semibold text-ink-700">
            Your new password is set.{" "}
            {state.signedIn ? "You're logged in." : "Log in with it to continue."}
          </p>
          <GoButton href={state.signedIn ? continuePath : "/login"}>{state.signedIn ? "Continue" : "Go to Log In"}</GoButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm font-semibold text-ink-500">
          For <span className="text-ink-900">{state.email}</span>
        </p>
        <NewPasswordFields
          label="New password"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          errors={errors}
          context={{ email: state.email }}
          autoFocus
        />
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting}>
          Save New Password
        </Button>
      </form>
    </Shell>
  );
}

// ------------------------------------------- verify email / verify new email

function ApplyLink({
  code,
  kind,
  continuePath,
}: {
  code: string;
  kind: "verifyEmail" | "verifyAndChangeEmail";
  continuePath: string;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<{ step: "working" } | { step: "done" } | { step: "problem"; problem: LinkProblem }>({
    step: "working",
  });

  useEffect(() => {
    let cancelled = false;
    once(`apply:${code}`, async () => {
      await applyEmailAction(code);
      // An email change signs the account out everywhere; make that explicit
      // here so nothing tries to use the old session.
      if (kind === "verifyAndChangeEmail") await logOut().catch(() => {});
    })
      .then(() => !cancelled && setState({ step: "done" }))
      .catch((err) => !cancelled && setState({ step: "problem", problem: linkProblemFrom(err) }));
    return () => {
      cancelled = true;
    };
  }, [code, kind]);

  const title = kind === "verifyEmail" ? "Verify your email" : "Confirm your new email";
  if (state.step === "working") return <Shell title={title}><Spinner /></Shell>;
  if (state.step === "problem") {
    return (
      <Shell title={title}>
        <ProblemState
          problem={state.problem}
          retryHref="/settings"
          retryLabel={kind === "verifyEmail" ? "Request a New Link" : "Go to Settings"}
        />
      </Shell>
    );
  }

  if (kind === "verifyAndChangeEmail") {
    return (
      <Shell title="Email updated">
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <span className="text-4xl" aria-hidden="true">
            ✅
          </span>
          <p className="font-semibold text-ink-700">
            Your email address has been changed. For your security, please log in again with your new address.
          </p>
          <GoButton href="/login">Go to Log In</GoButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Email verified">
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="text-4xl" aria-hidden="true">
          🎉
        </span>
        <p className="font-semibold text-ink-700">Thanks — your email address is verified.</p>
        <GoButton href={user ? continuePath : "/login"}>{user ? "Continue" : "Go to Log In"}</GoButton>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------ recover email

/**
 * "Was this you?" link sent to the old address after an email change.
 * Restoring is a deliberate button press (not automatic on page load), and
 * afterwards we offer a password reset, since someone else may have changed
 * the email.
 */
function RecoverEmail({ code }: { code: string }) {
  const [state, setState] = useState<
    | { step: "checking" }
    | { step: "confirm"; email: string | null }
    | { step: "done"; email: string | null }
    | { step: "problem"; problem: LinkProblem }
  >({ step: "checking" });
  const [restoring, setRestoring] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    once(`inspect:${code}`, () => inspectEmailAction(code))
      .then((info) => !cancelled && setState({ step: "confirm", email: info.email }))
      .catch((err) => !cancelled && setState({ step: "problem", problem: linkProblemFrom(err) }));
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleRestore() {
    if (state.step !== "confirm" || restoring) return;
    setRestoring(true);
    setError(null);
    try {
      await applyEmailAction(code);
      await logOut().catch(() => {});
      setState({ step: "done", email: state.email });
    } catch (err) {
      const c = authErrorCode(err);
      if (c === "auth/expired-action-code" || c === "auth/invalid-action-code") {
        setState({ step: "problem", problem: linkProblemFrom(err) });
      } else {
        setError(friendlyAuthError(err, "action-link"));
      }
    } finally {
      setRestoring(false);
    }
  }

  async function handleSendReset() {
    if (state.step !== "done" || !state.email) return;
    setError(null);
    try {
      await requestPasswordReset(state.email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, "reset-request"));
    }
  }

  if (state.step === "checking") return <Shell title="Undo email change"><Spinner /></Shell>;
  if (state.step === "problem") {
    return (
      <Shell title="Undo email change">
        <ProblemState problem={state.problem} retryHref="/login" retryLabel="Go to Log In" />
      </Shell>
    );
  }
  if (state.step === "confirm") {
    return (
      <Shell title="Undo email change">
        <div className="flex flex-col gap-4 text-center">
          <p className="font-semibold text-ink-700">
            Your JustViet account&apos;s email was recently changed. If that wasn&apos;t you, restore it to{" "}
            <span className="text-ink-900">{state.email ?? "your previous address"}</span>.
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          <Button onClick={handleRestore} loading={restoring}>
            Restore My Email
          </Button>
          <Link href="/home" className="text-sm font-bold text-ink-500 hover:text-red-500">
            It was me — keep the change
          </Link>
        </div>
      </Shell>
    );
  }
  return (
    <Shell title="Email restored">
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <p className="font-semibold text-ink-700">
          Your email is back to <span className="text-ink-900">{state.email ?? "your previous address"}</span>. If you
          didn&apos;t make that change, someone may know your password — we recommend resetting it now.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        {resetSent ? (
          <p className="text-sm font-semibold text-success-dark">We&apos;ve sent a password reset link to that address.</p>
        ) : (
          <Button onClick={handleSendReset} disabled={!state.email}>
            Reset My Password
          </Button>
        )}
        <Link href="/login" className="text-sm font-bold text-ink-500 hover:text-red-500">
          Go to Log In
        </Link>
      </div>
    </Shell>
  );
}
