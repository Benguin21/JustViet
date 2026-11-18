"use client";

import type { VoteValue } from "@/lib/community/types";

/**
 * Upvote / score / downvote. Your vote shows by shape (a filled arrow) and
 * `aria-pressed` as well as colour; the score stays neutral even when
 * negative. `disabledReason` explains why voting isn't possible (your own
 * post, signed-out, …).
 */
export function VoteControls({
  score,
  value,
  onVote,
  busy = false,
  disabledReason,
  label,
}: {
  score: number;
  value: VoteValue;
  onVote: (clicked: 1 | -1) => void;
  busy?: boolean;
  disabledReason?: string;
  /** What's being voted on, for screen readers ("this answer"). */
  label: string;
}) {
  const disabled = busy || Boolean(disabledReason);
  const button =
    "flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div role="group" aria-label={`Votes on ${label}`} className="flex shrink-0 flex-col items-center gap-1" title={disabledReason}>
      <button
        type="button"
        aria-pressed={value === 1}
        aria-label={`Upvote ${label}`}
        disabled={disabled}
        onClick={() => onVote(1)}
        className={`${button} ${value === 1 ? "border-red-500 bg-red-500 text-white" : "border-ink-300/60 bg-surface text-ink-500 hover:border-red-300 hover:text-red-500"}`}
      >
        <Arrow up filled={value === 1} />
      </button>
      <span className="font-heading min-w-8 text-center text-lg font-extrabold text-ink-900" aria-live="polite">
        <span className="sr-only">Score: </span>
        {score}
      </span>
      <button
        type="button"
        aria-pressed={value === -1}
        aria-label={`Downvote ${label}`}
        disabled={disabled}
        onClick={() => onVote(-1)}
        className={`${button} ${value === -1 ? "border-ink-700 bg-ink-700 text-white" : "border-ink-300/60 bg-surface text-ink-500 hover:border-ink-500 hover:text-ink-900"}`}
      >
        <Arrow filled={value === -1} />
      </button>
    </div>
  );
}

function Arrow({ up = false, filled }: { up?: boolean; filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" className={up ? "" : "rotate-180"}>
      <path
        d="M10 3 L17 11 H13 V17 H7 V11 H3 Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
