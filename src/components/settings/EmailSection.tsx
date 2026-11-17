"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormMessage, SettingsSection } from "@/components/settings/SettingsSection";
import { ReauthCancelled } from "@/components/settings/useReauth";
import { refreshUser, requestEmailChange, resendVerificationEmail, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

type Props = {
  withRecentLogin: <T>(action: () => Promise<T>) => Promise<T>;
};

export function EmailSection({ withRecentLogin }: Props) {
  const { user, emailVerified } = useAuth();
  const [verifyMessage, setVerifyMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [verifyBusy, setVerifyBusy] = useState<"resend" | "check" | null>(null);

  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [changeMessage, setChangeMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleResend() {
    setVerifyBusy("resend");
    setVerifyMessage(null);
    try {
      await resendVerificationEmail();
      setVerifyMessage({ kind: "success", text: `New verification link sent to ${user?.email}.` });
    } catch (err) {
      setVerifyMessage({ kind: "error", text: friendlyAuthError(err, "settings") });
    } finally {
      setVerifyBusy(null);
    }
  }

  async function handleCheck() {
    setVerifyBusy("check");
    setVerifyMessage(null);
    try {
      await refreshUser();
    } catch (err) {
      setVerifyMessage({ kind: "error", text: friendlyAuthError(err, "settings") });
    } finally {
      setVerifyBusy(null);
    }
  }

  async function handleChange(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setChangeMessage(null);
    const target = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return setFieldError("That email address doesn't look right.");
    if (target.toLowerCase() === user?.email?.toLowerCase()) return setFieldError("That's already your email.");
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await withRecentLogin(() => requestEmailChange(target));
      setChangeMessage({
        kind: "success",
        text: `We sent a confirmation link to ${target}. Your email changes once you click it — until then, keep using ${user?.email}. If nothing arrives, that address may already be in use.`,
      });
      setNewEmail("");
      setChanging(false);
    } catch (err) {
      if (!(err instanceof ReauthCancelled)) {
        setChangeMessage({ kind: "error", text: friendlyAuthError(err, "settings") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsSection title="Email">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold break-all text-ink-900">{user?.email}</span>
          {emailVerified ? (
            <Badge tone="green">✓ Verified</Badge>
          ) : (
            <Badge tone="yellow">Not verified</Badge>
          )}
        </div>

        {!emailVerified && (
          <div className="flex flex-col gap-2 rounded-2xl bg-yellow-50 p-4">
            <p className="text-sm text-ink-700">
              Check your inbox for our verification link. You&apos;ll need a verified email to join the Community.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" fullWidth={false} onClick={handleResend} loading={verifyBusy === "resend"}>
                Resend Link
              </Button>
              <Button size="sm" variant="outline" fullWidth={false} onClick={handleCheck} loading={verifyBusy === "check"}>
                I&apos;ve Verified
              </Button>
            </div>
            {verifyMessage && <FormMessage kind={verifyMessage.kind}>{verifyMessage.text}</FormMessage>}
          </div>
        )}

        {changeMessage && <FormMessage kind={changeMessage.kind}>{changeMessage.text}</FormMessage>}

        {changing ? (
          <form onSubmit={handleChange} className="flex flex-col gap-3" noValidate>
            <TextField
              label="New email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              error={fieldError}
              autoFocus
            />
            <p className="text-xs text-ink-500">
              We&apos;ll send a confirmation link to the new address. Your old address gets a note too, with a way to
              undo the change if it wasn&apos;t you.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" fullWidth={false} className="px-6" loading={submitting}>
                Send Confirmation Link
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth={false}
                className="px-6"
                onClick={() => {
                  setChanging(false);
                  setFieldError(undefined);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" fullWidth={false} className="self-start px-6" onClick={() => setChanging(true)}>
            Change Email
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
