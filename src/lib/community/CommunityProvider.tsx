"use client";

/**
 * The signed-in member's Community state, shared by every Community page
 * (mounted once in the community layout, so moving between pages doesn't
 * refetch): where they are in joining (verified email → 13+ answer →
 * profile), their profile, rate-limit record (and any suspension), hidden
 * posts and blocked accounts, whether they're a moderator, their unread
 * notification count, plus a cache of other members' public profiles.
 * Fetched once per sign-in; every action updates the local state from what
 * it wrote.
 *
 * Never reads or writes learning XP, goals or Rồng Con data.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readModeratorClaim, useAuth } from "@/lib/auth-context";
import { friendlyCommunityError } from "./errors";
import * as repo from "./repository";
import { countAction, utcDay } from "./limits";
import { EMPTY_ACTIVITY, type Activity, type CommunityProfile } from "./types";

export type CommunityStatus = "loading" | "error" | "unverified" | "ask-age" | "under13" | "join" | "banned" | "member";

export interface CommunityContextValue {
  status: CommunityStatus;
  error: string | null;
  retry: () => void;
  uid: string | null;
  profile: CommunityProfile | null;
  activity: Activity;
  hidden: ReadonlySet<string>;
  blocked: ReadonlySet<string>;
  /** Has the `moderator` claim (scripts/community-moderator.mts). */
  isModerator: boolean;
  unreadCount: number;
  /** Re-counts unread notifications (also done when the tab regains focus). */
  refreshUnread: () => void;
  /** Adjusts the unread count after marking notifications read. */
  setUnreadCount: (fn: (n: number) => number) => void;

  answerAge: (over13: boolean) => Promise<void>;
  join: (name: string, color: string) => Promise<void>;
  rename: (name: string) => Promise<void>;
  setColor: (color: string) => Promise<void>;
  acceptGuidelines: () => Promise<void>;
  /** Records a successful action locally, for the "Please wait" checks. */
  noteActivity: (kind: "post" | "response" | "vote" | "report") => void;
  hide: (postId: string) => Promise<void>;
  unhide: (postId: string) => Promise<void>;
  block: (uid: string) => Promise<void>;
  unblock: (uid: string) => Promise<void>;

  /** Other members' public profiles, as far as they've been loaded. */
  profiles: Readonly<Record<string, CommunityProfile>>;
  /** Loads any of these profiles that aren't cached yet. */
  ensureProfiles: (uids: string[]) => void;
  /** Applies a known change (a vote moved someone's totals) to a cached profile. */
  patchProfile: (uid: string, patch: Partial<CommunityProfile>) => void;
}

const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);

interface Loaded {
  key: string;
  account?: repo.CommunityAccount;
  error?: string;
}

