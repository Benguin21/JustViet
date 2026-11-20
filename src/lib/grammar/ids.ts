/**
 * Grammar lesson IDs. A lesson's ID is its permanent identity: progress (the XP ledger's
 * `grammar-new_{id}` event), its teacher and its future lesson and guide content are all filed
 * under it. It lives in the curriculum spreadsheet's ID column and never changes once given, even
 * when the lesson is renamed, moved to another level or has lessons inserted around it. Only the
 * spreadsheet's row order decides where a lesson sits on the map.
 *
 * IDs go into Firestore document ids (`isSourceId` in src/lib/xp/events.ts), so they keep to
 * lowercase letters, digits and single hyphens.
 */
// Relative, not "@/…": scripts/import-grammar.mts runs this file on plain Node.
import { foldDiacritics } from "../dictionary/normalize";

export const LESSON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LESSON_ID_MAX = 60;

export function isLessonId(id: unknown): id is string {
  return typeof id === "string" && id.length <= LESSON_ID_MAX && LESSON_ID_PATTERN.test(id);
}

/**
 * An ID made from a title, for a new lesson: "The Linking Verb Là" → "linking-verb-la". Accents
 * are folded, a leading article dropped, and a number added if the ID is already taken. Only a
 * suggestion: once it's in the spreadsheet, the ID stays even if the title changes.
 */
export function suggestLessonId(title: string, taken: ReadonlySet<string> = new Set()): string {
  let base = foldDiacritics(title)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(the|a|an)-(?=.)/, "");
  if (!base) base = "lesson";
  if (base.length > LESSON_ID_MAX - 4) base = base.slice(0, LESSON_ID_MAX - 4).replace(/-+$/, "");
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
