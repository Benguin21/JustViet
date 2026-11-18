"use client";

/**
 * The Moderate page's data (moderators only): open reports grouped by what
 * they're about, with the reported posts and responses; recently removed
 * content; and the moderator log. Plus the actions taken from the queue.
 */
import { useCallback, useEffect, useState } from "react";
import { useCommunity } from "./CommunityProvider";
import { friendlyCommunityError } from "./errors";
import { groupReports, type ReportGroup } from "./moderation";
import * as repo from "./repository";
import type { Post, Response } from "./types";

interface State {
  key: string;
  groups: ReportGroup[];
  posts: Record<string, Post>;
  /** Keyed "post/response". */
  responses: Record<string, Response>;
  removed: repo.RemovedCopy[];
  log: repo.ModLogEntry[];
  error: string | null;
}

export const responseKey = (post: string, response: string) => `${post}/${response}`;

export function useModeration() {
  const { uid, status, isModerator, ensureProfiles } = useCommunity();
  const [reload, setReload] = useState(0);
  const key = status === "member" && isModerator && uid ? `${uid}:${reload}` : null;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      const [reports, removed, log] = await Promise.all([repo.fetchOpenReports(), repo.fetchRemovedItems(), repo.fetchModLog()]);
      const groups = groupReports(reports);
      const postIds = [...groups.map((g) => g.post ?? ""), ...removed.map((r) => r.post), ...log.map((e) => e.post ?? "")];
      const [posts, responses] = await Promise.all([
        repo.fetchPostsByIds(postIds),
        Promise.all(groups.filter((g) => g.post && g.response).map((g) => repo.fetchResponse(g.post!, g.response!))),
      ]);
      return {
        groups,
        removed,
        log,
        posts: Object.fromEntries(posts.map((p) => [p.id, p])),
        responses: Object.fromEntries(responses.filter((r): r is Response => r != null).map((r) => [responseKey(r.post, r.id), r])),
      };
    })().then(
      (data) => {
        if (cancelled) return;
        setState({ key, ...data, error: null });
        ensureProfiles([
          ...data.groups.map((g) => g.profile ?? ""),
          ...Object.values(data.posts).map((p) => p.author),
          ...Object.values(data.responses).map((r) => r.author),
          ...data.removed.map((r) => r.author),
          ...data.log.flatMap((e) => [e.by, e.uid ?? ""]),
        ]);
      },
      (err) => {
        if (!cancelled) setState({ key, groups: [], posts: {}, responses: {}, removed: [], log: [], error: friendlyCommunityError(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, ensureProfiles]);

  const current = state && state.key === key ? state : null;
  const dropGroup = (g: ReportGroup) => setState((s) => (s ? { ...s, groups: s.groups.filter((x) => x.key !== g.key) } : s));

  /** The member a group of reports is about (a reported profile, or the reported item's author). */
  const authorOf = useCallback(
    (g: ReportGroup): string | null => {
      if (g.kind === "profile") return g.profile;
      if (!current || !g.post) return null;
      return g.response ? (current.responses[responseKey(g.post, g.response)]?.author ?? null) : (current.posts[g.post]?.author ?? null);
    },
    [current],
  );

  const need = () => {
    if (!uid) throw new Error("You need to be signed in to do that.");
    return uid;
  };

  return {
    isModerator,
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    groups: current?.groups ?? [],
    posts: current?.posts ?? {},
    responses: current?.responses ?? {},
    removed: current?.removed ?? [],
    log: current?.log ?? [],
    authorOf,
    retry: () => setReload((n) => n + 1),
    /** Removes the reported post or response and closes its reports as actioned. */
    removeReported: async (g: ReportGroup, reason: string) => {
      if (!g.post) return;
      await repo.removeContent(need(), { post: g.post, response: g.response }, reason, g.reports.map((r) => r.id)).catch((err) => {
        throw new Error(friendlyCommunityError(err));
      });
      dropGroup(g);
      setReload((n) => n + 1);
    },
    /** Closes a group's reports with no action. */
    dismiss: async (g: ReportGroup) => {
      await repo
        .dismissReports(need(), { uid: authorOf(g), post: g.post, response: g.response }, g.reports.map((r) => r.id))
        .catch((err) => {
          throw new Error(friendlyCommunityError(err));
        });
      dropGroup(g);
    },
    restore: async (copy: repo.RemovedCopy) => {
      await repo.restoreContent(need(), { post: copy.post, response: copy.response }).catch((err) => {
        throw new Error(friendlyCommunityError(err));
      });
      setState((s) => (s ? { ...s, removed: s.removed.filter((r) => r.key !== copy.key) } : s));
    },
  };
}
