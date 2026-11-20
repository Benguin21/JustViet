"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TextField } from "@/components/ui/TextField";
import type { Curriculum, GrammarLesson } from "@/lib/grammar/curriculum";
import { countCompleted } from "@/lib/grammar/progress";
import { searchLessons } from "@/lib/grammar/search";
import { Lotus } from "./Lotus";

/**
 * The ☰ directory: every grammar point, grouped by level, with a search box (accent-insensitive,
 * see search.ts). Picking one opens its quick grammar guide once that's built, and its lesson card
 * until then (the page decides, through `onPick`).
 */
export function GrammarDirectory({
  curriculum,
  completed,
  onPick,
  onClose,
}: {
  curriculum: Curriculum;
  completed: ReadonlySet<string> | null;
  onPick: (lesson: GrammarLesson) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (query.trim() ? searchLessons(curriculum.lessons, query) : null), [curriculum, query]);

  useEffect(() => {
    input.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex bg-ink-900/40" onClick={onClose} role="presentation">
      <div
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grammar-directory-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink-300/20 px-5 py-4">
          <h2 id="grammar-directory-title" className="font-heading text-xl font-extrabold text-ink-900">
            All grammar
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink-500 hover:bg-yellow-50 hover:text-ink-900"
          >
            <span className="block px-2 text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="border-b-2 border-ink-300/20 px-5 py-3">
          <TextField
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grammar, e.g. của or questions"
            aria-label="Search grammar"
            autoComplete="off"
          />
          {results ? (
            <p className="mt-2 text-xs font-bold text-ink-500" aria-live="polite">
              {results.length === 1 ? "1 lesson" : `${results.length} lessons`}
            </p>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {results ? (
            results.length ? (
              <ul>
                {results.map((l) => (
                  <Item key={l.id} lesson={l} bloom={completed?.has(l.id) ?? false} showLevel onPick={onPick} />
                ))}
              </ul>
            ) : (
              <p className="px-2 py-6 text-center font-semibold text-ink-500">No grammar matches “{query.trim()}”.</p>
            )
          ) : (
            curriculum.byLevel.filter((g) => g.lessons.length).map(({ level, lessons }) => (
              <section key={level.id} className="mb-4" aria-labelledby={`dir-${level.id}`}>
                <h3 id={`dir-${level.id}`} className="sticky top-0 z-10 flex items-baseline justify-between bg-surface px-2 py-1.5 font-heading text-base font-extrabold text-ink-900">
                  {level.name}
                  <span className="sr-only">, </span>
                  <span className="text-xs font-bold text-ink-500">
                    {completed ? `${countCompleted(lessons, completed)} of ${lessons.length}` : `${lessons.length} lessons`}
                  </span>
                </h3>
                <ul>
                  {lessons.map((l) => (
                    <Item key={l.id} lesson={l} bloom={completed?.has(l.id) ?? false} onPick={onPick} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ lesson, bloom, showLevel = false, onPick }: { lesson: GrammarLesson; bloom: boolean; showLevel?: boolean; onPick: (l: GrammarLesson) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(lesson)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
      >
        <Lotus bloom={bloom} size={24} className="shrink-0" />
        <span className="w-7 shrink-0 text-right text-xs font-bold text-ink-300" aria-hidden="true">
          {lesson.number}
        </span>
        <span className="flex-1 font-bold text-ink-700">
          {lesson.title}
          {showLevel ? <span className="block text-xs font-bold text-ink-500">{lesson.level.name}</span> : null}
        </span>
        {bloom ? <span className="sr-only">, finished</span> : null}
      </button>
    </li>
  );
}
