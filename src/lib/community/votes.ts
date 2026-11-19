/**
 * Vote transitions and Community XP. Pure; firestore.rules checks the same
 * arithmetic (`upD`/`downD` there) on every vote.
 *
 * Community XP = upvotes received − downvotes received on a member's posts
 * and top-level responses that aren't deleted. It starts at 0, can go
 * negative and isn't capped. Nothing else moves it: not posting, replying,
 * accepted answers, edits, hiding, blocking, or the votes a member casts.
 */
import type { VoteValue } from "./types";

export const COMMUNITY_XP_LABEL = "Community XP";
export const COMMUNITY_XP_EXPLANATION = "Upvotes received minus downvotes received on your posts and answers.";
export const VOTE_GUIDANCE = "Upvote helpful contributions. Downvote unhelpful or incorrect ones. Use the flag to report rule-breaking.";

/** Clicking your current vote removes it; clicking the other one switches. */
export function nextVote(current: VoteValue, clicked: 1 | -1): VoteValue {
  return current === clicked ? 0 : clicked;
}

/** How a vote change moves the item's (and its author's) up and down counts. */
export function voteDelta(before: VoteValue, after: VoteValue): { up: number; down: number } {
  return {
    up: (after === 1 ? 1 : 0) - (before === 1 ? 1 : 0),
    down: (after === -1 ? 1 : 0) - (before === -1 ? 1 : 0),
  };
}

/** The change in the author's Community XP: +1/−1 for a new vote, ±2 for a switch. */
export function xpDelta(before: VoteValue, after: VoteValue): number {
  const d = voteDelta(before, after);
  return d.up - d.down;
}

export function applyVote<T extends { up: number; down: number }>(counts: T, before: VoteValue, after: VoteValue): T & { score: number } {
  const d = voteDelta(before, after);
  const up = counts.up + d.up;
  const down = counts.down + d.down;
  return { ...counts, up, down, score: up - down };
}

export function communityXp(totals: { up: number; down: number }): number {
  return totals.up - totals.down;
}

export function isVoteValue(v: unknown): v is VoteValue {
  return v === -1 || v === 0 || v === 1;
}

/** The vote doc id: one per item and voter, so a retry or double click can't count twice. */
export function voteId(post: string, response: string | null, voter: string): string {
  return response == null ? `p_${post}_${voter}` : `r_${post}_${response}_${voter}`;
}
