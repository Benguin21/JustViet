"use client";

import { AVATAR_COLORS } from "@/lib/community/avatar";

/** The avatar palette as a radio group (arrow keys move between colours). */
export function ColorPicker({ value, onChange, name = "avatar-color" }: { value: string; onChange: (color: string) => void; name?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink-700 uppercase">Avatar colour</legend>
      <div className="flex flex-wrap gap-2">
        {AVATAR_COLORS.map((c) => (
          <label key={c.id} className="relative cursor-pointer" title={c.label}>
            <input
              type="radio"
              name={name}
              value={c.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
              className="peer sr-only"
              aria-label={c.label}
            />
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white ring-offset-2 peer-focus-visible:ring-4 peer-focus-visible:ring-yellow-300 ${c.className} ${
                value === c.id ? "ring-4 ring-ink-900" : ""
              }`}
              aria-hidden="true"
            >
              {value === c.id ? "✓" : ""}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
