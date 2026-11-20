/**
 * Where the learner is on the Grammar path. Every lesson and guide is open from the start; a
 * finished lesson shows a bloomed lotus. A lesson counts as finished once the XP ledger holds its
 * `grammar-new_{id}` event (completeGrammarLesson in src/lib/xp/repository.ts), so finishing one
 * needs no separate record. Pure.
 */
import type { GrammarLesson } from "./curriculum";

/**
 * The lesson the avatar stands on: the one after the furthest finished lesson (the last lesson
 * once that's finished too), or the first lesson. Going by the furthest one, not the first
 * unfinished one, means a lesson inserted behind the learner later shows as a closed lotus they
 * can go back to, without pulling the avatar back down the path.
 */
export function avatarIndex(lessons: readonly GrammarLesson[], completed: ReadonlySet<string>): number {
  let furthest = -1;
  lessons.forEach((l, i) => {
    if (completed.has(l.id)) furthest = i;
  });
  return Math.max(0, Math.min(lessons.length - 1, furthest + 1));
}

export function countCompleted(lessons: readonly GrammarLesson[], completed: ReadonlySet<string>): number {
  return lessons.reduce((n, l) => n + (completed.has(l.id) ? 1 : 0), 0);
}
