"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { logIn } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

type LoginFormProps = {
  onSuccess: () => void;
  onForgotPassword: (email: string) => void;
};

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await logIn(email, password);
      onSuccess();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => onForgotPassword(email)}
        className="self-end text-sm font-bold text-ink-500 hover:text-red-500"
      >
        Forgot password?
      </button>
      <Button type="submit" loading={submitting}>
        Log In
      </Button>
    </form>
  );
}
