"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";
import {
  DictionaryList,
  ROW_HEIGHT,
  type DictionaryListRow,
} from "@/components/dictionary/DictionaryList";
import { EntryDetailModal } from "@/components/dictionary/EntryDetailModal";
import { LetterBar } from "@/components/dictionary/LetterBar";
import { WordFormModal, type WordFormMode } from "@/components/dictionary/WordFormModal";
import { useDictionary } from "@/lib/dictionary/useDictionary";
import { cardInputFromHeadword, findSrsCard } from "@/lib/dictionary/srs-link";
import { headwordKey } from "@/lib/dictionary/normalize";
import { useVocabData } from "@/lib/vocab/useVocabData";
import { useToast } from "@/lib/useToast";
import type { DictionaryHeadword } from "@/lib/dictionary/types";

export default function DictionaryPage() {
  // useSearchParams (for ?word= deep links) needs a Suspense boundary in
  // production builds — see node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
  return (
    <Suspense fallback={<LoadingState />}>
      <DictionaryPageContent />
    </Suspense>
  );
}

function LoadingState({ message }: { message?: string | null }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
        aria-hidden="true"
      />
      {message && <p className="max-w-sm text-center text-sm font-semibold text-red-600">{message}</p>}
    </main>
  );
}

/** Scrolls the window so list row `rowIndex` sits just below the sticky search toolbar. */
function scrollToRow(list: HTMLElement | null, toolbar: HTMLElement | null, rowIndex: number) {
  if (!list || rowIndex < 0) return;
  const toolbarHeight = toolbar?.getBoundingClientRect().height ?? 0;
  const top = list.getBoundingClientRect().top + window.scrollY + rowIndex * ROW_HEIGHT;
  window.scrollTo({ top: Math.max(0, top - toolbarHeight - 8), behavior: "smooth" });
}

function DictionaryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wordParam = searchParams.get("word");

  const dictionary = useDictionary();
  const { index } = dictionary;
  // Only the card list is needed here (for "already in your vocab" states), not review history.
  const vocab = useVocabData({ includeReviewLogs: false });
  const { cards, addDictionaryCard } = vocab;

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dismissedParam, setDismissedParam] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<WordFormMode | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const { message: toastMessage, showToast } = useToast();

  const listRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollKey = useRef<string | null>(null);

  const isSearching = deferredQuery.trim().length > 0;

  const rows = useMemo<DictionaryListRow[]>(() => {
    if (!index) return [];
    if (isSearching) {
      return index
        .search(deferredQuery, 500)
        .map((r) => ({ type: "entry" as const, headword: r.headword, match: r.kind }));
    }
    const out: DictionaryListRow[] = [];
    let current = "";
    index.headwords.forEach((headword, i) => {
      const letter = index.letters[i];
      if (letter !== current) {
        out.push({ type: "letter", letter });
        current = letter;
      }
      out.push({ type: "entry", headword });
    });
    return out;
  }, [index, isSearching, deferredQuery]);

  const availableLetters = useMemo(() => new Set(index?.letters ?? []), [index]);

  // Opened word: an explicit selection, else a ?word= deep link (until closed).
  const openKey =
    selectedKey ??
    (wordParam && wordParam !== dismissedParam ? (index?.get(wordParam)?.key ?? null) : null);
  const openHeadword = openKey ? index?.get(openKey) : undefined;

  const srsCardIdFor = useCallback((key: string) => findSrsCard(cards, key)?.id, [cards]);

  function jumpToLetter(letter: string) {
    scrollToRow(
      listRef.current,
      toolbarRef.current,
      rows.findIndex((r) => r.type === "letter" && r.letter === letter),
    );
  }

  // After a word is created, scroll the (re-sorted) list to its new position.
  useEffect(() => {
    const key = pendingScrollKey.current;
    if (!key) return;
    const rowIndex = rows.findIndex((r) => r.type === "entry" && r.headword.key === key);
    if (rowIndex >= 0) {
      pendingScrollKey.current = null;
      scrollToRow(listRef.current, toolbarRef.current, rowIndex);
    }
  }, [rows]);

  function flash(key: string) {
    setHighlightKey(key);
    window.setTimeout(() => setHighlightKey((k) => (k === key ? null : k)), 2500);
  }

  function closeDetail() {
    setSelectedKey(null);
    if (wordParam) {
      setDismissedParam(wordParam);
      router.replace("/dictionary", { scroll: false });
    }
  }

  async function addToVocab(headword: DictionaryHeadword) {
    if (findSrsCard(cards, headword.key)) return; // already studying it — never duplicate
    const input = cardInputFromHeadword(headword);
    await addDictionaryCard({ ...input, dictionaryKey: headword.key });
    showToast(`“${headword.headword}” added to your Vocabulary`);
  }

  if (dictionary.loading || !index) {
    return <LoadingState message={dictionary.error} />;
  }

  const personalCount = index.headwords.filter((h) => h.personal && !h.shared).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink-900">Dictionary</h1>
          <p className="mt-1 font-semibold text-ink-500">
            {index.size.toLocaleString()} words
            {personalCount > 0 && ` · ${personalCount} added by you`}
          </p>
        </div>
        <Button
          onClick={() => setFormMode({ kind: "create" })}
          variant="secondary"
          fullWidth={false}
          className="px-6"
        >
          + Add Word
        </Button>
      </div>

      {(dictionary.error || vocab.error) && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {dictionary.error ?? vocab.error}
        </p>
      )}

      <div
        ref={toolbarRef}
        className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 bg-paper/95 px-4 pt-2 pb-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <div className="relative">
          <TextField
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Vietnamese or English…"
            aria-label="Search the dictionary"
            lang="vi"
            className="pl-11"
          />
          <span
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-300"
            aria-hidden="true"
          >
            🔎
          </span>
        </div>
        {!isSearching && <LetterBar available={availableLetters} onJump={jumpToLetter} />}
      </div>

      {isSearching && (
        <p className="text-sm font-semibold text-ink-500" aria-live="polite">
          {rows.length === 0
            ? `No words match “${deferredQuery.trim()}”.`
            : `${rows.length}${rows.length === 500 ? "+" : ""} result${rows.length === 1 ? "" : "s"}`}
        </p>
      )}

      {isSearching && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink-300/40 px-6 py-12 text-center">
          <span className="text-5xl" aria-hidden="true">
            📖
          </span>
          <p className="max-w-sm font-semibold text-ink-500">
            Can&apos;t find it? Add it to your own dictionary.
          </p>
          <Button
            fullWidth={false}
            className="px-8"
            onClick={() => setFormMode({ kind: "create", initialHeadword: deferredQuery.trim() })}
          >
            + Add “{deferredQuery.trim()}”
          </Button>
        </div>
      ) : (
        <DictionaryList
          rows={rows}
          containerRef={listRef}
          srsCardIdFor={srsCardIdFor}
          srsPending={vocab.loading}
          highlightKey={highlightKey}
          onSelect={(headword) => setSelectedKey(headword.key)}
          onAddToVocab={addToVocab}
        />
      )}

      {openHeadword && !formMode && (
        <EntryDetailModal
          headword={openHeadword}
          srsCardId={srsCardIdFor(openHeadword.key)}
          srsPending={vocab.loading}
          onClose={closeDetail}
          onAddToVocab={() => addToVocab(openHeadword)}
          onEditPersonal={() =>
            openHeadword.personal &&
            setFormMode({
              kind: "edit",
              entry: openHeadword.personal,
              isOverlay: Boolean(openHeadword.shared),
            })
          }
          onAddMeaning={() => setFormMode({ kind: "add-meaning", headword: openHeadword })}
          onDeletePersonal={async () => {
            const wasCustom = !openHeadword.shared;
            await dictionary.deleteEntry(openHeadword.key);
            if (wasCustom) closeDetail();
            showToast(wasCustom ? "Word deleted" : "Your meanings were removed");
          }}
        />
      )}

      {formMode && (
        <WordFormModal
          mode={formMode}
          findExisting={(text) => (headwordKey(text) ? index.get(text) : undefined)}
          onCreate={async (input) => {
            const entry = await dictionary.createEntry(input);
            setQuery("");
            pendingScrollKey.current = entry.key;
            flash(entry.key);
            return entry;
          }}
          onAddMeaning={async (headword, input) => {
            const entry = await dictionary.addMeanings(headword, input);
            showToast("Meaning added");
            setSelectedKey(entry.key);
            return entry;
          }}
          onUpdate={async (entry, input) => {
            const next = await dictionary.updateEntry(entry, input);
            showToast("Changes saved");
            return next;
          }}
          onViewEntry={(key) => {
            setFormMode(null);
            setSelectedKey(key);
          }}
          srsCardIdFor={srsCardIdFor}
          srsPending={vocab.loading}
          onAddToVocab={async (key) => {
            const headword = index.get(key);
            if (headword) await addToVocab(headword);
          }}
          onClose={() => setFormMode(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </main>
  );
}
