"use client";

import { useId } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  PASSWORD_MIN_LENGTH,
  passwordStrength,
  type PasswordContext,
  type StrengthScore,
} from "@/lib/auth/password-rules";

const BAR_COLOR: Record<StrengthScore, string> = {
  0: "bg-red-400",
  1: "bg-red-400",
  2: "bg-yellow-500",
  3: "bg-success",
  4: "bg-success-dark",
};

type NewPasswordFieldsProps = {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  errors?: { password?: string; confirm?: string };
  /** The account's email/name, so the meter can flag passwords built from them. */
  context?: PasswordContext;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * "Choose a password" + "Confirm password" with a live strength meter.
 * Used by signup, the settings page and the reset-password link page, so
 * all three look and behave the same. The meter shows its level in words
 * as well as colour and bar count.
 */
export function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  errors = {},
  context,
  label = "Password",
  disabled,
  autoFocus,
}: NewPasswordFieldsProps) {
  const meterId = useId();
  const strength = passwordStrength(password, context);
  const longEnough = Array.from(password).length >= PASSWORD_MIN_LENGTH;
  const confirmMismatch = confirm.length > 0 && confirm !== password && !errors.confirm;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <PasswordField
          label={label}
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          error={errors.password}
          describedBy={meterId}
          disabled={disabled}
          autoFocus={autoFocus}
          required
        />
        <div id={meterId} className="flex flex-col gap-1.5" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => {
              // A rejected password still lights the first bar, so "Too weak" is visible.
              const filled = password && (strength.score >= step || (strength.score === 0 && step === 1));
              return (
                <span
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${filled ? BAR_COLOR[strength.score] : "bg-ink-300/30"}`}
                />
              );
            })}
          </div>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs font-semibold text-ink-500">
            <span>
              <span aria-hidden="true">{longEnough ? "✓" : "•"}</span> At least {PASSWORD_MIN_LENGTH} characters
            </span>
            {password && <span className="text-ink-700">Strength: {strength.label}</span>}
          </p>
          {password && strength.hint && <p className="text-xs text-ink-500">{strength.hint}</p>}
        </div>
      </div>
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => onConfirmChange(e.target.value)}
        error={errors.confirm ?? (confirmMismatch && confirm.length >= password.length ? "Passwords don't match." : undefined)}
        disabled={disabled}
        required
      />
    </div>
  );
}
