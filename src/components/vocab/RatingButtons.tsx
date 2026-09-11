"use client";

import type { IntervalPreview } from "@/lib/vocab/srs";
import type { CardRating } from "@/lib/vocab/types";

const RATING_ORDER: CardRating[] = ["again", "hard", "good", "easy"];

const RATING_LABEL: Record<CardRating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const RATING_SHORTCUT: Record<CardRating, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4",
};

const RATING_CLASSES: Record<CardRating, string> = {
  again: "bg-red-500 border-red-700 text-white hover:bg-red-400",
  hard: "bg-yellow-400 border-yellow-600 text-ink-900 hover:bg-yellow-300",
  good: "bg-success border-success-dark text-white hover:brightness-105",
  easy: "bg-sky-400 border-sky-600 text-white hover:bg-sky-300",
};

type RatingButtonsProps = {
  previews: Record<CardRating, IntervalPreview>;
  onRate: (rating: CardRating) => void;
  disabled?: boolean;
};

/** The four SRS rating buttons, each showing the resulting interval and its number-key shortcut. */
export function RatingButtons({ previews, onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {RATING_ORDER.map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
          className={`flex flex-col items-center gap-0.5 rounded-2xl border-b-4 px-3 py-3 font-heading font-bold uppercase tracking-wide transition-all active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0 ${RATING_CLASSES[rating]}`}
        >
          <span className="text-sm">{RATING_LABEL[rating]}</span>
          <span className="text-xs font-semibold normal-case opacity-90">
            {previews[rating].label}
          </span>
          <span className="mt-0.5 hidden text-[10px] font-semibold normal-case opacity-70 sm:block">
            key {RATING_SHORTCUT[rating]}
          </span>
        </button>
      ))}
    </div>
  );
}

export { RATING_SHORTCUT };