function rethrow(err: unknown): never {
  throw new Error(friendlyCommunityError(err));
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user, emailVerified } = useAuth();
  const uid = user?.uid ?? null;
  const [reload, setReload] = useState(0);
  const key = uid && emailVerified ? `${uid}:${reload}` : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [profiles, setProfiles] = useState<Record<string, CommunityProfile>>({});
  const requested = useRef(new Set<string>());
  const [mod, setMod] = useState<{ uid: string; is: boolean } | null>(null);
  const [unread, setUnread] = useState<{ uid: string; count: number } | null>(null);

  // The moderator claim, from a fresh token so a newly granted one shows up.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    readModeratorClaim(true).then(
      (is) => {
        if (!cancelled) setMod({ uid, is });
      },
      () => {
        if (!cancelled) setMod({ uid, is: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!key || !uid) return;
    let cancelled = false;
    repo.fetchAccount(uid).then(
      (account) => {
        if (!cancelled) setLoaded({ key, account });
      },
      (err) => {
        if (!cancelled) setLoaded({ key, error: friendlyCommunityError(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, uid]);

  const current = loaded && loaded.key === key ? loaded : null;
  const account = current?.account ?? null;

  const status: CommunityStatus = !uid
    ? "loading"
    : !emailVerified
      ? "unverified"
      : !current
        ? "loading"
        : current.error
          ? "error"
          : account?.over13 == null
            ? "ask-age"
            : account.over13 === false
              ? "under13"
              : !account.profile
                ? "join"
                : account.profile.banned
                  ? "banned"
                  : "member";

  const refreshUnread = useCallback(() => {
    if (!uid) return;
    repo.fetchUnreadCount(uid).then(
      (count) => setUnread({ uid, count }),
      () => {
        // The badge just stays as it was.
      },
    );
  }, [uid]);

  useEffect(() => {
    if (status !== "member") return;
    refreshUnread();
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshUnread();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [status, refreshUnread]);

  const update = useCallback(
    (fn: (a: repo.CommunityAccount) => repo.CommunityAccount) => {
      setLoaded((prev) => (prev && prev.key === key && prev.account ? { ...prev, account: fn(prev.account) } : prev));
    },
    [key],
  );

  const need = useCallback((): string => {
    if (!uid) throw new Error("You need to be signed in to do that.");
    return uid;
  }, [uid]);

  const ensureProfiles = useCallback((uids: string[]) => {
    const missing = [...new Set(uids)].filter((id) => id && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    repo.fetchProfiles(missing).then(
      (list) => setProfiles((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.uid, p])) })),
      () => missing.forEach((id) => requested.current.delete(id)),
    );
  }, []);

  const patchProfile = useCallback(
    (id: string, patch: Partial<CommunityProfile>) => {
      setProfiles((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
      if (id === uid) update((a) => (a.profile ? { ...a, profile: { ...a.profile, ...patch } } : a));
    },
    [uid, update],
  );

  const value = useMemo<CommunityContextValue>(() => {
    const profile = account?.profile ?? null;
    const own = (p: CommunityProfile) => {
      update((a) => ({ ...a, profile: p }));
      setProfiles((prev) => ({ ...prev, [p.uid]: p }));
    };
    return {
      status,
      error: current?.error ?? null,
      retry: () => setReload((n) => n + 1),
      uid,
      profile,
      activity: account?.activity ?? EMPTY_ACTIVITY,
      hidden: new Set(account?.hidden ?? []),
      blocked: new Set(account?.blocked ?? []),
      isModerator: Boolean(uid && mod?.uid === uid && mod.is),
      unreadCount: unread && unread.uid === uid ? unread.count : 0,
      refreshUnread,
      setUnreadCount: (fn) => setUnread((prev) => (uid ? { uid, count: Math.max(0, fn(prev && prev.uid === uid ? prev.count : 0)) } : prev)),

      answerAge: async (over13) => {
        const me = need();
        const saved = await repo.answerAge(me, over13).catch(rethrow);
        update((a) => ({ ...a, over13: saved }));
      },
      join: async (name, color) => {
        const me = need();
        own(await repo.joinCommunity(me, name, color).catch(rethrow));
      },
      rename: async (name) => {
        const me = need();
        own(await repo.renameProfile(me, name).catch(rethrow));
      },
      setColor: async (color) => {
        const me = need();
        await repo.setAvatarColor(me, color).catch(rethrow);
        if (profile) own({ ...profile, color });
      },
      acceptGuidelines: async () => {
        const me = need();
        await repo.acceptGuidelines(me).catch(rethrow);
        if (profile) own({ ...profile, guidelinesAt: Date.now() });
      },
      noteActivity: (kind) => {
        const now = Date.now();
        update((a) => {
          let act = { ...a.activity };
          if (kind !== "report") act = { ...act, ...countAction(kind, act, now) };
          if (kind === "post") act.lastPost = now;
          if (kind === "response") act.lastResponse = now;
          if (kind === "vote") act.lastVote = now;
          if (kind === "report") {
            const day = utcDay(now);
            act.reports = (act.reportDay === day ? act.reports : 0) + 1;
            act.reportDay = day;
          }
          return { ...a, activity: act };
        });
      },
      hide: async (postId) => {
        await repo.hidePost(need(), postId).catch(rethrow);
        update((a) => ({ ...a, hidden: [...new Set([...a.hidden, postId])] }));
      },
      unhide: async (postId) => {
        await repo.unhidePost(need(), postId).catch(rethrow);
        update((a) => ({ ...a, hidden: a.hidden.filter((h) => h !== postId) }));
      },
      block: async (other) => {
        await repo.blockMember(need(), other).catch(rethrow);
        update((a) => ({ ...a, blocked: [...new Set([...a.blocked, other])] }));
      },
      unblock: async (other) => {
        await repo.unblockMember(need(), other).catch(rethrow);
        update((a) => ({ ...a, blocked: a.blocked.filter((b) => b !== other) }));
      },

      profiles: profile ? { ...profiles, [profile.uid]: profile } : profiles,
      ensureProfiles,
      patchProfile,
    };
  }, [status, current, account, uid, profiles, update, need, ensureProfiles, patchProfile, mod, unread, refreshUnread]);

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within a CommunityProvider");
  return ctx;
}
