"use client";

import { useMemo, useState } from "react";
import { CardRow } from "@/components/vocab/CardRow";
import { EmptyState } from "@/components/vocab/EmptyState";
import { effectiveStatus, isDue } from "@/lib/vocab/srs";
import { useNow } from "@/lib/useNow";
import type { CardStatus, VocabCard } from "@/lib/vocab/types";

type StatusFilter = "all" | "due" | CardStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Review" },
  { value: "suspended", label: "Suspended" },
];

type SortOption = "nextReview" | "dateAdded" | "alphabetical" | "difficulty" | "reviews";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "nextReview", label: "Next review" },
  { value: "dateAdded", label: "Date added" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "difficulty", label: "Difficulty" },
  { value: "reviews", label: "Number of reviews" },
];

type CardListProps = {
  cards: VocabCard[];
  onAddCard: () => void;
  onSelectCard: (card: VocabCard) => void;
  onEditCard: (card: VocabCard) => void;
  onDeleteCard: (card: VocabCard) => void;
  onStudyCard: (card: VocabCard) => void;
};

export function CardList({
  cards,
  onAddCard,
  onSelectCard,
  onEditCard,
  onDeleteCard,
  onStudyCard,
}: CardListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("nextReview");
  const now = useNow();

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) for (const tag of card.tags) set.add(tag);
    return Array.from(set).sort();
  }, [cards]);

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();

    let result = cards.filter((card) => {
      if (statusFilter === "due" && !isDue(card, now)) return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "due" &&
        effectiveStatus(card) !== statusFilter
      ) {
        return false;
      }
      if (activeTags.size > 0 && !card.tags.some((t) => activeTags.has(t))) return false;
      if (q) {
        const haystack = `${card.front} ${card.back} ${card.exampleSentence} ${card.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "nextReview":
          return a.due - b.due;
        case "dateAdded":
          return b.createdAt - a.createdAt;
        case "alphabetical":
          return a.front.localeCompare(b.front);
        case "difficulty":
          return b.difficulty - a.difficulty;
        case "reviews":
          return b.reviewCount - a.reviewCount;
        default:
          return 0;
      }
    });

    return result;
  }, [cards, search, statusFilter, activeTags, sortBy, now]);

  if (cards.length === 0) {
    return (
      <EmptyState
        title="No vocabulary cards yet."
        description="Add your first card to start building your vocabulary."
        actionLabel="+ Add Card"
        onAction={onAddCard}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words, meanings, examples, tags…"
          className="w-full max-w-sm rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-2 text-ink-900 placeholder:text-ink-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
        />
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="vocab-sort" className="font-bold text-ink-500">
            Sort by
          </label>
          <select
            id="vocab-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border-2 border-ink-300/60 bg-surface px-3 py-2 text-ink-900 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              statusFilter === filter.value
                ? "bg-red-500 text-white"
                : "bg-yellow-100 text-ink-700 hover:bg-yellow-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                activeTags.has(tag)
                  ? "border-red-500 bg-red-50 text-red-600"
                  : "border-ink-300/40 text-ink-500 hover:border-ink-300"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {visibleCards.length === 0 ? (
        <EmptyState
          title="No cards match your filters."
          description="Try a different search term, status, or tag."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-300/20">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper text-xs font-bold tracking-wide text-ink-500 uppercase">
              <tr>
                <th className="px-4 py-3">Word</th>
                <th className="px-4 py-3">Meaning</th>
                <th className="px-4 py-3">Part of Speech</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Review</th>
                <th className="px-4 py-3 text-center">Reviews</th>
                <th className="px-4 py-3 text-center">Difficulty</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visibleCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  onSelect={() => onSelectCard(card)}
                  onEdit={() => onEditCard(card)}
                  onDelete={() => onDeleteCard(card)}
                  onStudy={() => onStudyCard(card)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
