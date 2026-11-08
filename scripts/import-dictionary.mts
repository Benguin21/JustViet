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
 * with no extra dependencies: .xlsx is just a zip of XML, read below with
 * node:zlib.
 */
import { registerHooks } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
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
const { mapDatasetRows } = (await import(
  new URL("../src/lib/dictionary/dataset.ts", import.meta.url).href
)) as typeof import("../src/lib/dictionary/dataset");

// ---------------------------------------------------------------- zip / xlsx

function readZip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx file (zip directory not found).");
  const count = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) throw new Error("Corrupt zip directory.");
    const method = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const nameLength = buffer.readUInt16LE(ptr + 28);
    const extraLength = buffer.readUInt16LE(ptr + 30);
    const commentLength = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.toString("utf8", ptr + 46, ptr + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(start, start + compressedSize);
    files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    ptr += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Concatenates every <t> run in a fragment (rich-text cells have several), skipping phonetic runs. */
function textRuns(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return Array.from(withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) =>
    decodeXml(m[1]),
  ).join("");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  return Array.from(letters).reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

function readXlsx(path: string): string[][] {
  const files = readZip(readFileSync(path));
  const read = (name: string) => files.get(name)?.toString("utf8");

  const shared = Array.from((read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g), (m) =>
    textRuns(m[1]),
  );

  // First worksheet, resolved through the workbook's relationships.
  const workbook = read("xl/workbook.xml") ?? "";
  const rels = read("xl/_rels/workbook.xml.rels") ?? "";
  const firstSheetRel = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const target = firstSheetRel
    ? new RegExp(`<Relationship\\b[^>]*Id="${firstSheetRel}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ??
      new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstSheetRel}"`).exec(rels)?.[1]
    : undefined;
  const sheetPath = target
    ? target.startsWith("/")
      ? target.slice(1)
      : `xl/${target}`
    : "xl/worksheets/sheet1.xml";
  const sheet = read(sheetPath);
  if (!sheet) throw new Error(`Worksheet ${sheetPath} not found in ${path}.`);

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "A1";
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text = "";
      if (type === "s" && value !== undefined) text = shared[Number(value)] ?? "";
      else if (type === "inlineStr") text = textRuns(body);
      else if (value !== undefined) text = decodeXml(value);
      row[columnIndex(ref)] = text;
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows;
}

// ------------------------------------------------------------------ csv/tsv

function readDelimited(path: string, delimiter: string): string[][] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

// --------------------------------------------------------------------- main

const input = resolve(process.argv[2] ?? resolve(root, "data/dictionary/just-viet-dictionary.xlsx"));
const output = resolve(root, "public/dictionary/shared.json");
const ext = extname(input).toLowerCase();
const rows =
  ext === ".xlsx"
    ? readXlsx(input)
    : ext === ".csv"
      ? readDelimited(input, ",")
      : ext === ".tsv" || ext === ".txt"
        ? readDelimited(input, "\t")
        : (() => {
            throw new Error(`Unsupported file type "${ext}". Use .xlsx, .csv or .tsv.`);
          })();

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
