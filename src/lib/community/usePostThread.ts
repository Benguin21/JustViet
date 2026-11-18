"use client";

/**
 * A post page's data: the post, all its responses and replies, and the
 * member's own votes on them, fetched once; plus every action on the page.
 * Each action updates the local state from what it wrote (the repository's
 * transaction already checked it), so voting and answering feel instant.
 */
import { useCallback, useEffect, useState } from "react";
import { useCommunity } from "./CommunityProvider";
import { friendlyCommunityError, RateLimitError } from "./errors";
import * as repo from "./repository";
import { postDeleteMode, responseDeleteMode, type PostInput } from "./posts";
import { voteDelta } from "./votes";
import type { ItemRef, Post, Response, VoteValue } from "./types";

interface ThreadState {
  key: string;
  post: Post | null;
  responses: Response[];
  myVotes: Record<string, VoteValue>;
  error: string | null;
}

/** Rethrows with a friendly message, keeping RateLimitError (the UI shows its countdown). */
function rethrow(err: unknown): never {
  if (err instanceof RateLimitError) throw err;
  throw new Error(friendlyCommunityError(err));
}

export function usePostThread(postId: string | null) {
  const community = useCommunity();
  const { uid, status, ensureProfiles, patchProfile, noteActivity, profiles } = community;
  const [reload, setReload] = useState(0);
  const key = status === "member" && postId && uid ? `${postId}:${reload}` : null;
  const [state, setState] = useState<ThreadState | null>(null);

  useEffect(() => {
    if (!key || !postId || !uid) return;
    let cancelled = false;
    Promise.all([repo.fetchPost(postId), repo.fetchResponses(postId), repo.fetchMyVotes(uid, postId)]).then(
      ([post, responses, myVotes]) => {
        if (cancelled) return;
        setState({ key, post, responses, myVotes, error: null });
        ensureProfiles([post?.author ?? "", ...responses.flatMap((r) => [r.author, r.mention ?? ""])]);
      },
      (err) => {
        if (!cancelled) setState({ key, post: null, responses: [], myVotes: {}, error: friendlyCommunityError(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, postId, uid, ensureProfiles]);

  const current = state && state.key === key ? state : null;

  const set = useCallback(
    (fn: (s: ThreadState) => ThreadState) => setState((s) => (s && s.key === key ? fn(s) : s)),
    [key],
  );

  const need = () => {
    if (!uid || !current?.post) throw new Error("This post isn't loaded yet.");
    return { me: uid, post: current.post };
  };

  /** Up (1) or down (−1); clicking your current vote removes it. */
  const vote = async (item: ItemRef, clicked: 1 | -1) => {
    const { me } = need();
    const voteKey = item.response ?? "";
    const before = current?.myVotes[voteKey] ?? 0;
    const result = await repo.castVote(me, item, clicked).catch(rethrow);
    noteActivity("vote");
    const author = item.response == null ? current?.post?.author : current?.responses.find((r) => r.id === item.response)?.author;
    set((s) => ({
      ...s,
      myVotes: { ...s.myVotes, [voteKey]: result.value },
      post: item.response == null && s.post ? { ...s.post, up: result.up, down: result.down, score: result.score } : s.post,
      responses:
        item.response == null
          ? s.responses
          : s.responses.map((r) => (r.id === item.response ? { ...r, up: result.up, down: result.down, score: result.score } : r)),
    }));
    if (author && profiles[author]) {
      const d = voteDelta(before, result.value);
      patchProfile(author, { up: profiles[author].up + d.up, down: profiles[author].down + d.down });
    }
  };

  const respond = async (id: string, input: repo.ResponseInput) => {
    const { me, post } = need();
    const { response, duplicate } = await repo.createResponse(me, post.id, id, input).catch(rethrow);
    if (!duplicate) noteActivity("response");
    set((s) => {
      if (s.responses.some((r) => r.id === response.id)) return s;
      return {
        ...s,
        responses: [...s.responses, response],
        post: s.post && response.parent == null ? { ...s.post, responses: s.post.responses + 1 } : s.post,
      };
    });
    if (response.parent) {
      set((s) => ({ ...s, responses: s.responses.map((r) => (r.id === response.parent ? { ...r, replies: r.replies + 1 } : r)) }));
    }
    return response;
  };

  const editPost = async (input: PostInput) => {
    const { post } = need();
    const next = await repo.editPost(post, input).catch(rethrow);
    set((s) => ({ ...s, post: next }));
  };

  const deletePost = async () => {
    const { me, post } = need();
    const mode = await repo.deletePost(me, post.id).catch(rethrow);
    if (post.up || post.down) {
      const own = community.profile;
      if (own) patchProfile(me, { up: own.up - post.up, down: own.down - post.down });
    }
    set((s) => ({
      ...s,
      post: mode === "removed" || !s.post ? null : { ...s.post, title: "", body: "", author: "", deleted: true, up: 0, down: 0, score: 0 },
    }));
    return mode;
  };

  const editResponse = async (r: Response, body: string) => {
    const next = await repo.editResponse(r, body).catch(rethrow);
    set((s) => ({ ...s, responses: s.responses.map((x) => (x.id === r.id ? next : x)) }));
  };

  const deleteResponse = async (r: Response) => {
    const { me, post } = need();
    await repo.deleteResponse(me, post.id, r.id).catch(rethrow);
    const mode = responseDeleteMode(r);
    if (r.parent == null && (r.up || r.down) && community.profile) {
      patchProfile(me, { up: community.profile.up - r.up, down: community.profile.down - r.down });
    }
    set((s) => {
      let responses =
        mode === "remove"
          ? s.responses.filter((x) => x.id !== r.id)
          : s.responses.map((x) => (x.id === r.id ? { ...x, body: "", author: "", deleted: true, up: 0, down: 0, score: 0 } : x));
      if (r.parent) responses = responses.map((x) => (x.id === r.parent ? { ...x, replies: x.replies - 1 } : x));
      const p = s.post;
      const nextPost =
        p && r.parent == null
          ? { ...p, responses: p.responses - 1, erased: p.erased + (mode === "erase" ? 1 : 0), accepted: p.accepted === r.id ? null : p.accepted }
          : p;
      return { ...s, responses, post: nextPost };
    });
  };

  const accept = async (responseId: string | null) => {
    const { post } = need();
    await repo.setAccepted(post.id, responseId).catch(rethrow);
    set((s) => ({ ...s, post: s.post ? { ...s.post, accepted: responseId } : s.post }));
  };

  return {
    loading: Boolean(key) && !current,
    error: current?.error ?? null,
    post: current?.post ?? null,
    responses: current?.responses ?? [],
    myVotes: current?.myVotes ?? {},
    retry: () => setReload((n) => n + 1),
    vote,
    respond,
    editPost,
    deletePost,
    editResponse,
    deleteResponse,
    accept,
    /** What deleting the post would do right now. */
    postDeleteMode: current?.post ? postDeleteMode(current.post) : ("remove" as const),
  };
}

