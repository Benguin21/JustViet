import { describe, expect, it } from "vitest";
import {
  cleanBody,
  cleanTitle,
  formatAgo,
  highestVotedId,
  orderResponses,
  postDeleteMode,
  responseDeleteMode,
  showEdited,
  validatePost,
  validateResponse,
} from "./posts";
import type { Response } from "./types";

const MIN = 60_000;

describe("cleaning", () => {
  it("normalizes titles and bodies the way they're stored", () => {
    expect(cleanTitle("  Cách   dùng\n'được'  ")).toBe("Cách dùng 'được'");
    expect(cleanBody("a  \r\nb\n\n\n\nc  ")).toBe("a\nb\n\nc");
    expect(cleanTitle("Hà")).toBe("Hà");
  });
});

describe("validatePost", () => {
  const ok = { type: "question" as const, category: "grammar", title: "How do I use được?", body: "I keep seeing được after verbs." };
  it("accepts a valid post", () => expect(validatePost(ok)).toEqual({}));
  it("checks title and body lengths after cleaning", () => {
    expect(validatePost({ ...ok, title: "   short    " }).title).toMatch(/at least 10/);
    expect(validatePost({ ...ok, title: "x".repeat(151) }).title).toMatch(/up to 150/);
    expect(validatePost({ ...ok, body: "too short" }).body).toMatch(/at least 20/);
    expect(validatePost({ ...ok, body: "x".repeat(5001) }).body).toMatch(/5,000/);
  });
  it("needs a category", () => expect(validatePost({ ...ok, category: "memes" }).category).toBeDefined());
});

describe("validateResponse", () => {
  it("allows 1–5,000 characters for answers and 1–1,000 for replies", () => {
    expect(validateResponse("  ", false)).toMatch(/Write something/);
    expect(validateResponse("x", false)).toBeNull();
    expect(validateResponse("x".repeat(5000), false)).toBeNull();
    expect(validateResponse("x".repeat(5001), false)).toMatch(/5,000/);
    expect(validateResponse("x".repeat(1001), true)).toMatch(/1,000/);
  });
});

describe("showEdited", () => {
  it("shows only for edits more than 5 minutes after posting", () => {
    expect(showEdited(0, null)).toBe(false);
    expect(showEdited(0, 5 * MIN)).toBe(false);
    expect(showEdited(0, 5 * MIN + 1)).toBe(true);
  });
});

describe("delete modes", () => {
  it("removes a post with nothing under it, erases one with responses", () => {
    expect(postDeleteMode({ responses: 0, erased: 0 })).toBe("remove");
    expect(postDeleteMode({ responses: 2, erased: 0 })).toBe("erase");
    expect(postDeleteMode({ responses: 0, erased: 1 })).toBe("erase");
  });
  it("erases a top-level response with replies; replies are removed", () => {
    expect(responseDeleteMode({ parent: null, replies: 0 })).toBe("remove");
    expect(responseDeleteMode({ parent: null, replies: 3 })).toBe("erase");
    expect(responseDeleteMode({ parent: "r1", replies: 0 })).toBe("remove");
  });
});

describe("formatAgo", () => {
  const now = Date.UTC(2026, 10, 17, 12);
  it("reads naturally", () => {
    expect(formatAgo(now - 10_000, now)).toBe("just now");
    expect(formatAgo(now - 5 * MIN, now)).toBe("5m ago");
    expect(formatAgo(now - 3 * 60 * MIN, now)).toBe("3h ago");
    expect(formatAgo(now - 2 * 24 * 60 * MIN, now)).toBe("2d ago");
    expect(formatAgo(Date.UTC(2025, 2, 4, 12), now)).toMatch(/2025/);
  });
});

const resp = (id: string, extra: Partial<Response> = {}): Response => ({
  id, post: "p", parent: null, author: "a", body: "x", createdAt: 0, editedAt: null, up: 0, down: 0, score: 0, replies: 0, deleted: false, removed: false, mention: null, ...extra,
});

describe("ordering responses", () => {
  it("puts a question's accepted answer first, then by score, then oldest", () => {
    const list = [resp("a", { score: 1, createdAt: 1 }), resp("b", { score: 5, createdAt: 2 }), resp("c", { score: 1, createdAt: 0 }), resp("d", { score: 0 })];
    expect(orderResponses("question", list, "d").map((r) => r.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("keeps a discussion's comments in time order", () => {
    const list = [resp("a", { createdAt: 3, score: 9 }), resp("b", { createdAt: 1 })];
    expect(orderResponses("discussion", list, null).map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("finds the highest voted answer only when its score is positive", () => {
    expect(highestVotedId([resp("a", { score: 0 })])).toBeNull();
    expect(highestVotedId([resp("a", { score: 2, createdAt: 2 }), resp("b", { score: 2, createdAt: 1 }), resp("c", { score: 9, deleted: true })])).toBe("b");
  });
});
