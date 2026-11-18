/**
 * Moderation rules that don't need Firestore: who's suspended, how long a
 * suspension lasts, the private key a removed item's text is kept under, and
 * how open reports are grouped for the moderator queue. Pure.
 *
 * Moderators are members whose Firebase account carries the custom claim
 * `moderator: true`, given and taken away by an admin with
 * `scripts/community-moderator.mts`. The rules check the claim, so nothing a
 * browser does can make someone a moderator.
 */
import type { ReportReason } from "./types";

/** Suspension lengths a moderator can choose. */
export const SUSPENSION_DAYS = [1, 3, 7, 30] as const;
/** Longest reason a moderator can give (mirrored in firestore.rules as MOD_REASON_MAX). */
export const MOD_REASON_MAX = 500;

const DAY_MS = 86_400_000;

export type ModAction = "remove" | "restore" | "dismiss" | "warn" | "suspend" | "unsuspend" | "ban" | "unban" | "rename" | "void";
export const MOD_ACTIONS: readonly ModAction[] = [
  "remove",
  "restore",
  "dismiss",
  "warn",
  "suspend",
  "unsuspend",
  "ban",
  "unban",
  "rename",
  "void",
];

/**
 * The neutral name a moderator gives an account whose name breaks the
 * guidelines: "Member " and six digits (firestore.rules checks the shape).
 * The member can then choose a new name straight away.
 */
export function placeholderName(random: () => number = Math.random): string {
  return `Member ${String(Math.floor(random() * 1_000_000)).padStart(6, "0")}`;
}
export const PLACEHOLDER_NAME_PATTERN = /^Member [0-9]{6}$/;

export function suspensionEnd(now: number, days: number): number {
  return now + days * DAY_MS;
}

export function isSuspended(suspendedUntil: number | null | undefined, now: number): boolean {
  return suspendedUntil != null && suspendedUntil > now;
}

/** The id of a removed item's private copy: `p_{post}` or `r_{post}_{response}`. */
export function removedKey(post: string, response: string | null): string {
  return response == null ? `p_${post}` : `r_${post}_${response}`;
}

export function parseRemovedKey(key: string): { post: string; response: string | null } | null {
  const parts = key.split("_");
  if (parts[0] === "p" && parts.length === 2) return { post: parts[1], response: null };
  if (parts[0] === "r" && parts.length === 3) return { post: parts[1], response: parts[2] };
  return null;
}

export interface ReportRecord {
  id: string;
  kind: "post" | "response" | "reply" | "profile";
  post: string | null;
  response: string | null;
  profile: string | null;
  reason: ReportReason;
  note: string;
  at: number;
}

export interface ReportGroup {
  /** "post:P", "response:P/R" or "profile:U". */
  key: string;
  kind: ReportRecord["kind"];
  post: string | null;
  response: string | null;
  profile: string | null;
  reports: ReportRecord[];
  /** How many reports gave each reason. */
  reasons: Partial<Record<ReportReason, number>>;
  /** Non-empty notes, oldest first. */
  notes: string[];
  firstAt: number;
}

export function reportTargetKey(r: Pick<ReportRecord, "kind" | "post" | "response" | "profile">): string {
  if (r.kind === "profile") return `profile:${r.profile}`;
  return r.response == null ? `post:${r.post}` : `response:${r.post}/${r.response}`;
}

/**
 * Open reports grouped by what they're about, most-reported first, then the
 * longest waiting. One group is one decision for a moderator.
 */
export function groupReports(reports: ReportRecord[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const r of [...reports].sort((a, b) => a.at - b.at)) {
    const key = reportTargetKey(r);
    const g =
      groups.get(key) ??
      ({ key, kind: r.kind, post: r.post, response: r.response, profile: r.profile, reports: [], reasons: {}, notes: [], firstAt: r.at } as ReportGroup);
    g.reports.push(r);
    g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    if (r.note.trim()) g.notes.push(r.note.trim());
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length || a.firstAt - b.firstAt);
}
