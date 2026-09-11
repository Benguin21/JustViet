"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RatingButtons, RATING_SHORTCUT } from "@/components/vocab/RatingButtons";
import { previewIntervals } from "@/lib/vocab/srs";
import type { CardRating, SrsSettings, VocabCard } from "@/lib/vocab/types";

type StudySessionProps = {
  queue: VocabCard[];
  settings: SrsSettings;
  onRate: (card: VocabCard, rating: CardRating) => Promise<VocabCard>;
  onFinish: () => void;
};

const SHORTCUT_TO_RATING: Record<string, CardRating> = Object.fromEntries(
  (Object.entries(RATING_SHORTCUT) as [CardRating, string][]).map(([rating, key]) => [
    key,
    rating,
  ]),
);

/**
 * The flashcard study screen: shows the front of the due queue's head
 * card, reveals the back on demand, then hands off to `RatingButtons`.
 * Cards that are still mid-learning after a review get appended back
 * onto the local queue so they resurface later in the same session
 * (matching how short learning steps behave in Anki); fully-graduated
 * cards leave the queue for good.
 */
export function StudySession({ queue: initialQueue, settings, onRate, onFinish }: StudySessionProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [initialTotal] = useState(initialQueue.length);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];

  const previews = useMemo(() => {
    if (!current) return null;
    return previewIntervals(current, settings);
  }, [current, settings]);

  async function handleRate(rating: CardRating) {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await onRate(current, rating);
      setReviewedCount((c) => c + 1);
      setQueue((prev) => {
        const rest = prev.slice(1);
        const stillInFlight = updated.state === "learning" || updated.state === "relearning";
        return stillInFlight ? [...rest, updated] : rest;
      });
      setShowAnswer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (busy || !current) return;
      if (event.key === " " || event.key === "Enter") {
        if (!showAnswer) {
          event.preventDefault();
          setShowAnswer(true);
        }
        return;
      }
      if (showAnswer && event.key in SHORTCUT_TO_RATING) {
        event.preventDefault();
        void handleRate(SHORTCUT_TO_RATING[event.key]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Intentionally no dependency array: this re-binds on every render so
    // the listener always closes over the latest current/busy/showAnswer.
  });

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-ink-300/20 px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden="true">
          🎉
        </span>
        <h3 className="font-heading text-2xl font-extrabold text-ink-900">All caught up!</h3>
        <p className="font-semibold text-ink-500">
          {reviewedCount > 0
            ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? "" : "s"} this session.`
            : "No cards are due right now."}
        </p>
        <Button onClick={onFinish} fullWidth={false} className="px-8">
          Back to Cards
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="flex items-center justify-between text-sm font-bold text-ink-500">
        <span>
          {queue.length} card{queue.length === 1 ? "" : "s"} left
        </span>
        <span>{reviewedCount} reviewed</span>
        <button type="button" onClick={onFinish} className="text-ink-500 hover:text-red-500">
          End session
        </button>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-yellow-100">
        <div
          className="h-full bg-red-500 transition-all"
          style={{
            width: `${Math.min(100, (reviewedCount / Math.max(1, initialTotal)) * 100)}%`,
          }}
        />
      </div>

      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-ink-300/20 bg-surface px-6 py-10 text-center shadow-[0_6px_0_rgba(74,47,34,0.06)]">
        <Badge tone="gray">{current.partOfSpeech}</Badge>
        <p className="font-heading text-4xl font-extrabold text-ink-900">{current.front}</p>

        {showAnswer && (
          <div className="flex flex-col items-center gap-2 border-t-2 border-dashed border-ink-300/30 pt-4">
            <p className="text-2xl font-bold text-ink-700">{current.back}</p>
            {current.exampleSentence && (
              <p className="max-w-sm text-ink-500 italic">“{current.exampleSentence}”</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {!showAnswer ? (
        <Button onClick={() => setShowAnswer(true)} className="mx-auto max-w-xs" fullWidth>
          Show Answer
        </Button>
      ) : (
        previews && <RatingButtons previews={previews} onRate={handleRate} disabled={busy} />
      )}

      <p className="text-center text-xs font-semibold text-ink-300">
        {showAnswer ? "Press 1-4 to rate" : "Press Space to reveal"}
      </p>
    </div>
  );
}
