"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

type ForgotPasswordFormProps = {
  initialEmail?: string;
  onBackToLogin: () => void;
};

/**
 * "Forgot password?" — always ends on the same message whether or not the
 * email has an account, so this form can't be used to find out who's
 * registered (see `requestPasswordReset`).
 */
export function ForgotPasswordForm({ initialEmail = "", onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError("Enter the email address you signed up with.");
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err, "reset-request"));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="text-4xl" aria-hidden="true">
          📬
        </span>
        <p className="font-semibold text-ink-700">
          If an account exists for <span className="text-ink-900">{email.trim()}</span>, we&apos;ve sent a link to
          reset the password. Check your inbox (and your spam folder).
        </p>
        <p className="text-sm text-ink-500">
          Signed up with Google? You can keep using &ldquo;Continue with Google&rdquo; — no password needed.
        </p>
        <Button type="button" variant="outline" onClick={onBackToLogin}>
          Back to Log In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm font-semibold text-ink-500">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldError}
      />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" loading={submitting}>
        Send Reset Link
      </Button>
      <button
        type="button"
        onClick={onBackToLogin}
        className="rounded text-sm font-bold text-ink-500 hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-100"
      >
        Back to Log In
      </button>
    </form>
  );
}
