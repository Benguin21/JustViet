"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AddToVocabButtonProps = {
  /** The user's SRS card for this word, if they already have one. */
  cardId?: string;
  onAdd: () => Promise<void>;
  /** True while the user's vocab list is still loading (the "already added?" answer isn't known yet). */
  pending?: boolean;
  size?: "md" | "sm";
  /** Show the "View in Vocab" link next to the completed state. */
  showViewLink?: boolean;
};

/**
 * The two-state "Add to Vocabulary" control: an action button until the
 * word is in the user's SRS, then a completed state (with a link to the
 * card) that can't add it again. Reusable wherever a word can be studied —
 * the Dictionary list and detail view now, an in-lesson popup later.
 */
export function AddToVocabButton({
  cardId,
  onAdd,
  pending = false,
  size = "md",
  showViewLink = true,
}: AddToVocabButtonProps) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (adding || cardId) return; // never double-add
    setAdding(true);
    setError(null);
    try {
      await onAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  if (cardId) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`font-heading inline-flex items-center gap-1.5 rounded-2xl bg-success/15 font-bold tracking-wide text-success-dark uppercase ${
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm"
          }`}
          role="status"
        >
          <span aria-hidden="true">✓</span>
          {size === "sm" ? "In Vocab" : "Added to Vocabulary"}
        </span>
        {showViewLink && (
          <Link
            href={`/vocab-srs?card=${encodeURIComponent(cardId)}`}
            className="text-sm font-bold text-red-500 underline-offset-2 hover:underline"
          >
            View in Vocab →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size={size}
        variant={size === "sm" ? "outline" : "primary"}
        fullWidth={false}
        loading={adding}
        disabled={pending}
        onClick={(e) => {
          e.stopPropagation();
          void handleClick();
        }}
        className={size === "sm" ? "whitespace-nowrap" : "px-6"}
      >
        {size === "sm" ? "+ Add" : "+ Add to Vocabulary"}
      </Button>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
