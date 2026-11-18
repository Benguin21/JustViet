import { describe, expect, it } from "vitest";
import { findDrift, recomputeProfileTotals, tallyVotes, type PostRecord, type ResponseRecord } from "./recompute";
import { applyVote, nextVote } from "./votes";
import type { VoteValue } from "./types";

const post = (id: string, author: string, extra: Partial<PostRecord> = {}): PostRecord => ({
  id, author, up: 0, down: 0, score: 0, responses: 0, erased: 0, accepted: null, deleted: false, ...extra,
});
const resp = (id: string, p: string, author: string, extra: Partial<ResponseRecord> = {}): ResponseRecord => ({
  id, post: p, parent: null, author, up: 0, down: 0, score: 0, replies: 0, deleted: false, ...extra,
});

describe("tallyVotes", () => {
  it("counts +1 and −1 per item and ignores removed votes", () => {
    const t = tallyVotes([
      { post: "p", response: null, value: 1 },
      { post: "p", response: null, value: -1 },
      { post: "p", response: null, value: 0 },
      { post: "p", response: "r", value: 1 },
    ]);
    expect(t.get("p")).toEqual({ up: 1, down: 1 });
    expect(t.get("p/r")).toEqual({ up: 1, down: 0 });
  });
});

describe("recomputeProfileTotals", () => {
  it("sums votes on an author's posts and top-level responses that aren't deleted", () => {
    const posts = [post("p1", "ann"), post("p2", "ann", { deleted: true }), post("p3", "bob")];
    const responses = [resp("r1", "p3", "ann"), resp("r2", "p3", "ann", { parent: "r1" })];
    const votes = [
      { post: "p1", response: null, value: 1 },
      { post: "p1", response: null, value: 1 },
      { post: "p2", response: null, value: 1 }, // deleted: doesn't count
      { post: "p3", response: "r1", value: -1 },
      { post: "p3", response: "r2", value: 1 }, // a reply can't be voted on: ignored
      { post: "gone", response: null, value: 1 }, // deleted outright: ignored
    ];
    expect(recomputeProfileTotals(posts, responses, votes).get("ann")).toEqual({ up: 2, down: 1 });
    expect(recomputeProfileTotals(posts, responses, votes).get("bob")).toBeUndefined();
  });

  it("matches the incremental vote math over any sequence of clicks", () => {
    // Simulate clicks the way the app applies them, then recompute from the final votes.
    let counts = { up: 0, down: 0, score: 0 };
    const current = new Map<string, VoteValue>();
    const clicks: [string, 1 | -1][] = [["v1", 1], ["v2", -1], ["v1", -1], ["v3", 1], ["v2", -1], ["v3", 1], ["v4", 1], ["v1", 1]];
    for (const [voter, clicked] of clicks) {
      const before = current.get(voter) ?? 0;
      const after = nextVote(before, clicked);
      counts = applyVote(counts, before, after);
      current.set(voter, after);
    }
    const votes = [...current.values()].map((value) => ({ post: "p", response: null, value }));
    const totals = recomputeProfileTotals([post("p", "ann")], [], votes).get("ann") ?? { up: 0, down: 0 };
    expect({ up: counts.up, down: counts.down }).toEqual(totals);
    expect(counts.score).toBe(totals.up - totals.down);
  });
});

describe("findDrift", () => {
  it("reports nothing when every count is right", () => {
    const posts = [post("p", "ann", { up: 1, score: 1, responses: 1, accepted: "r" })];
    const responses = [resp("r", "p", "bob", { down: 1, score: -1, replies: 1 }), resp("x", "p", "ann", { parent: "r" })];
    const votes = [
      { post: "p", response: null, value: 1 },
      { post: "p", response: "r", value: -1 },
    ];
    const profiles = [{ uid: "ann", up: 1, down: 0 }, { uid: "bob", up: 0, down: 1 }];
    expect(findDrift({ profiles, posts, responses, votes })).toEqual([]);
  });

  it("keeps a removed item's tally but leaves it out of Community XP and the post's answer count", () => {
    const posts = [post("p", "ann", { responses: 0, erased: 1 }), post("q", "ann", { deleted: true, removed: true, up: 1, score: 1 })];
    const responses = [resp("r", "p", "bob", { deleted: true, removed: true, up: 1, score: 1 })];
    const votes = [
      { post: "p", response: "r", value: 1 },
      { post: "q", response: null, value: 1 },
    ];
    const profiles = [{ uid: "ann", up: 0, down: 0 }, { uid: "bob", up: 0, down: 0 }];
    expect(findDrift({ profiles, posts, responses, votes })).toEqual([]);
  });

  it("finds and fixes wrong counts, stale acceptance and deleted items' votes", () => {
    const posts = [post("p", "ann", { up: 5, score: 5, responses: 3, accepted: "gone" }), post("d", "", { deleted: true, up: 2, score: 2 })];
    const responses = [resp("r", "p", "bob", { replies: 4 }), resp("e", "p", "", { deleted: true })];
    const votes = [{ post: "p", response: null, value: 1 }];
    const profiles = [{ uid: "ann", up: 9, down: 0 }];
    const drift = findDrift({ profiles, posts, responses, votes });
    expect(drift).toEqual([
      { path: "communityPosts/p", fix: { up: 1, score: 1, responses: 1, erased: 1, accepted: null }, stored: { up: 5, score: 5, responses: 3, erased: 0, accepted: "gone" } },
      { path: "communityPosts/d", fix: { up: 0, score: 0 }, stored: { up: 2, score: 2 } },
      { path: "communityPosts/p/responses/r", fix: { replies: 0 }, stored: { replies: 4 } },
      { path: "communityProfiles/ann", fix: { up: 1 }, stored: { up: 9 } },
    ]);
  });
});
