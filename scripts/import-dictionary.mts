/**
 * Imports the shared dictionary dataset from a spreadsheet into
 * `public/dictionary/shared.json`, the static file the app loads.
 *
 *   npm run dictionary:import -- path/to/dictionary.xlsx
 *   npm run dictionary:import                 (defaults to data/dictionary/just-viet-dictionary.xlsx)
 *
 * Accepts .xlsx (first worksheet), .csv or .tsv. The first row must be
 * headers; columns are matched by name (see DATASET_HEADER_ALIASES in
 * src/lib/dictionary/dataset.ts), so column order doesn't matter. Rows for
 * the same headword are merged into one entry with several meanings.
 *
 * Runs on plain Node (>= 22.18 / 24, which strip TypeScript types natively)
 * with no extra dependencies: .xlsx is just a zip of XML, read by
 * scripts/lib/spreadsheet.ts with node:zlib.
 */
import { registerHooks } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The app's source uses extensionless relative imports ("./normalize"),
// which Next/Vitest resolve but plain Node doesn't. Resolve those to ".ts".
registerHooks({
  resolve(specifier, context, nextResolve) {
    let result;
    try {
      result = nextResolve(specifier, context);
    } catch (err) {
      if (!specifier.startsWith(".") || /\.[cm]?[jt]s$/.test(specifier)) throw err;
      result = nextResolve(`${specifier}.ts`, context);
    }
    // package.json has no "type", so tell Node these .ts files are ES modules.
    return result.url.endsWith(".ts") ? { ...result, format: "module-typescript" } : result;
  },
});

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { readSpreadsheet } = (await import("./lib/spreadsheet")) as typeof import("./lib/spreadsheet");
const { mapDatasetRows } = (await import(
  new URL("../src/lib/dictionary/dataset.ts", import.meta.url).href
)) as typeof import("../src/lib/dictionary/dataset");

// --------------------------------------------------------------------- main

const input = resolve(process.argv[2] ?? resolve(root, "data/dictionary/just-viet-dictionary.xlsx"));
const output = resolve(root, "public/dictionary/shared.json");
const rows = readSpreadsheet(input);

const result = mapDatasetRows(rows);
const file = {
  version: 1,
  source: basename(input),
  generatedAt: new Date().toISOString(),
  entries: result.entries,
};
mkdirSync(dirname(output), { recursive: true });
// One entry per line: compact, but still reviewable as a line-by-line git diff.
const { entries, ...header } = file;
const body = entries.map((entry) => `  ${JSON.stringify(entry)}`).join(",\n");
writeFileSync(output, `${JSON.stringify(header).slice(0, -1)},"entries":[\n${body}\n]}\n`);

const mapped = Object.entries(result.columns)
  .map(([field, col]) => `${field}=${String.fromCharCode(65 + (col ?? 0))}`)
  .join(", ");
console.log(`Read ${result.rowCount} rows from ${basename(input)}`);
console.log(`Columns: ${mapped}`);
if (result.unmappedHeaders.length) console.log(`Ignored columns: ${result.unmappedHeaders.join(", ")}`);
const skipped = result.issues.filter((i) => i.problem !== "merged-duplicate");
const merged = result.issues.filter((i) => i.problem === "merged-duplicate");
if (skipped.length) {
  console.log(`Skipped ${skipped.length} rows:`);
  for (const issue of skipped) console.log(`  row ${issue.row}: ${issue.problem}${issue.headword ? ` (${issue.headword})` : ""}`);
}
if (merged.length) {
  console.log(`Merged ${merged.length} repeated headwords into existing entries:`);
  for (const issue of merged) console.log(`  row ${issue.row}: ${issue.headword}`);
}
console.log(`Wrote ${result.entries.length} entries to ${output}`);
