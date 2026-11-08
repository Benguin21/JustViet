/**
 * Maps a spreadsheet of dictionary data (rows of cells, first row = headers)
 * onto the `SharedEntry` schema. Pure — used by
 * `scripts/import-dictionary.mts` to turn the source .xlsx/.csv into
 * `public/dictionary/shared.json`, and unit tested in `dataset.test.ts`.
 *
 * Headers are matched by alias (case/spacing-insensitive), so a sheet with
 * columns in a different order — or slightly different names — still maps
 * without re-entering anything. Only Vietnamese + English are required.
 *
 * Expected columns (the current dataset, "just Viet Dictionary 1.xlsx"):
 *   Vietnamese | English Translation | Definition (Viet) | Part of Speech |
 *   Example Sentence (Viet) | Example Sentence (English) | Difficulty
 */
import { sortByVietnamese } from "./collation";
import { cleanHeadword, headwordKey, normalizeSearchText } from "./normalize";
import type { DictionarySense, SharedEntry } from "./types";

export type DatasetField =
  | "headword"
  | "english"
  | "definitionVi"
  | "partOfSpeech"
  | "exampleVi"
  | "exampleEn"
  | "level";

/** Header spellings recognized for each field (compared after lowercasing + collapsing spaces). */
export const DATASET_HEADER_ALIASES: Record<DatasetField, string[]> = {
  headword: ["vietnamese", "word", "headword", "tiếng việt", "vietnamese word", "vietnamese word/phrase"],
  english: ["english translation", "english", "translation", "meaning", "english meaning", "gloss", "definition (english)"],
  definitionVi: ["definition (viet)", "definition (vietnamese)", "vietnamese definition", "định nghĩa", "definition"],
  partOfSpeech: ["part of speech", "pos", "word type", "type"],
  exampleVi: ["example sentence (viet)", "example sentence (vietnamese)", "example (viet)", "example (vietnamese)", "example sentence", "example"],
  exampleEn: ["example sentence (english)", "example (english)", "example translation", "english example"],
  level: ["difficulty", "level"],
};

export interface DatasetIssue {
  /** 1-based spreadsheet row number. */
  row: number;
  problem: "missing-vietnamese" | "missing-english" | "merged-duplicate";
  headword?: string;
}

export interface DatasetMappingResult {
  entries: SharedEntry[];
  columns: Partial<Record<DatasetField, number>>;
  /** Header cells that didn't map to any field (ignored). */
  unmappedHeaders: string[];
  issues: DatasetIssue[];
  /** Data rows read (non-blank rows after the header). */
  rowCount: number;
}

function normalizeHeader(cell: string): string {
  return cell.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

function clean(cell: string | undefined): string {
  return (cell ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
}

export function mapHeaders(headerRow: string[]): {
  columns: Partial<Record<DatasetField, number>>;
  unmappedHeaders: string[];
} {
  const columns: Partial<Record<DatasetField, number>> = {};
  const unmappedHeaders: string[] = [];
  headerRow.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (!header) return;
    const field = (Object.keys(DATASET_HEADER_ALIASES) as DatasetField[]).find(
      (f) => columns[f] === undefined && DATASET_HEADER_ALIASES[f].includes(header),
    );
    if (field) columns[field] = index;
    else unmappedHeaders.push(cell);
  });
  return { columns, unmappedHeaders };
}

/**
 * Converts spreadsheet rows to shared entries. Rows sharing a headword key
 * (same word, any capitalization/encoding) are merged into one entry with
 * several senses — the dictionary never has duplicate headwords. Words
 * differing only in tone marks stay separate.
 */
export function mapDatasetRows(rows: string[][]): DatasetMappingResult {
  const [headerRow = [], ...dataRows] = rows;
  const { columns, unmappedHeaders } = mapHeaders(headerRow);
  if (columns.headword === undefined || columns.english === undefined) {
    throw new Error(
      `Couldn't find the required columns. Need a Vietnamese column (${DATASET_HEADER_ALIASES.headword.join(" / ")}) and an English column (${DATASET_HEADER_ALIASES.english.join(" / ")}). Found headers: ${headerRow.filter(Boolean).join(", ")}`,
    );
  }

  const get = (row: string[], field: DatasetField) =>
    columns[field] === undefined ? "" : clean(row[columns[field]]);

  const byKey = new Map<string, SharedEntry>();
  const issues: DatasetIssue[] = [];
  let rowCount = 0;

  dataRows.forEach((row, i) => {
    const rowNumber = i + 2;
    if (row.every((cell) => !clean(cell))) return;
    rowCount++;

    const headword = cleanHeadword(get(row, "headword"));
    const english = get(row, "english");
    if (!headword) {
      issues.push({ row: rowNumber, problem: "missing-vietnamese" });
      return;
    }
    if (!english) {
      issues.push({ row: rowNumber, problem: "missing-english", headword });
      return;
    }

    const exampleVi = get(row, "exampleVi");
    const exampleEn = get(row, "exampleEn");
    const sense: DictionarySense = {
      english,
      ...(get(row, "partOfSpeech") && { partOfSpeech: get(row, "partOfSpeech") }),
      ...(get(row, "definitionVi") && { definitionVi: get(row, "definitionVi") }),
      examples: exampleVi ? [{ vi: exampleVi, ...(exampleEn && { en: exampleEn }) }] : [],
    };
    const level = get(row, "level");

    const key = headwordKey(headword);
    const existing = byKey.get(key);
    if (existing) {
      issues.push({ row: rowNumber, problem: "merged-duplicate", headword });
      const sameMeaning = existing.senses.find(
        (s) => normalizeSearchText(s.english) === normalizeSearchText(english),
      );
      if (sameMeaning) {
        for (const example of sense.examples) {
          if (!sameMeaning.examples.some((e) => e.vi === example.vi)) sameMeaning.examples.push(example);
        }
      } else {
        existing.senses.push(sense);
      }
      return;
    }

    byKey.set(key, { key, headword, senses: [sense], ...(level && { level }) });
  });

  return {
    entries: sortByVietnamese(Array.from(byKey.values()), (e) => e.headword),
    columns,
    unmappedHeaders,
    issues,
    rowCount,
  };
}
