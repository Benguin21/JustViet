"use client";

import { useId, useState, type KeyboardEvent } from "react";

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

/** A labeled input that turns Enter/comma-separated text into removable tag pills. */
export function TagInput({ label, value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function commitDraft() {
    const tag = draft.trim();
    setDraft("");
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
        {label}
      </label>
      <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border-2 border-ink-300/60 bg-surface px-3 py-2 focus-within:border-yellow-500 focus-within:ring-4 focus-within:ring-yellow-100">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-bold text-ink-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-ink-500 hover:text-red-600"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={value.length === 0 ? (placeholder ?? "Add a tag and press Enter") : ""}
          className="min-w-[8ch] flex-1 bg-transparent py-1 text-ink-900 placeholder:text-ink-300 focus:outline-none"
        />
      </div>
    </div>
  );
}
