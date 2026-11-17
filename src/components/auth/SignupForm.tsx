"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { signUp } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";
import { validateNewPassword } from "@/lib/auth/new-password";

type SignupFormProps = {
  run: <T>(action: () => Promise<T>) => Promise<T>;
  /** Called once the account exists, before the page moves on (new accounts go to Home). */
  onCreated?: () => void;
};

type FieldErrors = { name?: string; email?: string; password?: string; confirm?: string };

export function SignupForm({ run, onCreated }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = "Enter your name.";
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "That email address doesn't look right.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const check = await validateNewPassword(password, confirmPassword);
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      setSubmitting(false);
      return;
    }

    try {
      // The page moves on once the account exists and the verification email is sent.
      await run(async () => {
        await signUp(email, password, name);
        onCreated?.();
      });
    } catch (err) {
      setError(friendlyAuthError(err, "signup"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        label="Name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
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
      <NewPasswordFields
        password={password}
        confirm={confirmPassword}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirmPassword}
        errors={{ password: errors.password, confirm: errors.confirm }}
        context={{ email, name }}
      />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <p className="text-xs text-ink-500">
        We&apos;ll email you a link to verify your address. We also check new passwords against known data
        breaches without ever sending your password anywhere.
      </p>
      <Button type="submit" loading={submitting}>
        Create Account
      </Button>
    </form>
  );
}
