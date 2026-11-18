"use client";

/**
 * The Notifications page's data: the member's notifications (30 at a time,
 * newest first), the posts and senders they mention, and marking them read
 * or deleting them. One-time reads, like the rest of the app; the unread
 * badge is re-counted when the tab regains focus (see CommunityProvider).
 */
import { useCallback, useEffect, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { useCommunity } from "./CommunityProvider";
import { friendlyCommunityError } from "./errors";
import type { CommunityNotification } from "./notifications";
import * as repo from "./repository";
import type { Post } from "./types";

interface State {
  key: string;
  items: CommunityNotification[];
  cursor: DocumentSnapshot | null;
  posts: Record<string, Post>;
  error: string | null;
  loadingMore: boolean;
}

async function postsFor(items: CommunityNotification[]): Promise<Record<string, Post>> {
  const posts = await repo.fetchPostsByIds(items.map((n) => n.post ?? "")).catch(() => [] as Post[]);
  return Object.fromEntries(posts.map((p) => [p.id, p]));
}

export function useNotifications() {
  const { uid, status, ensureProfiles, setUnreadCount } = useCommunity();
  const [reload, setReload] = useState(0);
  const key = status === "member" && uid ? `${uid}:${reload}` : null;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!key || !uid) return;
    let cancelled = false;
    repo
      .fetchNotifications(uid, null)
      .then(async ({ items, cursor }) => ({ items, cursor, posts: await postsFor(items) }))
      .then(
        ({ items, cursor, posts }) => {
          if (cancelled) return;
          setState({ key, items, cursor, posts, error: null, loadingMore: false });
          ensureProfiles(items.map((n) => (n.from === "mod" ? "" : n.from)));
        },
        (err) => {
          if (!cancelled) setState({ key, items: [], cursor: null, posts: {}, error: friendlyCommunityError(err), loadingMore: false });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [key, uid, ensureProfiles]);

  const current = state && state.key === key ? state : null;

  const loadMore = useCallback(() => {
    if (!uid || !current?.cursor || current.loadingMore) return;
    const k = current.key;
    setState((s) => (s && s.key === k ? { ...s, loadingMore: true } : s));
    repo
      .fetchNotifications(uid, current.cursor)
      .then(async ({ items, cursor }) => ({ items, cursor, posts: await postsFor(items) }))
      .then(
        ({ items, cursor, posts }) => {
          setState((s) =>
            s && s.key === k ? { ...s, items: [...s.items, ...items], cursor, posts: { ...s.posts, ...posts }, loadingMore: false } : s,
          );
          ensureProfiles(items.map((n) => (n.from === "mod" ? "" : n.from)));
        },
        (err) => setState((s) => (s && s.key === k ? { ...s, loadingMore: false, error: friendlyCommunityError(err) } : s)),
      );
  }, [uid, current, ensureProfiles]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!uid) return;
      const unread = (current?.items ?? []).filter((n) => ids.includes(n.id) && !n.read).map((n) => n.id);
      if (unread.length === 0) return;
      await repo.markNotificationsRead(uid, unread);
      setState((s) => (s ? { ...s, items: s.items.map((n) => (unread.includes(n.id) ? { ...n, read: true } : n)) } : s));
      setUnreadCount((n) => n - unread.length);
    },
    [uid, current, setUnreadCount],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!uid) return;
      const wasUnread = current?.items.find((n) => n.id === id)?.read === false;
      await repo.deleteNotification(uid, id);
      setState((s) => (s ? { ...s, items: s.items.filter((n) => n.id !== id) } : s));
      if (wasUnread) setUnreadCount((n) => n - 1);
    },
    [uid, current, setUnreadCount],
  );

  return {
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    items: current?.items ?? [],
    posts: current?.posts ?? {},
    hasMore: Boolean(current?.cursor),
    loadingMore: current?.loadingMore ?? false,
    loadMore,
    markRead,
    markAllRead: () => markRead((current?.items ?? []).map((n) => n.id)),
    remove,
    retry: () => setReload((n) => n + 1),
  };
}
