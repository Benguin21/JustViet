"use client";

import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/auth/PasswordField";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { reauthenticateWithGoogle, reauthenticateWithPassword, useAuth } from "@/lib/auth-context";
import { authErrorCode, friendlyAuthError, isUserCancelled } from "@/lib/auth-errors";

/** Thrown when the user closes the "confirm it's you" dialog; callers just stop quietly. */
export class ReauthCancelled extends Error {
  constructor() {
    super("Cancelled");
    this.name = "ReauthCancelled";
  }
}

function ReauthDialog({ onDone }: { onDone: (confirmed: boolean) => void }) {
  const { user, providers } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "google" | null>(null);

  async function confirmWithPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("password");
    try {
      await reauthenticateWithPassword(password);
      onDone(true);
    } catch (err) {
      setError(friendlyAuthError(err, "reauth"));
      setBusy(null);
    }
  }

  async function confirmWithGoogle() {
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      await reauthenticateWithGoogle();
      onDone(true);
    } catch (err) {
      if (!isUserCancelled(err)) setError(friendlyAuthError(err, "reauth"));
      setBusy(null);
    }
  }

  return (
    <Modal title="Confirm it's you" onClose={() => onDone(false)} maxWidth="md">
      <div className="flex flex-col gap-4">
        <p className="text-ink-700">
          For your security, please confirm your identity before making this change
          {user?.email ? (
            <>
              {" "}
              to <span className="font-semibold">{user.email}</span>
            </>
          ) : null}
          .
        </p>
        {providers.password && (
          <form onSubmit={confirmWithPassword} className="flex flex-col gap-3" noValidate>
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" loading={busy === "password"} disabled={!password}>
              Confirm
            </Button>
          </form>
        )}
        {providers.password && providers.google && <OrDivider />}
        {providers.google && (
          <GoogleButton onClick={confirmWithGoogle} loading={busy === "google"} label="Confirm with Google" />
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Firebase requires a recent sign-in before sensitive changes (email,
 * linking). `withRecentLogin(action)` runs the action; if Firebase says
 * the sign-in is too old, it asks the user to confirm (password or
 * Google) and runs the action once more. Render `dialog` somewhere in the
 * page.
 */
export function useReauth(): {
  withRecentLogin: <T>(action: () => Promise<T>) => Promise<T>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<((confirmed: boolean) => void) | null>(null);

  const askToConfirm = useCallback(
    () => new Promise<boolean>((resolve) => setPending(() => resolve)),
    [],
  );

  const withRecentLogin = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        return await action();
      } catch (err) {
        if (authErrorCode(err) !== "auth/requires-recent-login") throw err;
        const confirmed = await askToConfirm();
        if (!confirmed) throw new ReauthCancelled();
        return action();
      }
    },
    [askToConfirm],
  );

  const dialog = pending ? (
    <ReauthDialog
      onDone={(confirmed) => {
        pending(confirmed);
        setPending(null);
      }}
    />
  ) : null;

  return { withRecentLogin, dialog };
}
