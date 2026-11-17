"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/auth/PasswordField";
import { logIn } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

type LoginFormProps = {
  initialEmail?: string;
  /** Runs an auth action while the page holds off redirecting (see the login page). */
  run: <T>(action: () => Promise<T>) => Promise<T>;
  /** Called after a successful login, before the page moves on (e.g. to link Google). */
  onLoggedIn?: () => Promise<void>;
  onForgotPassword: (email: string) => void;
};

export function LoginForm({ initialEmail = "", run, onLoggedIn, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await run(async () => {
        await logIn(email, password);
        await onLoggedIn?.();
      });
    } catch (err) {
      setError(friendlyAuthError(err, "login"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => onForgotPassword(email)}
        className="self-end rounded text-sm font-bold text-ink-500 hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-100"
      >
        Forgot password?
      </button>
      <Button type="submit" loading={submitting}>
        Log In
      </Button>
    </form>
  );
}
