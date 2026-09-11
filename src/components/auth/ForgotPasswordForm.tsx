"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { resetPassword } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

type ForgotPasswordFormProps = {
  initialEmail?: string;
  onBackToLogin: () => void;
};

export function ForgotPasswordForm({
  initialEmail = "",
  onBackToLogin,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Don't reveal whether an email is registered — show the same
      // success state for unknown accounts as for real ones.
      if (
        err instanceof Error &&
        "code" in err &&
        (err as { code?: string }).code === "auth/user-not-found"
      ) {
        setSent(true);
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-4xl" aria-hidden="true">
          📬
        </span>
        <p className="font-semibold text-ink-700">
          If an account exists for <span className="text-ink-900">{email}</span>,
          a password reset link is on its way. Check your inbox!
        </p>
        <Button type="button" variant="outline" onClick={onBackToLogin}>
          Back to Log In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-ink-500">
        Enter your email and we&apos;ll send you a link to reset your
        password.
      </p>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" loading={submitting}>
        Send Reset Link
      </Button>
      <button
        type="button"
        onClick={onBackToLogin}
        className="text-sm font-bold text-ink-500 hover:text-red-500"
      >
        Back to Log In
      </button>
    </form>
  );
}
