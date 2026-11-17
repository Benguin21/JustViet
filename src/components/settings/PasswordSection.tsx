"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/auth/PasswordField";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { FormMessage, SettingsSection } from "@/components/settings/SettingsSection";
import { changePassword, sendPasswordSetupEmail, useAuth } from "@/lib/auth-context";
import { authErrorCode, friendlyAuthError } from "@/lib/auth-errors";
import { validateNewPassword } from "@/lib/auth/new-password";

export function PasswordSection() {
  const { user, providers } = useAuth();
  return (
    <SettingsSection title="Password">
      {providers.password ? <ChangePasswordForm email={user?.email ?? ""} name={user?.displayName ?? ""} /> : <SetPasswordByEmail email={user?.email ?? ""} />}
    </SettingsSection>
  );
}

function ChangePasswordForm({ email, name }: { email: string; name: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; password?: string; confirm?: string }>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (!current) return setErrors({ current: "Enter your current password." });
    setSubmitting(true);
    const check = await validateNewPassword(password, confirm);
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      setSubmitting(false);
      return;
    }
    if (password === current) {
      setErrors({ password: "Choose a password that's different from your current one." });
      setSubmitting(false);
      return;
    }
    setErrors({});
    try {
      await changePassword(current, password);
      setCurrent("");
      setPassword("");
      setConfirm("");
      setMessage({ kind: "success", text: "Password changed. Other devices will need to log in again." });
    } catch (err) {
      const code = authErrorCode(err);
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/invalid-login-credentials") {
        setErrors({ current: "That password isn't right." });
      } else {
        setMessage({ kind: "error", text: friendlyAuthError(err, "settings") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={errors.current}
      />
      <NewPasswordFields
        label="New password"
        password={password}
        confirm={confirm}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
        errors={{ password: errors.password, confirm: errors.confirm }}
        context={{ email, name }}
      />
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <Button type="submit" fullWidth={false} className="self-start px-8" loading={submitting}>
        Change Password
      </Button>
    </form>
  );
}

/**
 * Google-only accounts get a password by email link (handled by the
 * /auth/action page). Firebase's email enumeration protection blocks
 * adding a password directly from the browser, and the email step also
 * proves the user still controls the address.
 */
function SetPasswordByEmail({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function handleSend() {
    setSending(true);
    setMessage(null);
    try {
      await sendPasswordSetupEmail();
      setMessage({ kind: "success", text: `We sent a link to ${email}. Open it to create your password.` });
    } catch (err) {
      setMessage({ kind: "error", text: friendlyAuthError(err, "settings") });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-700">
        You sign in with Google, so you don&apos;t have a JustViet password. Want to be able to log in with your email
        and a password too? We&apos;ll email you a link to create one.
      </p>
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <Button variant="outline" fullWidth={false} className="self-start px-6" onClick={handleSend} loading={sending}>
        Email Me a Link
      </Button>
    </div>
  );
}
