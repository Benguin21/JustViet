"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  /** Extra element ids describing the field (e.g. a strength meter). */
  describedBy?: string;
};

/**
 * A password input with a show/hide toggle, styled like `TextField`. The
 * toggle is a real button (keyboard reachable, `aria-pressed`) and the
 * error is announced via `aria-describedby`.
 */
export function PasswordField({ label, error, describedBy, id, className = "", ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const describedByIds = [error ? `${inputId}-error` : null, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`w-full rounded-xl border-2 bg-surface py-3 pr-20 pl-4 text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-4 ${
            error
              ? "border-red-500 focus:ring-red-100"
              : "border-ink-300/60 focus:border-yellow-500 focus:ring-yellow-100"
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedByIds}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={inputId}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-bold tracking-wide text-ink-500 uppercase hover:bg-yellow-50 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-100"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
