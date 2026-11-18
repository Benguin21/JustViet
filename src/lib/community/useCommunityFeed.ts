"use client";

/**
 * The Community page's data: one page of the feed (Newest, Top, Unanswered,
 * with category and type filters) or a keyword search, plus "Load more".
 * Fetched when the filters change; authors' profiles are loaded alongside.
 */
import { useCallback, useEffect, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { useCommunity } from "./CommunityProvider";
import { friendlyCommunityError } from "./errors";
import * as repo from "./repository";
import { parseQuery, rankSearchResults } from "./search";
import type { CategoryId, FeedSort, Post, TopWindow, TypeFilter } from "./types";

export interface FeedFilters {
  sort: FeedSort;
  window: TopWindow;
  category: CategoryId | "all";
  type: TypeFilter;
  /** A keyword search replaces the sorted feed while it isn't empty. */
  search: string;
}

interface FeedState {
  key: string;
  items: Post[];
  cursor: DocumentSnapshot | null;
  error: string | null;
  loadingMore: boolean;
  /** For searches: no searchable words (each needs 2+ letters). */
  emptyQuery?: boolean;
}

export interface UseCommunityFeedResult {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  emptyQuery: boolean;
  searching: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function useCommunityFeed(filters: FeedFilters): UseCommunityFeedResult {
  const { status, ensureProfiles } = useCommunity();
  const [reload, setReload] = useState(0);
  const search = filters.search.trim();
  const key = status === "member" ? JSON.stringify({ ...filters, search, reload }) : null;
  const [state, setState] = useState<FeedState | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const run = async (): Promise<FeedState> => {
      if (search) {
        const q = parseQuery(search);
        if (!q.token) return { key, items: [], cursor: null, error: null, loadingMore: false, emptyQuery: true };
        const found = await repo.searchPosts(q.token);
        const items = rankSearchResults(found, q).filter(
          (p) =>
            (filters.category === "all" || p.category === filters.category) &&
            (filters.type === "all" || p.type === filters.type) &&
            !p.deleted,
        );
        return { key, items, cursor: null, error: null, loadingMore: false };
      }
      const page = await repo.fetchFeed(filters, null, Date.now());
      return { key, items: page.items, cursor: page.cursor, error: null, loadingMore: false };
    };
    run().then(
      (s) => {
        if (cancelled) return;
        setState(s);
        ensureProfiles(s.items.map((p) => p.author));
      },
      (err) => {
        if (!cancelled) setState({ key, items: [], cursor: null, error: friendlyCommunityError(err), loadingMore: false });
      },
    );
    return () => {
      cancelled = true;
    };
    // `filters` is captured through `key`, which serializes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state && state.key === key ? state : null;

  const loadMore = useCallback(() => {
    if (!current?.cursor || current.loadingMore) return;
    const cursor = current.cursor;
    setState((s) => (s && s.key === current.key ? { ...s, loadingMore: true } : s));
    repo.fetchFeed(filters, cursor, Date.now()).then(
      (page) => {
        setState((s) =>
          s && s.key === current.key
            ? { ...s, items: [...s.items, ...page.items.filter((p) => !s.items.some((x) => x.id === p.id))], cursor: page.cursor, loadingMore: false }
            : s,
        );
        ensureProfiles(page.items.map((p) => p.author));
      },
      (err) => setState((s) => (s && s.key === current.key ? { ...s, loadingMore: false, error: friendlyCommunityError(err) } : s)),
    );
  }, [current, filters, ensureProfiles]);

  return {
    posts: current?.items ?? [],
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    hasMore: Boolean(current?.cursor),
    loadingMore: current?.loadingMore ?? false,
    emptyQuery: current?.emptyQuery ?? false,
    searching: search.length > 0,
    loadMore,
    retry: () => setReload((n) => n + 1),
  };
}
