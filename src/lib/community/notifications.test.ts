import { describe, expect, it } from "vitest";
import { describeNotification, isModNotification, memberNotificationId, notificationHref, recipientsForResponse } from "./notifications";

describe("recipientsForResponse", () => {
  it("notifies the post's author about an answer or comment", () => {
    expect(recipientsForResponse({ actor: "b", postAuthor: "a", parentAuthor: null, mention: null })).toEqual([{ to: "a", type: "response" }]);
  });

  it("never notifies yourself or a deleted author", () => {
    expect(recipientsForResponse({ actor: "a", postAuthor: "a", parentAuthor: null, mention: null })).toEqual([]);
    expect(recipientsForResponse({ actor: "b", postAuthor: "", parentAuthor: null, mention: null })).toEqual([]);
  });

  it("notifies the replied-to author and the mentioned member once each", () => {
    expect(recipientsForResponse({ actor: "c", postAuthor: "a", parentAuthor: "b", mention: "d" })).toEqual([
      { to: "b", type: "reply" },
      { to: "d", type: "mention" },
    ]);
    // Mentioning the parent's author doesn't send a second notification.
    expect(recipientsForResponse({ actor: "c", postAuthor: "a", parentAuthor: "b", mention: "b" })).toEqual([{ to: "b", type: "reply" }]);
    // Replying under your own answer, mentioning someone else, only notifies them.
    expect(recipientsForResponse({ actor: "b", postAuthor: "a", parentAuthor: "b", mention: "d" })).toEqual([{ to: "d", type: "mention" }]);
  });
});

describe("ids, links and text", () => {
  it("has one id per response and kind", () => {
    expect(memberNotificationId("reply", "P", "R")).toBe("reply_P_R");
  });

  it("links to the post, and the response within it", () => {
    expect(notificationHref({ post: "P", response: "R" })).toBe("/community/post?id=P#r-R");
    expect(notificationHref({ post: "P", response: null })).toBe("/community/post?id=P");
    expect(notificationHref({ post: null, response: null })).toBeNull();
  });

  it("reads naturally", () => {
    const ctx = { sender: "Bảo", postTitle: "How do I use được?", postType: "question" as const };
    expect(describeNotification({ type: "response", response: "R", until: null }, ctx)).toBe("Bảo answered your question “How do I use được?”");
    expect(describeNotification({ type: "response", response: "R", until: null }, { ...ctx, postType: "discussion" })).toMatch(/commented on your discussion/);
    expect(describeNotification({ type: "accepted", response: "R", until: null }, ctx)).toMatch(/^Bảo accepted your answer to/);
    expect(describeNotification({ type: "removed", response: null, until: null }, ctx)).toMatch(/^A moderator removed your post/);
    expect(describeNotification({ type: "suspended", response: null, until: Date.UTC(2026, 10, 25, 12) }, ctx)).toMatch(/until November 25, 2026/);
    expect(isModNotification("warning")).toBe(true);
    expect(isModNotification("reply")).toBe(false);
  });
});
