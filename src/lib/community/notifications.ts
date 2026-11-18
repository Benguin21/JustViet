/**
 * In-app notifications: who gets one for what, their deterministic ids, and
 * what they say. Pure. They're written into the recipient's inbox
 * (`communityInbox/{uid}/notifications/{id}`) in the same transaction as the
 * action that causes them, and firestore.rules checks the recipient really
 * is the post's author, the replied-to author, the person mentioned, the
 * accepted answer's author, or (for moderation) the member concerned.
 */
import { formatDate } from "./posts";
import type { PostType } from "./types";

export type MemberNotificationType = "response" | "reply" | "mention" | "accepted";
export type ModNotificationType = "removed" | "restored" | "warning" | "suspended" | "unsuspended" | "banned" | "unbanned";
export type NotificationType = MemberNotificationType | ModNotificationType;

export const MOD_NOTIFICATION_TYPES: readonly ModNotificationType[] = [
  "removed",
  "restored",
  "warning",
  "suspended",
  "unsuspended",
  "banned",
  "unbanned",
];

export function isModNotification(type: string): type is ModNotificationType {
  return (MOD_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export interface CommunityNotification {
  id: string;
  type: NotificationType;
  /** The member who caused it, or "mod" for moderation (moderators stay anonymous). */
  from: string;
  post: string | null;
  response: string | null;
  /** A moderator's reason ("" for member notifications). */
  reason: string;
  /** When a suspension ends. */
  until: number | null;
  at: number;
  read: boolean;
}

/** One notification per response and kind (and per accepted answer), so a retry can't send two. */
export function memberNotificationId(type: MemberNotificationType, post: string, response: string): string {
  return `${type}_${post}_${response}`;
}

/**
 * Who hears about a new answer, comment or reply: the post's author (for an
 * answer/comment), the author of the answer/comment replied to, and anyone
 * mentioned with "@Name". Never the person who wrote it, never twice, and
 * never a deleted author ("").
 */
export function recipientsForResponse(input: {
  actor: string;
  postAuthor: string;
  parentAuthor: string | null;
  mention: string | null;
}): { to: string; type: "response" | "reply" | "mention" }[] {
  const out: { to: string; type: "response" | "reply" | "mention" }[] = [];
  const add = (to: string | null, type: "response" | "reply" | "mention") => {
    if (to && to !== input.actor && !out.some((o) => o.to === to)) out.push({ to, type });
  };
  if (input.parentAuthor == null) add(input.postAuthor, "response");
  else {
    add(input.parentAuthor, "reply");
    add(input.mention, "mention");
  }
  return out;
}

/** Where tapping a notification goes (null when there's nothing to open). */
export function notificationHref(n: Pick<CommunityNotification, "post" | "response">): string | null {
  if (!n.post) return null;
  return `/community/post?id=${n.post}${n.response ? `#r-${n.response}` : ""}`;
}

/** What a notification says. `sender` is the member's name ("Someone" if unknown). */
export function describeNotification(
  n: Pick<CommunityNotification, "type" | "response" | "until">,
  ctx: { sender: string; postTitle: string | null; postType: PostType | null },
): string {
  const on = ctx.postTitle ? ` “${ctx.postTitle}”` : "";
  const answer = ctx.postType === "discussion" ? "comment" : "answer";
  const item = n.response == null ? "post" : "response";
  switch (n.type) {
    case "response":
      return ctx.postType === "discussion"
        ? `${ctx.sender} commented on your discussion${on}`
        : `${ctx.sender} answered your question${on}`;
    case "reply":
      return `${ctx.sender} replied to your ${answer}${on ? ` on${on}` : ""}`;
    case "mention":
      return `${ctx.sender} mentioned you in a reply${on ? ` on${on}` : ""}`;
    case "accepted":
      return `${ctx.sender} accepted your answer${on ? ` to${on}` : ""}`;
    case "removed":
      return `A moderator removed your ${item}${on ? ` on${on}` : ""}`;
    case "restored":
      return `A moderator restored your ${item}${on ? ` on${on}` : ""}`;
    case "warning":
      return "Warning from a moderator";
    case "suspended":
      return n.until
        ? `You can't post, answer, vote or report in the Community until ${formatDate(n.until)}`
        : "You've been suspended from posting in the Community";
    case "unsuspended":
      return "Your suspension was lifted. Welcome back!";
    case "banned":
      return "You've been banned from the Community";
    case "unbanned":
      return "Your ban was lifted. Welcome back to the Community!";
  }
}
