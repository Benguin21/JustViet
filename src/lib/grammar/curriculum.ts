/**
 * The grammar curriculum as the app uses it: every lesson in path order, with its level, its
 * place in the course and in its level, and its teacher. Built from curriculum.json, which
 * `npm run grammar:import` generates from data/grammar/just-viet-grammar.xlsx (never edit the JSON
 * by hand). Pure apart from that import.
 */
import type { TeacherId } from "@/lib/lessons/teachers";
import type { CurriculumEntry } from "./curriculum-import";
import file from "./curriculum.json";
import { GRAMMAR_LEVELS, levelById, type GrammarLevel } from "./levels";

export interface GrammarLesson {
  id: string;
  title: string;
  level: GrammarLevel;
  /** Its place on the whole path, from 1. */
  order: number;
  /** Its place within its level, from 1. */
  number: number;
  /** Who teaches it, start to finish (pinned by the import, see curriculum-import.ts). */
  teacher: TeacherId;
}

export interface Curriculum {
  lessons: readonly GrammarLesson[];
  /** Each level's lessons, in GRAMMAR_LEVELS order (a level with none has an empty list). */
  byLevel: readonly { level: GrammarLevel; lessons: readonly GrammarLesson[] }[];
  byId: ReadonlyMap<string, GrammarLesson>;
}

export function buildCurriculum(entries: readonly CurriculumEntry[]): Curriculum {
  const counts = new Map<string, number>();
  const lessons: GrammarLesson[] = [];
  for (const e of entries) {
    const level = levelById(e.level);
    if (!level) continue;
    const number = (counts.get(level.id) ?? 0) + 1;
    counts.set(level.id, number);
    lessons.push({ id: e.id, title: e.title, level, order: lessons.length + 1, number, teacher: e.teacher });
  }
  return {
    lessons,
    byLevel: GRAMMAR_LEVELS.map((level) => ({ level, lessons: lessons.filter((l) => l.level.id === level.id) })),
    byId: new Map(lessons.map((l) => [l.id, l])),
  };
}

export const CURRICULUM: Curriculum = buildCurriculum(file.lessons as CurriculumEntry[]);
