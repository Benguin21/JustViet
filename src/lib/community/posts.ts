/**
 * Post and response rules that don't need Firestore: cleaning and checking
 * what's typed, "Edited", what deleting does, and how dates read. Pure.
 */
import {
  BODY_MAX,
  BODY_MIN,
  EDIT_GRACE_MS,
  REPLY_MAX,
  RESPONSE_MAX,
  RESPONSE_MIN,
  TITLE_MAX,
  TITLE_MIN,
  linkProblem,
} from "./limits";
import { isCategory, isPostType, type Post, type PostType, type Response } from "./types";

/** A title as stored: NFC, single-spaced, trimmed. */
export function cleanTitle(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** A body as stored: NFC, \n line endings, trailing spaces and 3+ blank lines tidied, trimmed. */
export function cleanBody(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Length as the rules count it (UTF-16 code units of the cleaned text). */
export function textLength(s: string): number {
  return s.length;
}

export interface PostInput {
  type: PostType;
  category: string;
  title: string;
  body: string;
}

export type PostErrors = Partial<Record<"type" | "category" | "title" | "body", string>>;

export function validatePost(input: PostInput): PostErrors {
  const errors: PostErrors = {};
  const title = cleanTitle(input.title);
  const body = cleanBody(input.body);
  if (!isPostType(input.type)) errors.type = "Choose Question or Discussion.";
  if (!isCategory(input.category)) errors.category = "Choose a category.";
  if (title.length < TITLE_MIN) errors.title = `Titles need at least ${TITLE_MIN} characters.`;
  else if (title.length > TITLE_MAX) errors.title = `Titles can be up to ${TITLE_MAX} characters.`;
  else if (linkProblem(title)) errors.title = linkProblem(title)!;
  if (body.length < BODY_MIN) errors.body = `Write at least ${BODY_MIN} characters.`;
  else if (body.length > BODY_MAX) errors.body = `Posts can be up to ${BODY_MAX.toLocaleString("en-US")} characters.`;
  else if (linkProblem(body)) errors.body = linkProblem(body)!;
  return errors;
}

export function maxResponseLength(isReply: boolean): number {
  return isReply ? REPLY_MAX : RESPONSE_MAX;
}

export function validateResponse(body: string, isReply: boolean): string | null {
  const text = cleanBody(body);
  const max = maxResponseLength(isReply);
  if (text.length < RESPONSE_MIN) return "Write something first.";
  if (text.length > max) return `${isReply ? "Replies" : "Responses"} can be up to ${max.toLocaleString("en-US")} characters.`;
  return linkProblem(text);
}

/** "Edited" shows only for edits made more than five minutes after posting. */
export function showEdited(createdAt: number, editedAt: number | null): boolean {
  return editedAt != null && editedAt - createdAt > EDIT_GRACE_MS;
}

/**
 * What deleting a post does: "remove" deletes it outright (nothing hangs off
 * it); "erase" keeps it as "This post was deleted by its author." because it
 * has responses (or kept placeholders that still have replies).
 */
export function postDeleteMode(post: Pick<Post, "responses" | "erased">): "remove" | "erase" {
  return post.responses === 0 && post.erased === 0 ? "remove" : "erase";
}

/** Same for a response: a top-level one with replies is erased so its replies stay. Replies are always removed. */
export function responseDeleteMode(r: Pick<Response, "parent" | "replies">): "remove" | "erase" {
  return r.parent == null && r.replies > 0 ? "erase" : "remove";
}

export const DELETED_POST_TEXT = "This post was deleted by its author.";
export function deletedResponseText(type: PostType): string {
  return type === "question" ? "This answer was deleted by its author." : "This comment was deleted by its author.";
}

/** The "@Name " a reply to a reply starts with. */
export function mentionPrefix(name: string): string {
  return `@${name} `;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m ago", "3h ago", "2d ago", then a date ("Mar 4" this year, "Mar 4, 2025" before). */
export function formatAgo(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** "November 17, 2026" for join dates and the like. */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Start of the Top window: the last 7 or 30 days, or null for all time. */
export function topWindowStart(window: "week" | "month" | "all", now: number): number | null {
  if (window === "week") return now - 7 * DAY;
  if (window === "month") return now - 30 * DAY;
  return null;
}

/**
 * Orders a question's answers (accepted first, then highest score, then
 * oldest) or a discussion's comments (oldest first).
 */
export function orderResponses(type: PostType, responses: Response[], accepted: string | null): Response[] {
  const list = [...responses];
  if (type === "question") {
    list.sort(
      (a, b) =>
        Number(b.id === accepted) - Number(a.id === accepted) ||
        Number(a.deleted) - Number(b.deleted) ||
        b.score - a.score ||
        a.createdAt - b.createdAt,
    );
  } else {
    list.sort((a, b) => a.createdAt - b.createdAt);
  }
  return list;
}

/** The highest-voted answer, if it has a positive score (shown as "Highest voted"). */
export function highestVotedId(responses: Response[]): string | null {
  let best: Response | null = null;
  for (const r of responses) {
    if (r.deleted || r.parent != null || r.score <= 0) continue;
    if (!best || r.score > best.score || (r.score === best.score && r.createdAt < best.createdAt)) best = r;
  }
  return best?.id ?? null;
}
