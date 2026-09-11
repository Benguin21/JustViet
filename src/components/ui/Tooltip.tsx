"use client";

/** A small "?" hint that reveals an explanation on hover/focus — used next to advanced settings. */
export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        tabIndex={0}
        aria-label="More info"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-ink-300/30 text-[10px] font-bold text-ink-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-xl bg-ink-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
