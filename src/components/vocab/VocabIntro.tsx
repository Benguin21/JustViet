"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TeacherGuide, type TeacherGuideStep } from "@/components/teachers/TeacherGuide";
import { useNow } from "@/lib/useNow";
import { newCardRatingLabels, reviewLadder } from "@/lib/vocab/tutorial";
import { RATINGS, type CardRating, type SrsSettings } from "@/lib/vocab/types";

type VocabIntroProps = {
  settings: SrsSettings;
  /** The last step's button: what to do next, e.g. "Add my first card" or "Start studying". */
  finish: { label: string; onClick: () => void };
  /** Skipped or closed. */
  onClose: () => void;
};

/**
 * The Vocabulary page's first-visit tutorial: Cô Tươi and Thầy Vinh explain what a Vocab SRS
 * (Spaced Repetition System) is, how cards get in, and how to study and rate them, with a
 * practice card to try. Shown once (see useTutorial) and again from "How it works". The example
 * intervals come from the learner's own settings through the real scheduler.
 */
export function VocabIntro({ settings, finish, onClose }: VocabIntroProps) {
  const now = useNow();
  const ladder = useMemo(() => reviewLadder(settings, 5, now), [settings, now]);
  const ratingLabels = useMemo(() => newCardRatingLabels(settings, now), [settings, now]);

  const steps: TeacherGuideStep[] = [
    {
      who: "tuoi",
      expr: "welcome",
      lead: "Xin chào!",
      text: "Welcome to Vocabulary, your own Vocab SRS: a Spaced Repetition System. This is where you collect Vietnamese words and make them stick for good!",
      visual: <SampleCards />,
    },
    {
      who: "vinh",
      expr: "explain",
      text: "Here’s the idea. We forget new words quickly, but every time you remember one, it stays with you longer. So your SRS brings each card back just before you’d forget it, and waits longer after every review.",
      visual: <Ladder steps={ladder.map((s) => s.label)} />,
    },
    {
      who: "tuoi",
      expr: "explain",
      text: "Each card has a Vietnamese word or phrase on the front and its meaning on the back. Make your own with Add Card, paste a list from a spreadsheet with Import Cards, or add words straight from the Dictionary.",
      visual: <WaysToAdd />,
    },
    {
      who: "vinh",
      expr: "explain",
      text: "Let’s try one! Read the Vietnamese and think of what it means, then show the answer. Rate yourself honestly: each button says when you’ll see the card again.",
      visual: <PracticeCard labels={ratingLabels} />,
    },
    {
      who: "tuoi",
      expr: "encourage",
      text: "Come back each day to study the cards that are due. A few minutes every day works better than one long cram! Every card you study earns XP, and new words count toward your daily Vocabulary goal, so you can feed Rồng Con at Home.",
      visual: <DailyHabit />,
    },
  ];

  return <TeacherGuide label="How Vocabulary works" steps={steps} onClose={onClose} finish={finish} />;
}

const SAMPLES = [
  { front: "cảm ơn", back: "thank you" },
  { front: "ăn", back: "to eat" },
  { front: "đẹp", back: "beautiful" },
];

function SampleCards() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Example cards">
      {SAMPLES.map((s, i) => (
        <li
          key={s.front}
          className="flex min-w-[6.5rem] flex-col items-center rounded-2xl border-2 border-[#f3dcc8] bg-white px-3 py-2 shadow-[0_3px_0_rgba(74,47,34,0.06)]"
          style={{ rotate: `${(i - 1) * 2}deg` }}
        >
          <span className="font-heading text-lg leading-6 font-extrabold text-ink-900" lang="vi">
            {s.front}
          </span>
          <span className="text-xs font-bold text-ink-500">{s.back}</span>
        </li>
      ))}
    </ul>
  );
}

