/**
 * Batch-import parsing: turns pasted spreadsheet text (Excel/Google Sheets
 * copy-paste, or plain delimited text) into vocab cards. Pure — no
 * Firestore, no React — so it's unit-testable the same way `srs.ts` is;
 * `BatchImportModal.tsx` is the only thing that calls into this.
 *
 * Pipeline: parseImportText (delimiter + headers + column mapping) ->
 * buildImportPreview (validation + duplicate detection) -> the caller
 * turns `included` rows into `NewVocabCardInput`s and hands them to
 * `repository.createCards`.
 */
import { PARTS_OF_SPEECH, type NewVocabCardInput, type PartOfSpeech, type VocabCard } from "./types";

export type Delimiter = "tab" | "comma" | "semicolon" | "pipe";
export type DelimiterOption = Delimiter | "auto";

const DELIMITER_CHARS: Record<Delimiter, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  pipe: "|",
};

// Tab first: that's what an Excel/Sheets cell-range copy actually puts on
// the clipboard, so it's both the most common case and the safest to
// assume (cell contents containing commas won't be misread as more columns).
const DETECTION_ORDER: Delimiter[] = ["tab", "comma", "semicolon", "pipe"];

/**
 * Picks the delimiter that splits the most lines into a consistent (>=2)
 * column count, trying tab/comma/semicolon/pipe in that priority order.
 * Falls back to tab if nothing looks conclusive.
 */
export function detectDelimiter(text: string): Delimiter {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "tab";

  let best: { delimiter: Delimiter; score: number } | null = null;

  for (const delimiter of DETECTION_ORDER) {
    const char = DELIMITER_CHARS[delimiter];
    const counts = lines.map((line) => line.split(char).length);
    const withDelimiter = counts.filter((c) => c >= 2).length;
    if (withDelimiter === 0) continue;

    // How consistent is the column count across lines? Prefer delimiters
    // where most lines agree on the same number of columns.
    const mode = mostCommon(counts);
    const agreement = counts.filter((c) => c === mode).length;
    const score = withDelimiter + agreement;

    if (!best || score > best.score) best = { delimiter, score };
  }

  return best?.delimiter ?? "tab";
}

function mostCommon(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of freq) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

type ColumnKey =
  | "english"
  | "vietnamese"
  | "partOfSpeech"
  | "example"
  | "tags"
  | "pronunciation"
  | "notes";

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  english: ["english", "eng", "en", "word", "front"],
  vietnamese: ["vietnamese", "viet", "vn", "meaning", "back"],
  partOfSpeech: ["part of speech", "partofspeech", "pos"],
  example: ["example", "example sentence", "sentence"],
  tags: ["tags", "tag", "category", "categories"],
  pronunciation: ["pronunciation", "ipa", "phonetic"],
  notes: ["notes", "note"],
};

// Positional fallback when there's no recognizable header row.
const POSITIONAL_ORDER: ColumnKey[] = [
  "english",
  "vietnamese",
  "partOfSpeech",
  "example",
  "tags",
  "pronunciation",
  "notes",
];

