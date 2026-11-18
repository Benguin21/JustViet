/**
 * "Delete my account": everything the browser is allowed to delete, in an
 * order that keeps every count right, then the sign-in account itself.
 *
 *  1. Community (see `deleteCommunityData`): votes withdrawn, posts and
 *     answers deleted or erased, removed text, notifications, hidden posts,
 *     blocks, then the profile and name.
 *  2. Learning data (see account/repository.ts).
 *  3. The Firebase sign-in account (the caller runs this through
 *     `withRecentLogin`, since Firebase needs a recent sign-in).
 *
 * Left behind until scripts/purge-deleted-accounts.mts runs (the Privacy
 * Policy promises within 30 days): the XP ledger, the 13+ answer and the
 * Community activity record, which the rules protect; and Community content
 * of a banned member. Every step is safe to run again if it was interrupted.
 */
import { deleteCommunityData, type CommunityDeletionStep } from "@/lib/community/repository";
import { deleteLearningData } from "./repository";

export type DeletionStep = CommunityDeletionStep | "learning";

export const STEP_LABELS: Record<DeletionStep, string> = {
  votes: "Withdrawing your votes",
  responses: "Deleting your answers, comments and replies",
  posts: "Deleting your posts",
  inbox: "Deleting notifications, hidden posts and blocks",
  profile: "Deleting your community profile",
  learning: "Deleting your flashcards, dictionary words and settings",
};

export interface DeletionProgress {
  step: DeletionStep;
  done: number;
  total: number;
}

export async function deleteMyData(uid: string, onProgress: (p: DeletionProgress) => void): Promise<void> {
  await deleteCommunityData(uid, (step, done, total) => onProgress({ step, done, total }));
  await deleteLearningData(uid, (done, total) => onProgress({ step: "learning", done, total }));
}
