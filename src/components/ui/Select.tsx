"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Omit when the field is already labeled by a wrapping component. */
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = "", children, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={`w-full rounded-xl border-2 bg-surface px-4 py-3 text-ink-900 focus:outline-none focus:ring-4 ${
          error
            ? "border-red-500 focus:ring-red-100"
            : "border-ink-300/60 focus:border-yellow-500 focus:ring-yellow-100"
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
});