/** "If you keep remembering a word": a staircase of the waits between its reviews. */
function Ladder({ steps }: { steps: string[] }) {
  return (
    <figure className="m-0">
      <figcaption className="mb-1.5 text-xs font-extrabold tracking-wide text-[#6b4a38] uppercase">
        If you keep remembering a word, it comes back in…
      </figcaption>
      <ol className="flex items-end gap-1.5">
        {steps.map((label, i) => (
          <li key={i} className="flex flex-1 flex-col items-center gap-1">
            <span
              className="w-full rounded-t-lg bg-red-300"
              style={{ height: `${10 + i * 9}px`, opacity: 0.55 + i * 0.1 }}
              aria-hidden="true"
            />
            <span className="text-center text-[11px] leading-tight font-extrabold whitespace-nowrap text-ink-700">
              {label}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

const ADD_ICONS = {
  add: "M12 5v14 M5 12h14",
  import: "M4 5h16v14H4z M4 10h16 M10 5v14",
  dictionary: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13 M15.5 15.5L20 20",
};

function WaysToAdd() {
  const ways = [
    { label: "Add Card", icon: ADD_ICONS.add, tint: "#ffe0da", ink: "#b53722" },
    { label: "Import Cards", icon: ADD_ICONS.import, tint: "#e6f2ea", ink: "#2f6b55" },
    { label: "Dictionary", icon: ADD_ICONS.dictionary, tint: "#fdf0cf", ink: "#8a5a12" },
  ];
  return (
    <span className="guide-chips" style={{ marginTop: 0 }}>
      {ways.map((w) => (
        <span key={w.label} className="guide-chip">
          <span className="guide-chip-icon" style={{ background: w.tint }}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d={w.icon} fill="none" stroke={w.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {w.label}
        </span>
      ))}
    </span>
  );
}

const RATING_NAME: Record<CardRating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

const RATING_STYLE: Record<CardRating, string> = {
  again: "bg-red-500 border-red-700 text-white",
  hard: "bg-yellow-400 border-yellow-600 text-ink-900",
  good: "bg-success border-success-dark text-white",
  easy: "bg-sky-400 border-sky-600 text-white",
};

function ratingFeedback(rating: CardRating, label: string): string {
  switch (rating) {
    case "again":
      return `Không sao! Forgotten words come back soon, in ${label} here, and keep coming back until they stick.`;
    case "hard":
      return `Hard means you got it, but only just. It comes back in ${label}, a little sooner than Good.`;
    case "good":
      return `Giỏi quá! Good is the everyday answer when you remember. It comes back in ${label}, then after longer and longer waits.`;
    case "easy":
      return `Easy means you knew it instantly, so it waits ${label} before you see it again.`;
  }
}

/** A practice flashcard: reveal it, rate it, and see what that rating would do. Nothing is saved. */
function PracticeCard({ labels }: { labels: Record<CardRating, string> }) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<CardRating | null>(null);
  const firstRating = useRef<HTMLButtonElement>(null);
  // "Show answer" goes away once pressed, so focus moves on to the rating buttons.
  useEffect(() => {
    if (revealed) firstRating.current?.focus({ preventScroll: true });
  }, [revealed]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-[#f3dcc8] bg-white px-4 py-3 text-center">
        <span className="font-heading text-2xl leading-8 font-extrabold text-ink-900" lang="vi">
          cảm ơn
        </span>
        {revealed ? (
          <span className="border-t-2 border-dashed border-ink-300/30 pt-1 text-base font-bold text-ink-700">
            thank you
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-1 rounded-xl border-b-4 border-red-700 bg-red-500 px-4 py-1.5 font-heading text-sm font-bold tracking-wide text-white uppercase active:translate-y-0.5 active:border-b-2"
          >
            Show answer
          </button>
        )}
      </div>
      {revealed && (
        <>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Rate how well you knew it">
            {RATINGS.map((r) => (
              <button
                key={r}
                ref={r === "again" ? firstRating : undefined}
                type="button"
                onClick={() => setRated(r)}
                aria-pressed={rated === r}
                className={`flex flex-col items-center rounded-xl border-b-4 px-1 py-1.5 font-heading text-xs font-bold tracking-wide uppercase transition-transform active:translate-y-0.5 active:border-b-2 ${RATING_STYLE[r]} ${
                  rated && rated !== r ? "opacity-50" : ""
                }`}
              >
                {RATING_NAME[r]}
                <span className="text-[11px] font-semibold normal-case opacity-90">{labels[r]}</span>
              </button>
            ))}
          </div>
          <p className="m-0 min-h-[2.5rem] text-sm leading-5 font-bold text-[#6b4a38]" aria-live="polite">
            {rated ? ratingFeedback(rated, labels[rated]) : "Now pick how well you knew it."}
          </p>
        </>
      )}
    </div>
  );
}

function DailyHabit() {
  const items = [
    { emoji: "📅", label: "Study what’s due" },
    { emoji: "⭐", label: "Earn XP" },
    { emoji: "🐉", label: "Feed Rồng Con" },
  ];
  return (
    <span className="guide-chips" style={{ marginTop: 0 }}>
      {items.map((it) => (
        <span key={it.label} className="guide-chip" style={{ paddingLeft: 10 }}>
          <span aria-hidden="true">{it.emoji}</span>
          {it.label}
        </span>
      ))}
    </span>
  );
}
