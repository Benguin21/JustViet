/**
 * The Community's shared vocabulary. Timestamps are epoch-ms numbers, as in
 * the rest of the app (the repository converts Firestore `Timestamp`s).
 *
 * Data model (all enforced by firestore.rules; see "Community" in AGENTS.md):
 *  - communityAge/{uid}         the 13+ answer, written once, owner-only
 *  - communityProfiles/{uid}    display name, avatar colour, votes received, join date, guidelines
 *  - communityNames/{nameKey}   claims a name (unique ignoring case and accents)
 *  - communityActivity/{uid}    the per-user "last action" record behind the rate limits, owner-only
 *  - communityPosts/{postId}    questions and discussions
 *    └ responses/{responseId}   answers/comments (parent null) and their replies (parent = response id)
 *  - communityVotes/{voteId}    one per item and voter, readable only by the voter
 *  - communityReports/{id}      one per item and reporter, readable only by the reporter (Phase 2 reads them)
 *  - users/{uid}/communityHidden/{postId}, users/{uid}/communityBlocks/{uid}   private, owner-only
 */

export type PostType = "question" | "discussion";
export const POST_TYPES: readonly PostType[] = ["question", "discussion"];

export const CATEGORIES = [
  { id: "grammar", label: "Grammar" },
  { id: "vocabulary", label: "Vocabulary" },
  { id: "pronunciation", label: "Pronunciation" },
  { id: "culture", label: "Culture" },
  { id: "tips", label: "Learning Tips" },
  { id: "other", label: "Other" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

export function isCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value);
}

export function isPostType(value: unknown): value is PostType {
  return value === "question" || value === "discussion";
}

/** What a top-level response is called on each post type. */
export function responseNoun(type: PostType, count = 1): string {
  const one = type === "question" ? "answer" : "comment";
  return count === 1 ? one : `${one}s`;
}

export interface CommunityProfile {
  uid: string;
  name: string;
  /** The folded name (see names.ts), also the id of its communityNames claim. */
  nameKey: string;
  color: string;
  /** Upvotes and downvotes received on the member's posts and top-level responses that aren't deleted. */
  up: number;
  down: number;
  joinedAt: number;
  /** When the name was last changed (null until the first change). */
  nameChangedAt: number | null;
  /** When the member accepted the community guidelines (null until their first contribution). */
  guidelinesAt: number | null;
}

export interface Post {
  id: string;
  type: PostType;
  category: CategoryId;
  title: string;
  body: string;
  /** The author's uid, or "" once the author has deleted the post (its text is erased too). */
  author: string;
  createdAt: number;
  editedAt: number | null;
  up: number;
  down: number;
  score: number;
  /** Top-level responses (answers or comments) that aren't deleted. */
  responses: number;
  /** Top-level responses deleted by their authors but kept because they have replies. */
  erased: number;
  /** The accepted answer's id (questions only). */
  accepted: string | null;
  deleted: boolean;
}

export interface Response {
  id: string;
  post: string;
  /** null for a top-level response (answer/comment); the response's id for a reply. */
  parent: string | null;
  author: string;
  body: string;
  createdAt: number;
  editedAt: number | null;
  up: number;
  down: number;
  score: number;
  /** Replies under a top-level response (replies are deleted outright, so all of these exist). */
  replies: number;
  deleted: boolean;
  /** For a reply to a reply: the uid of the person it answers (its body starts with "@Name"). */
  mention: string | null;
}

export type VoteValue = -1 | 0 | 1;

/** What a vote, report or block points at. */
export interface ItemRef {
  post: string;
  /** null when the item is the post itself. */
  response: string | null;
}

/** The per-user "last action" record, as the client needs it for the friendly rate-limit messages. */
export interface Activity {
  lastPost: number | null;
  lastResponse: number | null;
  lastVote: number | null;
  /** UTC day number (epoch ms / 86 400 000) the report count is for. */
  reportDay: number;
  reports: number;
}

export const EMPTY_ACTIVITY: Activity = { lastPost: null, lastResponse: null, lastVote: null, reportDay: 0, reports: 0 };

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or hate" },
  { id: "spam", label: "Spam or scams" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "privacy", label: "Privacy concern" },
  { id: "off-topic", label: "Off-topic" },
  { id: "other", label: "Other" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export type ReportTarget =
  | { kind: "post"; post: string }
  | { kind: "response" | "reply"; post: string; response: string }
  | { kind: "profile"; uid: string };

export type FeedSort = "newest" | "top" | "unanswered";
export type TopWindow = "week" | "month" | "all";
export type TypeFilter = "all" | PostType;
