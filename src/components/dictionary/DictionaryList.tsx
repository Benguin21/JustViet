"use client";

import { useCallback, useSyncExternalStore, type RefObject } from "react";
import { AddToVocabButton } from "@/components/dictionary/AddToVocabButton";
import { Badge } from "@/components/ui/Badge";
import { briefDefinition, type SearchMatchKind } from "@/lib/dictionary/dictionary-index";
import type { DictionaryHeadword } from "@/lib/dictionary/types";

export type DictionaryListRow =
  | { type: "letter"; letter: string }
  | { type: "entry"; headword: DictionaryHeadword; match?: SearchMatchKind };

/**
 * Every row is exactly this tall (letter headers included), which is what
 * makes the windowed rendering below a few lines of arithmetic: row `i`
 * sits at `i * ROW_HEIGHT`, and only the rows near the viewport are
 * mounted — so the list stays fast at tens of thousands of words.
 */
export const ROW_HEIGHT = 72;
const OVERSCAN = 8;
const SERVER_WINDOW = "0:24";

type DictionaryListProps = {
  rows: DictionaryListRow[];
  containerRef: RefObject<HTMLDivElement | null>;
  srsCardIdFor: (key: string) => string | undefined;
  srsPending: boolean;
  highlightKey: string | null;
  onSelect: (headword: DictionaryHeadword) => void;
  onAddToVocab: (headword: DictionaryHeadword) => Promise<void>;
};

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function DictionaryList({
  rows,
  containerRef,
  srsCardIdFor,
  srsPending,
  highlightKey,
  onSelect,
  onAddToVocab,
}: DictionaryListProps) {
  // The visible window as a primitive "first:count" string, so the snapshot
  // is stable between scroll events (see the note on `useNow` in AGENTS.md
  // about uSES snapshots needing to be cached/stable values).
  const getSnapshot = useCallback(() => {
    const el = containerRef.current;
    if (!el) return SERVER_WINDOW;
    const top = el.getBoundingClientRect().top;
    const first = Math.max(0, Math.floor(-top / ROW_HEIGHT));
    const count = Math.ceil(window.innerHeight / ROW_HEIGHT) + 1;
    return `${first}:${count}`;
  }, [containerRef]);
  const windowKey = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_WINDOW);
  const [first, count] = windowKey.split(":").map(Number);
  const start = Math.max(0, first - OVERSCAN);
  const end = Math.min(rows.length, first + count + OVERSCAN);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: rows.length * ROW_HEIGHT }}
      role="list"
      aria-label="Dictionary words"
    >
      {rows.slice(start, end).map((row, offset) => {
        const index = start + offset;
        const style = { top: index * ROW_HEIGHT, height: ROW_HEIGHT };
        if (row.type === "letter") {
          return (
            <div
              key={`letter-${row.letter}`}
              style={style}
              className="absolute inset-x-0 flex items-end px-2 pb-2"
              role="presentation"
            >
              <span className="font-heading text-3xl font-extrabold text-red-500 uppercase">
                {row.letter}
              </span>
            </div>
          );
        }
        const { headword } = row;
        const highlighted = highlightKey === headword.key;
        return (
          <div
            key={headword.key}
            style={style}
            className="absolute inset-x-0 py-1"
            role="listitem"
          >
            <div
              className={`flex h-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 transition-colors ${
                highlighted
                  ? "border-yellow-400 bg-yellow-100"
                  : "border-transparent bg-surface hover:border-yellow-200 hover:bg-yellow-50"
              }`}
              onClick={() => onSelect(headword)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(headword);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${headword.headword}: ${briefDefinition(headword)}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-heading truncate text-lg leading-tight font-bold text-ink-900"
                    lang="vi"
                  >
                    {headword.headword}
                  </span>
                  {!headword.shared && <Badge tone="yellow">Mine</Badge>}
                  {row.match === "similar-spelling" && (
                    <span className="hidden text-xs font-semibold text-ink-300 sm:inline">
                      similar spelling
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-ink-500">{briefDefinition(headword)}</p>
              </div>
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <AddToVocabButton
                  size="sm"
                  cardId={srsCardIdFor(headword.key)}
                  pending={srsPending}
                  onAdd={() => onAddToVocab(headword)}
                  showViewLink={false}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