function normalizeHeaderCell(cell: string): string {
  return cell.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function matchHeader(cell: string): ColumnKey | null {
  const normalized = normalizeHeaderCell(cell);
  for (const key of POSITIONAL_ORDER) {
    if (HEADER_ALIASES[key].includes(normalized)) return key;
  }
  return null;
}

/** True if the first row looks like a header rather than data. */
function looksLikeHeaderRow(cells: string[]): boolean {
  const matches = cells.filter((c) => matchHeader(c) !== null).length;
  return matches >= 2;
}

const PART_OF_SPEECH_ALIASES: Record<string, PartOfSpeech> = {
  n: "noun",
  noun: "noun",
  v: "verb",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  pron: "pronoun",
  pronoun: "pronoun",
  prep: "preposition",
  preposition: "preposition",
  conj: "conjunction",
  conjunction: "conjunction",
};

function normalizePartOfSpeech(raw: string | undefined): PartOfSpeech {
  if (!raw) return "other";
  const normalized = raw.trim().toLowerCase().replace(/\.$/, "");
  if (normalized in PART_OF_SPEECH_ALIASES) return PART_OF_SPEECH_ALIASES[normalized];
  if ((PARTS_OF_SPEECH as readonly string[]).includes(normalized)) return normalized as PartOfSpeech;
  return "other";
}

function splitTagsCell(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface ParsedImportRow {
  /** 1-based line number in the pasted text, for referencing back to the source. */
  line: number;
  english: string;
  vietnamese: string;
  partOfSpeech: PartOfSpeech;
  example: string;
  tags: string[];
  pronunciation: string;
  notes: string;
}

export interface ParseResult {
  rows: ParsedImportRow[];
  delimiterUsed: Delimiter;
  hadHeaderRow: boolean;
}

/**
 * Parses pasted text into rows. Blank lines are silently dropped (not
 * treated as errors — they're just paste noise, e.g. a trailing newline).
 */
export function parseImportText(text: string, delimiterOption: DelimiterOption = "auto"): ParseResult {
  const delimiterUsed = delimiterOption === "auto" ? detectDelimiter(text) : delimiterOption;
  const char = DELIMITER_CHARS[delimiterUsed];

  const rawLines = text.split("\n");
  const nonBlankLines = rawLines
    .map((line, index) => ({ line: index + 1, cells: line.split(char).map((c) => c.trim()) }))
    .filter(({ cells }) => cells.some((c) => c.length > 0));

  if (nonBlankLines.length === 0) {
    return { rows: [], delimiterUsed, hadHeaderRow: false };
  }

  const firstRowCells = nonBlankLines[0].cells;
  const hadHeaderRow = looksLikeHeaderRow(firstRowCells);

  let columnMap: (ColumnKey | null)[];
  if (hadHeaderRow) {
    columnMap = firstRowCells.map((cell) => matchHeader(cell));
  } else {
    columnMap = firstRowCells.map((_, i) => POSITIONAL_ORDER[i] ?? null);
  }

  const dataLines = hadHeaderRow ? nonBlankLines.slice(1) : nonBlankLines;

  const rows: ParsedImportRow[] = dataLines.map(({ line, cells }) => {
    const byKey: Partial<Record<ColumnKey, string>> = {};
    cells.forEach((cell, i) => {
      const key = columnMap[i];
      if (key && !(key in byKey)) byKey[key] = cell;
    });

    return {
      line,
      english: (byKey.english ?? "").trim(),
      vietnamese: (byKey.vietnamese ?? "").trim(),
      partOfSpeech: normalizePartOfSpeech(byKey.partOfSpeech),
      example: (byKey.example ?? "").trim(),
      tags: splitTagsCell(byKey.tags),
      pronunciation: (byKey.pronunciation ?? "").trim(),
      notes: (byKey.notes ?? "").trim(),
    };
  });

  return { rows, delimiterUsed, hadHeaderRow };
}

export type ImportProblem =
  | "missing-english"
  | "missing-vietnamese"
  | "duplicate-existing"
  | "duplicate-in-batch";

export interface ImportPreviewRow extends ParsedImportRow {
  /** Stable client-side id for React keys / inline edits, independent of `line`. */
  id: string;
  problems: ImportProblem[];
  /** Whether this row is checked for import; auto-unchecked for problem rows, user can override. */
  included: boolean;
}

function dedupeKey(english: string, vietnamese: string): string {
  return `${vietnamese.trim().toLowerCase()}|${english.trim().toLowerCase()}`;
}

/**
 * Validates parsed rows and flags problems: missing required fields, and
 * duplicates — both against the user's existing cards and against earlier
 * rows in the same paste. Duplicates and invalid rows start unchecked
 * (skipped by default) but stay visible so the user can fix or
 * re-include them.
 */
export function buildImportPreview(
  rows: ParsedImportRow[],
  existingCards: Pick<VocabCard, "front" | "back">[],
): ImportPreviewRow[] {
  const existingKeys = new Set(existingCards.map((c) => dedupeKey(c.back, c.front)));
  const seenInBatch = new Set<string>();

  return rows.map((row, index) => {
    const problems: ImportProblem[] = [];
    if (!row.english) problems.push("missing-english");
    if (!row.vietnamese) problems.push("missing-vietnamese");

    if (row.english && row.vietnamese) {
      const key = dedupeKey(row.english, row.vietnamese);
      if (existingKeys.has(key)) {
        problems.push("duplicate-existing");
      } else if (seenInBatch.has(key)) {
        problems.push("duplicate-in-batch");
      } else {
        seenInBatch.add(key);
      }
    }

    return {
      ...row,
      id: `row-${index}`,
      problems,
      included: problems.length === 0,
    };
  });
}

/** Vietnamese -> front (the term being learned), English -> back (its meaning) — matches the manual Add Card form's orientation. */
export function toNewCardInput(row: ImportPreviewRow): NewVocabCardInput {
  return {
    front: row.vietnamese,
    back: row.english,
    exampleSentence: row.example,
    partOfSpeech: row.partOfSpeech,
    tags: row.tags,
    pronunciation: row.pronunciation,
    notes: row.notes,
  };
}

export const IMPORT_PROBLEM_LABEL: Record<ImportProblem, string> = {
  "missing-english": "Missing English",
  "missing-vietnamese": "Missing Vietnamese",
  "duplicate-existing": "Already in your vocab",
  "duplicate-in-batch": "Duplicate in this paste",
};
