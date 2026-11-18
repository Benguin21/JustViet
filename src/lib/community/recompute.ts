/**
 * Recomputes every Community count from the records it's derived from, and
 * lists where the stored numbers drifted. Used by the unit tests and by the
 * admin script `scripts/community-drift.mts` (which runs it on the live
 * data and can write the fixes). Pure and dependency-free so plain Node can
 * import it.
 *
 * The invariants (the rules keep them; this checks them):
 *  - an item (post or top-level response) that isn't deleted has up/down =
 *    the number of +1/−1 votes on it, and score = up − down; an item its
 *    author deleted has 0/0/0; an item a moderator removed keeps its tally
 *    (votes are frozen, and it counts again if restored)
 *  - a profile's up/down = the sum over its author's items that aren't deleted
 *    or removed (removed items are `deleted` too)
 *  - a post's `responses` = its top-level responses that aren't deleted,
 *    `erased` = its deleted top-level responses that are kept as
 *    placeholders, and `accepted` names a top-level response that isn't deleted
 *  - a top-level response's `replies` = the replies under it
 * Votes on items that no longer exist (deleted outright) are ignored.
 */

export interface PostRecord {
  id: string;
  author: string;
  up: number;
  down: number;
  score: number;
  responses: number;
  erased: number;
  accepted: string | null;
  deleted: boolean;
  removed?: boolean;
}

export interface ResponseRecord {
  id: string;
  post: string;
  parent: string | null;
  author: string;
  up: number;
  down: number;
  score: number;
  replies: number;
  deleted: boolean;
  removed?: boolean;
}

export interface VoteRecord {
  post: string;
  response: string | null;
  value: number;
}

export interface ProfileRecord {
  uid: string;
  up: number;
  down: number;
}

export interface Drift {
  /** Firestore path of the doc to fix. */
  path: string;
  /** The fields to set to fix it. */
  fix: Record<string, number | string | null>;
  /** What was stored, for the report. */
  stored: Record<string, number | string | null>;
}

const itemKey = (post: string, response: string | null) => (response == null ? post : `${post}/${response}`);

/** Up and down votes per item key ("post" or "post/response"). */
export function tallyVotes(votes: VoteRecord[]): Map<string, { up: number; down: number }> {
  const out = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    if (v.value !== 1 && v.value !== -1) continue;
    const key = itemKey(v.post, v.response);
    const t = out.get(key) ?? { up: 0, down: 0 };
    if (v.value === 1) t.up += 1;
    else t.down += 1;
    out.set(key, t);
  }
  return out;
}

/** Community XP totals per author, recomputed from the votes on their items that aren't deleted. */
export function recomputeProfileTotals(
  posts: PostRecord[],
  responses: ResponseRecord[],
  votes: VoteRecord[],
): Map<string, { up: number; down: number }> {
  const tally = tallyVotes(votes);
  const totals = new Map<string, { up: number; down: number }>();
  const add = (author: string, key: string) => {
    const t = tally.get(key);
    if (!author || !t) return;
    const cur = totals.get(author) ?? { up: 0, down: 0 };
    totals.set(author, { up: cur.up + t.up, down: cur.down + t.down });
  };
  for (const p of posts) if (!p.deleted) add(p.author, itemKey(p.id, null));
  for (const r of responses) if (!r.deleted && r.parent == null) add(r.author, itemKey(r.post, r.id));
  return totals;
}

function diff(path: string, stored: Record<string, number | string | null>, expected: Record<string, number | string | null>): Drift | null {
  const fix: Record<string, number | string | null> = {};
  const was: Record<string, number | string | null> = {};
  for (const [k, v] of Object.entries(expected)) {
    if (stored[k] !== v) {
      fix[k] = v;
      was[k] = stored[k] ?? null;
    }
  }
  return Object.keys(fix).length ? { path, fix, stored: was } : null;
}

export function findDrift(data: {
  profiles: ProfileRecord[];
  posts: PostRecord[];
  responses: ResponseRecord[];
  votes: VoteRecord[];
}): Drift[] {
  const { profiles, posts, responses, votes } = data;
  const tally = tallyVotes(votes);
  const out: Drift[] = [];
  const push = (d: Drift | null) => {
    if (d) out.push(d);
  };

  const byPost = new Map<string, ResponseRecord[]>();
  for (const r of responses) byPost.set(r.post, [...(byPost.get(r.post) ?? []), r]);

  for (const p of posts) {
    const own = byPost.get(p.id) ?? [];
    const top = own.filter((r) => r.parent == null);
    const t = p.deleted && !p.removed ? { up: 0, down: 0 } : (tally.get(itemKey(p.id, null)) ?? { up: 0, down: 0 });
    const acceptedOk = p.accepted != null && top.some((r) => r.id === p.accepted && !r.deleted);
    push(
      diff(
        `communityPosts/${p.id}`,
        { up: p.up, down: p.down, score: p.score, responses: p.responses, erased: p.erased, accepted: p.accepted },
        {
          up: t.up,
          down: t.down,
          score: t.up - t.down,
          responses: top.filter((r) => !r.deleted).length,
          erased: top.filter((r) => r.deleted).length,
          accepted: acceptedOk ? p.accepted : null,
        },
      ),
    );
  }

  for (const r of responses) {
    const isTop = r.parent == null;
    const t = (r.deleted && !r.removed) || !isTop ? { up: 0, down: 0 } : (tally.get(itemKey(r.post, r.id)) ?? { up: 0, down: 0 });
    const replies = isTop ? (byPost.get(r.post) ?? []).filter((x) => x.parent === r.id).length : 0;
    push(
      diff(
        `communityPosts/${r.post}/responses/${r.id}`,
        { up: r.up, down: r.down, score: r.score, replies: r.replies },
        { up: t.up, down: t.down, score: t.up - t.down, replies },
      ),
    );
  }

  const totals = recomputeProfileTotals(posts, responses, votes);
  for (const prof of profiles) {
    const t = totals.get(prof.uid) ?? { up: 0, down: 0 };
    push(diff(`communityProfiles/${prof.uid}`, { up: prof.up, down: prof.down }, { up: t.up, down: t.down }));
  }
  return out;
}
