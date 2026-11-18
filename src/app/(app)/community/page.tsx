"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PostCard } from "@/components/community/PostCard";
import { useGuidelinesGate } from "@/components/community/Guidelines";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { useCommunityFeed, type FeedFilters } from "@/lib/community/useCommunityFeed";
import { CATEGORIES, type FeedSort, type TopWindow, type TypeFilter } from "@/lib/community/types";

const SORTS: { id: FeedSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "top", label: "Top" },
  { id: "unanswered", label: "Unanswered" },
];

const FILTERS_KEY = "jv-community-filters";

function initialFilters(): FeedFilters {
  const base: FeedFilters = { sort: "newest", window: "week", category: "all", type: "all", search: "" };
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(FILTERS_KEY) ?? "null");
    return saved ? { ...base, ...saved, search: "" } : base;
  } catch {
    return base;
  }
}

export default function CommunityPage() {
  const router = useRouter();
  const { profiles, blocked, hidden } = useCommunity();
  const [filters, setFilters] = useState<FeedFilters>(initialFilters);
  const [searchText, setSearchText] = useState("");
  const deferredFilters = useDeferredValue(filters);
  const feed = useCommunityFeed(deferredFilters);
  const { require, dialog } = useGuidelinesGate();

  function change(patch: Partial<FeedFilters>) {
    setFilters((f) => {
      const next = { ...f, ...patch };
      try {
        const { search: _search, ...keep } = next;
        void _search;
        window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify(keep));
      } catch {
        // Not remembered, that's all.
      }
      return next;
    });
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    change({ search: searchText });
  }

  const visible = feed.posts.filter((p) => !hidden.has(p.id));
  const hiddenCount = feed.posts.length - visible.length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-extrabold text-ink-900">Ask, share, help each other</h1>
          <p className="mt-1 font-semibold text-ink-500">Questions and discussions about learning Vietnamese.</p>
        </div>
        <Button fullWidth={false} onClick={() => require(() => router.push("/community/ask"))}>
          Ask a Question
        </Button>
      </div>

      <form role="search" onSubmit={submitSearch} className="flex gap-2">
        <label htmlFor="community-search" className="sr-only">
          Search posts
        </label>
        <input
          id="community-search"
          type="search"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            if (!e.target.value.trim() && filters.search) change({ search: "" });
          }}
          placeholder="Search posts (e.g. “hoc” finds “học”)"
          className="min-w-0 flex-1 rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-2.5 text-ink-900 placeholder:text-ink-300 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100"
        />
        <Button type="submit" variant="secondary" fullWidth={false}>
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {!feed.searching && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort posts">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={filters.sort === s.id}
                onClick={() => change({ sort: s.id })}
                className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
                  filters.sort === s.id ? "border-red-500 bg-red-500 text-white" : "border-ink-300/50 bg-surface text-ink-700 hover:bg-yellow-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {!feed.searching && filters.sort === "top" && (
            <Select aria-label="Top posts from" value={filters.window} onChange={(e) => change({ window: e.target.value as TopWindow })}>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
            </Select>
          )}
          <Select aria-label="Category" value={filters.category} onChange={(e) => change({ category: e.target.value as FeedFilters["category"] })}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Post type"
            value={!feed.searching && filters.sort === "unanswered" ? "question" : filters.type}
            disabled={!feed.searching && filters.sort === "unanswered"}
            onChange={(e) => change({ type: e.target.value as TypeFilter })}
          >
            <option value="all">Questions and discussions</option>
            <option value="question">Questions</option>
            <option value="discussion">Discussions</option>
          </Select>
        </div>
      </div>

      {feed.searching && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink-500">
          <p>
            Results for <span className="font-bold text-ink-900">“{filters.search}”</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              change({ search: "" });
            }}
            className="rounded-lg px-2 py-1 font-bold text-red-600 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
          >
            Clear search
          </button>
        </div>
      )}

      <section aria-label="Posts" aria-busy={feed.loading} className="flex flex-col gap-3">
        {feed.loading ? (
          <ul className="flex flex-col gap-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl bg-ink-300/15" />
            ))}
          </ul>
        ) : feed.error && visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
            <p className="font-semibold text-ink-700">{feed.error}</p>
            <Button variant="outline" fullWidth={false} onClick={feed.retry}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              🌱
            </span>
            <p className="font-heading text-lg font-extrabold text-ink-900">
              {feed.emptyQuery
                ? "Type a word with at least 2 letters."
                : feed.searching
                  ? "No posts match that search."
                  : filters.sort === "unanswered"
                    ? "Every question has an answer. Nice!"
                    : "Nothing here yet."}
            </p>
            {!feed.searching && <p className="text-ink-500">Be the first: ask a question or start a discussion.</p>}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((p) => (
              <PostCard key={p.id} post={p} author={profiles[p.author]} blocked={blocked.has(p.author)} />
            ))}
          </ul>
        )}
        {hiddenCount > 0 && !feed.loading && (
          <p className="text-center text-xs font-semibold text-ink-500">
            {hiddenCount} post{hiddenCount === 1 ? "" : "s"} you hid {hiddenCount === 1 ? "isn't" : "aren't"} shown.
          </p>
        )}
        {feed.error && visible.length > 0 && <p className="text-center text-sm font-semibold text-red-600">{feed.error}</p>}
        {feed.hasMore && !feed.loading && (
          <Button variant="outline" onClick={feed.loadMore} loading={feed.loadingMore}>
            Load more
          </Button>
        )}
      </section>
      {dialog}
    </main>
  );
}
