"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, id, className = "", rows = 2, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-bold tracking-wide text-ink-700 uppercase"
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full resize-none rounded-xl border-2 bg-surface px-4 py-3 text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-4 ${
            error
              ? "border-red-500 focus:ring-red-100"
              : "border-ink-300/60 focus:border-yellow-500 focus:ring-yellow-100"
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);
