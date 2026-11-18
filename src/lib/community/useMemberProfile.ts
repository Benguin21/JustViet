"use client";

/**
 * A member's profile page: their public profile and their posts that
 * aren't deleted, newest first, 20 at a time.
 */
import { useCallback, useEffect, useState } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { useCommunity } from "./CommunityProvider";
import { friendlyCommunityError } from "./errors";
import * as repo from "./repository";
import type { CommunityProfile, Post } from "./types";

interface ProfileState {
  key: string;
  profile: CommunityProfile | null;
  posts: Post[];
  cursor: DocumentSnapshot | null;
  error: string | null;
  loadingMore: boolean;
}

export function useMemberProfile(uid: string | null) {
  const { status, profiles, profile: own } = useCommunity();
  const [reload, setReload] = useState(0);
  const key = status === "member" && uid ? `${uid}:${reload}` : null;
  const [state, setState] = useState<ProfileState | null>(null);

  useEffect(() => {
    if (!key || !uid) return;
    let cancelled = false;
    Promise.all([repo.fetchProfile(uid), repo.fetchUserPosts(uid, null)]).then(
      ([profile, page]) => {
        if (!cancelled) setState({ key, profile, posts: page.items, cursor: page.cursor, error: null, loadingMore: false });
      },
      (err) => {
        if (!cancelled) setState({ key, profile: null, posts: [], cursor: null, error: friendlyCommunityError(err), loadingMore: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, uid]);

  const current = state && state.key === key ? state : null;

  const loadMore = useCallback(() => {
    if (!uid || !current?.cursor || current.loadingMore) return;
    const k = current.key;
    setState((s) => (s && s.key === k ? { ...s, loadingMore: true } : s));
    repo.fetchUserPosts(uid, current.cursor).then(
      (page) => setState((s) => (s && s.key === k ? { ...s, posts: [...s.posts, ...page.items], cursor: page.cursor, loadingMore: false } : s)),
      (err) => setState((s) => (s && s.key === k ? { ...s, loadingMore: false, error: friendlyCommunityError(err) } : s)),
    );
  }, [uid, current]);

  // Your own profile, and any profile a vote has just changed, come from the shared cache.
  const live = uid ? (uid === own?.uid ? own : profiles[uid]) : null;

  return {
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    profile: live ?? current?.profile ?? null,
    posts: current?.posts ?? [],
    hasMore: Boolean(current?.cursor),
    loadingMore: current?.loadingMore ?? false,
    loadMore,
    retry: () => setReload((n) => n + 1),
  };
}
