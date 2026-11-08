"use client";

import { VIETNAMESE_ALPHABET } from "@/lib/dictionary/collation";

type LetterBarProps = {
  available: Set<string>;
  onJump: (letter: string) => void;
};

/** A–Y jump bar over the 29-letter Vietnamese alphabet; letters with no words are disabled. */
export function LetterBar({ available, onJump }: LetterBarProps) {
  return (
    <nav aria-label="Jump to letter" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 px-1 sm:min-w-0 sm:flex-wrap">
        {VIETNAMESE_ALPHABET.map((letter) => {
          const enabled = available.has(letter);
          return (
            <li key={letter}>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onJump(letter)}
                className="font-heading h-9 w-9 rounded-xl text-base font-bold text-ink-700 uppercase transition-colors hover:bg-yellow-100 hover:text-red-500 disabled:cursor-default disabled:text-ink-300/60 disabled:hover:bg-transparent"
                aria-label={`Jump to ${letter.toUpperCase()}`}
              >
                {letter}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
