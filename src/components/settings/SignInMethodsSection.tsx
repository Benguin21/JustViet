"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormMessage, SettingsSection } from "@/components/settings/SettingsSection";
import { ReauthCancelled } from "@/components/settings/useReauth";
import { linkGoogle, unlinkGoogle, useAuth } from "@/lib/auth-context";
import { friendlyAuthError, isUserCancelled } from "@/lib/auth-errors";

type Props = {
  withRecentLogin: <T>(action: () => Promise<T>) => Promise<T>;
};

export function SignInMethodsSection({ withRecentLogin }: Props) {
  const { providers, emailVerified } = useAuth();
  const [busy, setBusy] = useState<"link" | "unlink" | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function handleLink() {
    setBusy("link");
    setMessage(null);
    try {
      const outcome = await withRecentLogin(() => linkGoogle());
      if (outcome === "redirecting") return; // leaving for Google; the page finishes on return
      setMessage({ kind: "success", text: "Google is connected. You can now sign in with either method." });
    } catch (err) {
      if (!(err instanceof ReauthCancelled) && !isUserCancelled(err)) {
        setMessage({ kind: "error", text: friendlyAuthError(err, "link") });
      }
    }
    setBusy(null);
  }

  async function handleUnlink() {
    setConfirmingUnlink(false);
    setBusy("unlink");
    setMessage(null);
    try {
      await withRecentLogin(() => unlinkGoogle());
      setMessage({ kind: "success", text: "Google is disconnected. Sign in with your email and password from now on." });
    } catch (err) {
      if (!(err instanceof ReauthCancelled)) {
        setMessage({
          kind: "error",
          text: err instanceof Error && !("code" in err) ? err.message : friendlyAuthError(err, "link"),
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsSection
      title="Sign-in methods"
      description="Ways you can log in to this account. You always need at least one."
    >
      <ul className="flex flex-col divide-y-2 divide-ink-300/20">
        <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
          <div>
            <p className="font-bold text-ink-900">Email &amp; password</p>
            <p className="text-sm text-ink-500">{providers.password ? "Set up" : "Not set up — see Password above"}</p>
          </div>
          {providers.password ? <Badge tone="green">✓ On</Badge> : <Badge tone="gray">Off</Badge>}
        </li>
        <li className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0">
          <div>
            <p className="font-bold text-ink-900">Google</p>
            <p className="text-sm text-ink-500">{providers.google ? "Connected" : "Not connected"}</p>
          </div>
          {providers.google ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="outline"
                fullWidth={false}
                onClick={() => setConfirmingUnlink(true)}
                disabled={!providers.password}
                loading={busy === "unlink"}
              >
                Disconnect
              </Button>
              {!providers.password && (
                <p className="max-w-56 text-right text-xs text-ink-500">Add a password first, so you can still sign in.</p>
              )}
            </div>
          ) : (
            <Button size="sm" fullWidth={false} onClick={handleLink} loading={busy === "link"}>
              Connect Google
            </Button>
          )}
        </li>
      </ul>

      {message && (
        <div className="mt-3">
          <FormMessage kind={message.kind}>{message.text}</FormMessage>
        </div>
      )}

      {providers.password && !providers.google && !emailVerified && (
        <p className="mt-4 rounded-2xl bg-yellow-50 p-3 text-xs text-ink-700">
          <span className="font-bold">Good to know:</span> until your email is verified, signing in with Google using
          this same Gmail address replaces your password sign-in (that&apos;s how Google sign-in works). You&apos;d keep
          all your progress, and you could set a password again from this page. Verifying your email, or connecting
          Google here, avoids that.
        </p>
      )}

      {confirmingUnlink && (
        <ConfirmDialog
          title="Disconnect Google?"
          description="You'll sign in with your email and password instead. You can connect Google again any time."
          confirmLabel="Disconnect"
          onConfirm={handleUnlink}
          onCancel={() => setConfirmingUnlink(false)}
        />
      )}
    </SettingsSection>
  );
}
