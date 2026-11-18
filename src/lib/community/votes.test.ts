import { describe, expect, it } from "vitest";
import { applyVote, communityXp, nextVote, voteDelta, voteId, xpDelta } from "./votes";
import type { VoteValue } from "./types";

describe("nextVote", () => {
  it("clicking your current vote removes it; the other one switches", () => {
    expect(nextVote(0, 1)).toBe(1);
    expect(nextVote(1, 1)).toBe(0);
    expect(nextVote(1, -1)).toBe(-1);
    expect(nextVote(-1, -1)).toBe(0);
    expect(nextVote(-1, 1)).toBe(1);
  });
});

describe("vote transitions", () => {
  const cases: [VoteValue, VoteValue, { up: number; down: number }, number][] = [
    [0, 1, { up: 1, down: 0 }, 1],
    [0, -1, { up: 0, down: 1 }, -1],
    [1, 0, { up: -1, down: 0 }, -1],
    [-1, 0, { up: 0, down: -1 }, 1],
    [1, -1, { up: -1, down: 1 }, -2],
    [-1, 1, { up: 1, down: -1 }, 2],
    [1, 1, { up: 0, down: 0 }, 0],
  ];
  it.each(cases)("%i → %i", (before, after, delta, xp) => {
    expect(voteDelta(before, after)).toEqual(delta);
    expect(xpDelta(before, after)).toBe(xp);
  });

  it("applies to counts and keeps score = up − down", () => {
    expect(applyVote({ up: 3, down: 1 }, 1, -1)).toEqual({ up: 2, down: 2, score: 0 });
    expect(applyVote({ up: 0, down: 0 }, 0, -1)).toEqual({ up: 0, down: 1, score: -1 });
  });
});

describe("communityXp", () => {
  it("is upvotes minus downvotes, can go negative, isn't capped", () => {
    expect(communityXp({ up: 0, down: 0 })).toBe(0);
    expect(communityXp({ up: 2, down: 5 })).toBe(-3);
    expect(communityXp({ up: 100000, down: 1 })).toBe(99999);
  });
});

describe("voteId", () => {
  it("is deterministic per item and voter", () => {
    expect(voteId("P1", null, "u1")).toBe("p_P1_u1");
    expect(voteId("P1", "R1", "u1")).toBe("r_P1_R1_u1");
    expect(voteId("P1", "R1", "u1")).toBe(voteId("P1", "R1", "u1"));
  });
});
