"use client";

import { useEffect, useState } from "react";
import { refreshUser, resendVerificationEmail, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

const DISMISS_KEY = "jv-verify-banner-dismissed";

function readDismissed(uid: string): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === uid;
  } catch {
    return false;
  }
}

/**
 * A small reminder to verify the account's email. Learning features don't
 * need a verified email (Community will), so this is dismissible for the
 * rest of the browser session. It re-checks the verified state whenever
 * the tab regains focus, so clicking the email link in another tab makes
 * the banner disappear on its own.
 */
export function VerifyEmailBanner() {
  const { user, emailVerified } = useAuth();
  const uid = user?.uid ?? "";
  const [dismissedFor, setDismissedFor] = useState<string | null>(() =>
    uid && typeof window !== "undefined" && readDismissed(uid) ? uid : null,
  );
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const show = Boolean(user) && !emailVerified && dismissedFor !== uid;

  useEffect(() => {
    if (!show) return;
    function recheck() {
      if (document.visibilityState === "visible") refreshUser().catch(() => {});
    }
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [show]);

  if (!show) return null;

  async function handleResend() {
    setStatus("sending");
    setMessage(null);
    try {
      await resendVerificationEmail();
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setMessage(friendlyAuthError(err, "settings"));
    }
  }

  async function handleCheck() {
    setStatus("checking");
    setMessage(null);
    try {
      await refreshUser();
      // If it's still unverified the banner stays; say so.
      setMessage("Not verified yet — click the link in the email, then try again.");
    } catch (err) {
      setMessage(friendlyAuthError(err, "settings"));
    } finally {
      setStatus("idle");
    }
  }

  function handleDismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, uid);
    } catch {
      // Private mode etc. — it just stays dismissed until reload.
    }
    setDismissedFor(uid);
  }

  return (
    <div className="border-b-2 border-yellow-200 bg-yellow-50 px-4 py-2.5 sm:px-6" role="region" aria-label="Verify your email">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p className="min-w-0 flex-1 font-semibold text-ink-700">
          <span aria-hidden="true">✉️ </span>
          {status === "sent" ? (
            <>New link sent to {user?.email}. Check your inbox (and spam).</>
          ) : (
            <>
              Please verify your email{user?.email ? ` (${user.email})` : ""} — check your inbox for our link.
            </>
          )}
          {message && <span className="block text-xs font-semibold text-ink-500">{message}</span>}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={status === "sending"}
            className="rounded-lg px-2 py-1 font-bold text-red-500 hover:bg-yellow-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Resend"}
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={status === "checking"}
            className="rounded-lg px-2 py-1 font-bold text-ink-700 hover:bg-yellow-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:opacity-60"
          >
            {status === "checking" ? "Checking…" : "I've verified"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss for now"
            className="rounded-lg px-2 py-1 text-lg leading-none text-ink-500 hover:bg-yellow-100 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
