/**
 * Turns the curriculum spreadsheet (data/grammar/just-viet-grammar.xlsx) into the lesson list the
 * app ships (curriculum.json). Pure, so it's unit tested; scripts/import-grammar.mts reads the
 * file and writes the result.
 *
 * - Columns are matched by header name (HEADER_ALIASES), so their order doesn't matter.
 * - Lessons appear in row order within their level. A row filed under an earlier level than the
 *   rows above it still goes to its own level (the sort keeps row order within a level).
 * - Every lesson needs an ID that never changes (see ids.ts). A missing, malformed or repeated ID
 *   is an error, and the import writes nothing until it's fixed; a missing one comes with a
 *   suggestion to paste in.
 * - Teachers: a Teacher column, if there is one, pins a lesson's teacher. Otherwise a lesson keeps
 *   the teacher it had in the previous curriculum.json, and a new lesson takes the opposite of the
 *   lesson before it. So inserting a lesson never swaps the teacher of the lessons around it.
 */
// Relative, not "@/…": scripts/import-grammar.mts runs this file on plain Node.
import type { TeacherId } from "../lessons/teachers";
import { isLessonId, suggestLessonId } from "./ids";
import { GRAMMAR_LEVELS, levelFromName } from "./levels";

/** One lesson as stored in curriculum.json. */
export interface CurriculumEntry {
  id: string;
  title: string;
  /** A GrammarLevel id ("beginner-1"). */
  level: string;
  teacher: TeacherId;
}

export interface CurriculumFile {
  version: 1;
  source: string;
  lessons: CurriculumEntry[];
}

export type ImportField = "title" | "level" | "id" | "teacher";

export const HEADER_ALIASES: Record<ImportField, readonly string[]> = {
  title: ["app title", "title", "lesson", "lesson title", "name"],
  level: ["difficulty", "level"],
  id: ["id", "lesson id"],
  teacher: ["teacher"],
};

export interface ImportIssue {
  /** The spreadsheet row, counting the header as row 1. */
  row: number;
  message: string;
}

export interface ImportResult {
  lessons: CurriculumEntry[];
  /** Problems that stop the import. */
  errors: ImportIssue[];
  /** Worth a look, but the import goes ahead. */
  warnings: ImportIssue[];
  columns: Partial<Record<ImportField, number>>;
  ignoredHeaders: string[];
}

function teacherFromCell(cell: string): TeacherId | null | "bad" {
  const t = cell.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!t) return null;
  if (/\btuoi\b/.test(t)) return "tuoi";
  if (/\bvinh\b/.test(t)) return "vinh";
  return "bad";
}

export function mapCurriculumRows(rows: readonly (readonly string[])[], previous: readonly CurriculumEntry[] = []): ImportResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const columns: Partial<Record<ImportField, number>> = {};
  const ignoredHeaders: string[] = [];
  header.forEach((h, i) => {
    const field = (Object.keys(HEADER_ALIASES) as ImportField[]).find((f) => HEADER_ALIASES[f].includes(h));
    if (field && columns[field] === undefined) columns[field] = i;
    else if (h) ignoredHeaders.push(rows[0][i].trim());
  });
  for (const field of ["title", "level", "id"] as const) {
    if (columns[field] === undefined) {
      errors.push({ row: 1, message: `No ${field === "level" ? "Difficulty" : field === "id" ? "ID" : "title"} column (headers: ${HEADER_ALIASES[field].join(", ")}).` });
    }
  }
  if (errors.length) return { lessons: [], errors, warnings, columns, ignoredHeaders };

  const cell = (row: readonly string[], field: ImportField) => {
    const i = columns[field];
    return i === undefined ? "" : (row[i] ?? "").replace(/\s+/g, " ").trim();
  };
  const prevTeacher = new Map(previous.map((p) => [p.id, p.teacher]));
  const allIds = new Set(rows.slice(1).map((r) => cell(r, "id")).filter(Boolean));
  const seenIds = new Map<string, number>();
  const seenTitles = new Map<string, number>();
  const picked: { entry: Omit<CurriculumEntry, "teacher">; teacher: TeacherId | null; levelIndex: number; at: number }[] = [];

  rows.slice(1).forEach((row, i) => {
    const rowNo = i + 2;
    const title = cell(row, "title");
    const levelName = cell(row, "level");
    const id = cell(row, "id");
    if (!title && !levelName && !id) return;
    let ok = true;
    if (!title) {
      errors.push({ row: rowNo, message: "Missing title." });
      ok = false;
    }
    const level = levelFromName(levelName);
    if (!level) {
      errors.push({
        row: rowNo,
        message: levelName
          ? `Unknown difficulty "${levelName}" (use one of: ${GRAMMAR_LEVELS.map((l) => l.name).join(", ")}).`
          : "Missing difficulty.",
      });
      ok = false;
    }
    if (!id) {
      const suggestion = suggestLessonId(title || "lesson", allIds);
      allIds.add(suggestion);
      errors.push({ row: rowNo, message: `Missing ID. Suggested: ${suggestion}` });
      ok = false;
    } else if (!isLessonId(id)) {
      errors.push({
        row: rowNo,
        message: `ID "${id}" can only use lowercase letters, digits and single hyphens (at most 60 characters). Suggested: ${suggestLessonId(id)}`,
      });
      ok = false;
    } else if (seenIds.has(id)) {
      errors.push({ row: rowNo, message: `ID "${id}" is already used on row ${seenIds.get(id)}.` });
      ok = false;
    } else seenIds.set(id, rowNo);
    let teacher: TeacherId | null = null;
    if (columns.teacher !== undefined) {
      const t = teacherFromCell(cell(row, "teacher"));
      if (t === "bad") {
        errors.push({ row: rowNo, message: `Unknown teacher "${cell(row, "teacher")}" (use Cô Tươi or Thầy Vinh, or leave it blank).` });
        ok = false;
      } else teacher = t;
    }
    const titleKey = title.toLowerCase();
    if (title && seenTitles.has(titleKey)) {
      warnings.push({ row: rowNo, message: `Same title as row ${seenTitles.get(titleKey)}: "${title}".` });
    } else if (title) seenTitles.set(titleKey, rowNo);
    if (ok && level) picked.push({ entry: { id, title, level: level.id }, teacher, levelIndex: level.index, at: rowNo });
  });

  // Row order within each level (Array.prototype.sort is stable).
  picked.sort((a, b) => a.levelIndex - b.levelIndex);
  const lessons: CurriculumEntry[] = [];
  for (const p of picked) {
    const before = lessons[lessons.length - 1];
    const teacher: TeacherId =
      p.teacher ?? prevTeacher.get(p.entry.id) ?? (before ? (before.teacher === "tuoi" ? "vinh" : "tuoi") : "tuoi");
    lessons.push({ ...p.entry, teacher });
  }
  return { lessons, errors, warnings, columns, ignoredHeaders };
}

/** curriculum.json's text: one lesson per line, so each change reads as a one-line diff. */
export function serializeCurriculum(file: CurriculumFile): string {
  const body = file.lessons.map((l) => `  ${JSON.stringify(l)}`).join(",\n");
  return `{"version":${file.version},"source":${JSON.stringify(file.source)},"lessons":[\n${body}\n]}\n`;
}
