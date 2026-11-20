/**
 * Imports the grammar curriculum from its spreadsheet into `src/lib/grammar/curriculum.json`,
 * the lesson list the Grammar tab's map and directory are built from.
 *
 *   npm run grammar:import                  (defaults to data/grammar/just-viet-grammar.xlsx)
 *   npm run grammar:import -- path/to/file.xlsx
 *
 * Accepts .xlsx (first worksheet), .csv or .tsv, with headers in the first row: the lesson title
 * ("App Title"), "Difficulty" (Beginner I … Master) and "ID", plus an optional "Teacher". The
 * rules are in src/lib/grammar/curriculum-import.ts. If any row has a problem, nothing is written.
 * Runs on plain Node 24 with no dependencies (like import-dictionary.mts).
 */
import { registerHooks } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The app's source uses extensionless relative imports ("./ids"), which Next/Vitest resolve but
// plain Node doesn't. Resolve those to ".ts".
registerHooks({
  resolve(specifier, context, nextResolve) {
    let result;
    try {
      result = nextResolve(specifier, context);
    } catch (err) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]s$/.test(specifier)) throw err;
      result = nextResolve(`${specifier}.ts`, context);
    }
    return result.url.endsWith(".ts") ? { ...result, format: "module-typescript" } : result;
  },
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { readSpreadsheet } = (await import("./lib/spreadsheet")) as typeof import("./lib/spreadsheet");
const { mapCurriculumRows, serializeCurriculum } = (await import(
  new URL("../src/lib/grammar/curriculum-import.ts", import.meta.url).href
)) as typeof import("../src/lib/grammar/curriculum-import");
const { GRAMMAR_LEVELS } = (await import(
  new URL("../src/lib/grammar/levels.ts", import.meta.url).href
)) as typeof import("../src/lib/grammar/levels");

const input = resolve(process.argv[2] ?? resolve(root, "data/grammar/just-viet-grammar.xlsx"));
const output = resolve(root, "src/lib/grammar/curriculum.json");

// The previous list remembers each lesson's teacher (see curriculum-import.ts).
const previous = existsSync(output) ? (JSON.parse(readFileSync(output, "utf8")).lessons ?? []) : [];
const result = mapCurriculumRows(readSpreadsheet(input), previous);

const colName = (i: number | undefined) => (i === undefined ? "none" : String.fromCharCode(65 + i));
console.log(`Read ${basename(input)}`);
console.log(
  `Columns: title=${colName(result.columns.title)}, difficulty=${colName(result.columns.level)}, id=${colName(result.columns.id)}, teacher=${colName(result.columns.teacher)}`,
);
if (result.ignoredHeaders.length) console.log(`Ignored columns: ${result.ignoredHeaders.join(", ")}`);
for (const w of result.warnings) console.log(`  warning, row ${w.row}: ${w.message}`);
if (result.errors.length) {
  console.error(`\n${result.errors.length} problem(s); nothing was written:`);
  for (const e of result.errors) console.error(`  row ${e.row}: ${e.message}`);
  process.exit(1);
}

const before = new Map<string, { title: string; level: string }>(previous.map((p: { id: string; title: string; level: string }) => [p.id, p]));
const now = new Set(result.lessons.map((l) => l.id));
const added = result.lessons.filter((l) => !before.has(l.id)).length;
const removed = [...before.keys()].filter((id) => !now.has(id));
writeFileSync(output, serializeCurriculum({ version: 1, source: basename(input), lessons: result.lessons }));

for (const level of GRAMMAR_LEVELS) {
  console.log(`  ${level.name.padEnd(17)} ${result.lessons.filter((l) => l.level === level.id).length}`);
}
console.log(`Wrote ${result.lessons.length} lessons to ${output} (${added} new, ${removed.length} removed).`);
if (removed.length) console.log(`Removed IDs (progress on them stays in the XP ledger, unused): ${removed.join(", ")}`);
