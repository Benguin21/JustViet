/**
 * The grammar directory's search: accent-insensitive, over each lesson's title and level name.
 * Every word typed must appear (as the start of a word, or anywhere for words of 3+ letters), so
 * "co khong" finds "Có ... Không Questions". Results keep course order, with titles that start
 * with the query first. Pure.
 */
import { foldDiacritics } from "@/lib/dictionary/normalize";
import type { GrammarLesson } from "./curriculum";

const fold = (text: string) => foldDiacritics(text).replace(/[^a-z0-9]+/g, " ").trim();

export function searchLessons(lessons: readonly GrammarLesson[], query: string): GrammarLesson[] {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return [...lessons];
  const q = words.join(" ");
  const hits: { lesson: GrammarLesson; rank: number }[] = [];
  for (const lesson of lessons) {
    const title = fold(lesson.title);
    const haystack = ` ${title} ${fold(lesson.level.name)}`;
    const all = words.every((w) => haystack.includes(` ${w}`) || (w.length >= 3 && haystack.includes(w)));
    if (!all) continue;
    hits.push({ lesson, rank: title.startsWith(q) ? 0 : ` ${title}`.includes(` ${q}`) ? 1 : 2 });
  }
  return hits.sort((a, b) => a.rank - b.rank || a.lesson.order - b.lesson.order).map((h) => h.lesson);
}
