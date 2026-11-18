"use client";

import { useId, useRef, useState } from "react";
import { RichText } from "./RichText";

/**
 * A textarea for Community text with a small formatting toolbar (it inserts
 * the markup, e.g. **bold**), a Write/Preview switch, and a character
 * counter that counts the way the database does.
 */
export function RichTextEditor({
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const length = value.normalize("NFC").trim().length;
  const over = length > max;

  function wrap(before: string, after = before, placeholderText = "text") {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function bullet() {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const next = value.slice(0, start) + "- " + value.slice(start);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(el.selectionStart + 2, el.selectionStart + 2);
    });
  }

  const tool =
    "rounded-lg px-2.5 py-1 text-sm font-bold text-ink-700 hover:bg-yellow-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-bold tracking-wide text-ink-700 uppercase"}>
          {label}
        </label>
        <div className="flex rounded-xl border-2 border-ink-300/40 p-0.5 text-xs font-bold" role="group" aria-label="Write or preview">
          {(["Write", "Preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={(mode === "Preview") === preview}
              onClick={() => setPreview(mode === "Preview")}
              className={`rounded-lg px-2.5 py-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
                (mode === "Preview") === preview ? "bg-yellow-100 text-ink-900" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className={`rounded-xl border-2 bg-surface ${error || over ? "border-red-500" : "border-ink-300/60 focus-within:border-yellow-500"}`}>
        <div className="flex flex-wrap gap-0.5 border-b-2 border-ink-300/20 px-1.5 py-1" role="toolbar" aria-label="Formatting">
          <button type="button" className={tool} disabled={preview} onClick={() => wrap("**")} aria-label="Bold">
            B
          </button>
          <button type="button" className={`${tool} italic`} disabled={preview} onClick={() => wrap("*")} aria-label="Italic">
            I
          </button>
          <button type="button" className={`${tool} font-mono`} disabled={preview} onClick={() => wrap("`", "`", "code")} aria-label="Inline code">
            {"</>"}
          </button>
          <button type="button" className={tool} disabled={preview} onClick={bullet} aria-label="Bullet list">
            • List
          </button>
          <button type="button" className={tool} disabled={preview} onClick={() => wrap("[", "](https://)", "link text")} aria-label="Link">
            Link
          </button>
        </div>
        {preview ? (
          <div className="min-h-24 px-4 py-3" aria-live="polite">
            {value.trim() ? <RichText text={value} /> : <p className="text-ink-300">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            value={value}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error) || over}
            aria-describedby={`${id}-help`}
            className="block w-full resize-y rounded-b-xl bg-transparent px-4 py-3 text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
        )}
      </div>
      <div id={`${id}-help`} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs font-semibold text-ink-500">
        <span>
          **bold**, *italic*, `code`, - list, [text](https://…)
        </span>
        <span className={over ? "font-bold text-red-600" : length > 0 && length < min ? "text-ink-700" : ""} aria-live="polite">
          {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
          {length > 0 && length < min ? ` · at least ${min}` : ""}
        </span>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
