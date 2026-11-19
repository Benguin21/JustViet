"use client";

import { useId } from "react";
import { linkProblem } from "@/lib/community/limits";

/**
 * A plain-text box for Community writing: no formatting and no links. It
 * warns as soon as the text contains a link or web address (posting would
 * be refused), and its character counter counts the way the database does.
 */
export function TextEditor({
  label,
  value,
  onChange,
  max,
  min = 1,
  rows = 6,
  placeholder,
  error,
  autoFocus = false,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  min?: number;
  rows?: number;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  const length = value.normalize("NFC").trim().length;
  const over = length > max;
  const problem = error ?? linkProblem(value) ?? undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-bold tracking-wide text-ink-700 uppercase"}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(problem) || over}
        aria-describedby={`${id}-help${problem ? ` ${id}-error` : ""}`}
        className={`block w-full resize-y rounded-xl border-2 bg-surface px-4 py-3 text-ink-900 placeholder:text-ink-300 focus:ring-4 focus:outline-none ${
          problem || over ? "border-red-500 focus:ring-red-100" : "border-ink-300/60 focus:border-yellow-500 focus:ring-yellow-100"
        }`}
      />
      <div id={`${id}-help`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs font-semibold text-ink-500">
        <span>Plain text only, no links.</span>
        <span className={over ? "font-bold text-red-600" : length > 0 && length < min ? "text-ink-700" : ""} aria-live="polite">
          {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
          {length > 0 && length < min ? ` · at least ${min}` : ""}
        </span>
      </div>
      {problem && (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
