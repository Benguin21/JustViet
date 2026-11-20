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
 * Like Anki's "learn ahead limit": a card still in its learning steps comes back later in the
 * same session only if its next step is due within this long. A longer step (say "1h" or "1d")
 * means the card waits for a later session instead of being shown again straight away.
 */
const LEARN_AHEAD_MS = 20 * 60 * 1000;

/** True when a key press belongs to something else on the page (an open dialog, a text box). */
function keyBelongsElsewhere(event: KeyboardEvent): boolean {
  if (document.querySelector('[aria-modal="true"]')) return true;
  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * The flashcard study screen: shows the front of the due queue's head
 * card, reveals the back on demand, then hands off to `RatingButtons`.
 * Cards that are still mid-learning after a review get appended back
 * onto the local queue so they resurface later in the same session
 * (matching how short learning steps behave in Anki, within
 * LEARN_AHEAD_MS); fully-graduated cards leave the queue for good.
 */
export function StudySession({ queue: initialQueue, settings, onRate, onFinish }: StudySessionProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [initialTotal] = useState(initialQueue.length);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0];
  // Each card is in the queue at most once, so the cards that have left it are the ones done.
  const finishedCount = Math.max(0, initialTotal - queue.length);

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
      const ratedAt = Date.now();
      setReviewedCount((c) => c + 1);
      setQueue((prev) => {
        const rest = prev.slice(1);
        const stillInFlight = updated.state === "learning" || updated.state === "relearning";
        return stillInFlight && updated.due - ratedAt <= LEARN_AHEAD_MS ? [...rest, updated] : rest;
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
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (keyBelongsElsewhere(event)) return;
      if (event.key === " " || event.key === "Enter") {
        // Let Space/Enter press a focused button or link (like "End session") as usual.
        if (event.target instanceof Element && event.target.closest("button, a[href]")) return;
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

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-yellow-100"
        role="progressbar"
        aria-label="Session progress"
        aria-valuemin={0}
        aria-valuemax={initialTotal}
        aria-valuenow={finishedCount}
      >
        <div
          className="h-full bg-red-500 transition-all"
          style={{
            width: `${Math.min(100, (finishedCount / Math.max(1, initialTotal)) * 100)}%`,
          }}
        />
      </div>

      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-ink-300/20 bg-surface px-6 py-10 text-center shadow-[0_6px_0_rgba(74,47,34,0.06)]">
        {current.partOfSpeech && <Badge tone="gray">{current.partOfSpeech}</Badge>}
        <p className="font-heading text-4xl font-extrabold text-ink-900" lang="vi">
          {current.front}
        </p>

        {showAnswer && (
          <div className="flex flex-col items-center gap-2 border-t-2 border-dashed border-ink-300/30 pt-4">
            {current.pronunciation && (
              <p className="text-sm font-semibold text-ink-500">/{current.pronunciation}/</p>
            )}
            <p className="text-2xl font-bold text-ink-700">{current.back}</p>
            {current.exampleSentence && (
              <p className="max-w-sm text-ink-500 italic" lang="vi">
                “{current.exampleSentence}”
              </p>
            )}
            {current.notes && <p className="max-w-sm text-sm text-ink-500">{current.notes}</p>}
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
