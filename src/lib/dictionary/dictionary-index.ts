/**
 * The reusable dictionary lookup service. Pure (no React, no Firestore,
 * no fetching): build one from shared + personal entries and it answers
 * every lookup question the app has, so the Dictionary tab and any future
 * caller (e.g. the planned hover/long-press popup in lessons) share one
 * implementation of matching, ordering and search.
 *
 *  - `get(text)`        exact headword lookup (normalized; tone-sensitive)
 *  - `search(query)`    ranked search over Vietnamese headwords + English glosses
 *  - `headwords`        every headword in Vietnamese dictionary order
 *  - `segment(text)`    greedy longest-match of dictionary words in running text
 *  - `matchesAt(text, offset)` every entry covering one position, longest first
 *
 * `segment`/`matchesAt` exist for the future in-context lookup: Vietnamese
 * words are often several space-separated syllables ("học sinh", "đại
 * học"), so matching works over syllable sequences up to the longest
 * headword in the index, never by naive space-splitting.
 */
import { firstLetter, sortByVietnamese } from "./collation";
import { foldDiacritics, headwordKey, normalizeSearchText } from "./normalize";
import type { DictionaryHeadword, PersonalEntry, SharedEntry } from "./types";

export type SearchMatchKind = "exact" | "headword" | "similar-spelling" | "english";

export interface SearchResult {
  headword: DictionaryHeadword;
  kind: SearchMatchKind;
}

export interface LookupMatch {
  /** UTF-16 offsets into the searched text; `text.slice(start, end)` is the matched span. */
  start: number;
  end: number;
  headword: DictionaryHeadword;
}

interface SearchRow {
  headword: DictionaryHeadword;
  key: string;
  folded: string;
  english: string;
}

/** Lists every English gloss on a headword (shared senses first, then personal ones). */
export function englishGlosses(headword: DictionaryHeadword): string[] {
  const senses = [...(headword.shared?.senses ?? []), ...(headword.personal?.senses ?? [])];
  return senses.map((s) => s.english).filter(Boolean);
}

/** A one-line summary for list rows and compact popups. */
export function briefDefinition(headword: DictionaryHeadword): string {
  const glosses = englishGlosses(headword);
  return Array.from(new Set(glosses)).join("; ");
}

const TOKEN = /[\p{L}\p{M}\p{N}]+/gu;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class DictionaryIndex {
  /** Every headword, in Vietnamese dictionary order. */
  readonly headwords: DictionaryHeadword[];
  /** `letters[i]` is the jump-bar letter `headwords[i]` is filed under. */
  readonly letters: string[];
  /** Syllable count of the longest headword — the lookahead window for `segment`. */
  readonly maxSyllables: number;

  private readonly byKey: Map<string, DictionaryHeadword>;
  private readonly rows: SearchRow[];

  private constructor(headwords: DictionaryHeadword[]) {
    this.headwords = sortByVietnamese(headwords, (h) => h.headword);
    this.letters = this.headwords.map((h) => firstLetter(h.headword));
    this.byKey = new Map(this.headwords.map((h) => [h.key, h]));
    this.maxSyllables = this.headwords.reduce(
      (max, h) => Math.max(max, h.key.split(" ").length),
      1,
    );
    this.rows = this.headwords.map((h) => ({
      headword: h,
      key: h.key,
      folded: foldDiacritics(h.key),
      english: normalizeSearchText(englishGlosses(h).join(" | ")),
    }));
  }

  /**
   * Merges the shared dataset with one user's personal entries. A personal
   * entry whose key matches a shared entry becomes that headword's
   * `personal` overlay — the word still appears once.
   */
  static build(shared: SharedEntry[], personal: PersonalEntry[] = []): DictionaryIndex {
    const map = new Map<string, DictionaryHeadword>();
    for (const entry of shared) {
      const existing = map.get(entry.key);
      if (existing?.shared) {
        // Defensive: the import script already merges duplicate rows.
        existing.shared = { ...existing.shared, senses: [...existing.shared.senses, ...entry.senses] };
      } else {
        map.set(entry.key, { key: entry.key, headword: entry.headword, shared: entry });
      }
    }
    for (const entry of personal) {
      const existing = map.get(entry.key);
      if (existing) existing.personal = entry;
      else map.set(entry.key, { key: entry.key, headword: entry.headword, personal: entry });
    }
    return new DictionaryIndex(Array.from(map.values()));
  }

  get size(): number {
    return this.headwords.length;
  }

  /** Exact lookup by any spelling of the headword (normalized; tone marks matter). */
  get(text: string): DictionaryHeadword | undefined {
    return this.byKey.get(headwordKey(text));
  }

  has(text: string): boolean {
    return this.byKey.has(headwordKey(text));
  }

  /** Index of a headword in `headwords` (for scrolling to it), or -1. */
  indexOf(text: string): number {
    const key = headwordKey(text);
    return this.headwords.findIndex((h) => h.key === key);
  }

  /**
   * Ranked search: the exact headword, then headwords starting with or
   * containing the query, then accent-insensitive matches, then English
   * glosses with a word starting with the query ("stud" → "student"; "eat"
   * doesn't drag in "meat"). Within a rank, results keep dictionary order
   * (English matches prefer shorter glosses).
   *
   * Typing without accents ("hoc") is the normal way to search, so then
   * accent-insensitive hits rank right after exact/prefix ones and aren't
   * flagged. When the user did type accents ("thử"), every match with those
   * exact accents ("cứ thử xem") comes first, and accent-insensitive hits
   * ("thu", "thứ") follow as "similar spelling" suggestions.
   */
  search(query: string, limit = 200): SearchResult[] {
    const qKey = headwordKey(query);
    if (!qKey) return [];
    const qFold = foldDiacritics(qKey);
    const qEnglish = normalizeSearchText(query);
    const englishWord = new RegExp(`(^|[^\\p{L}])${escapeRegExp(qEnglish)}`, "u");
    const typedDiacritics = qKey !== qFold;
    const looseKind: SearchMatchKind = typedDiacritics ? "similar-spelling" : "headword";

    const scored: { row: SearchRow; rank: number; kind: SearchMatchKind; tie: number; order: number }[] = [];
    this.rows.forEach((row, order) => {
      const add = (rank: number, kind: SearchMatchKind, tie = 0) =>
        scored.push({ row, rank, kind, tie, order });
      const contains = row.key.includes(qKey);
      if (row.key === qKey) add(0, "exact");
      else if (row.key.startsWith(qKey)) add(1, "headword");
      else if (typedDiacritics && contains) add(2, "headword");
      else if (row.folded === qFold) add(3, looseKind);
      else if (contains) add(4, "headword");
      else if (row.folded.startsWith(qFold)) add(5, looseKind);
      else if (row.folded.includes(qFold)) add(6, looseKind);
      else if (englishWord.test(row.english)) add(7, "english", row.english.length);
    });

    scored.sort((a, b) => a.rank - b.rank || a.tie - b.tie || a.order - b.order);
    return scored.slice(0, limit).map(({ row, kind }) => ({ headword: row.headword, kind }));
  }

  /**
   * Finds dictionary words in running text, greedily preferring the longest
   * match at each position ("học đại học" → "học", "đại học" — or the whole
   * phrase if it's an entry itself). Syllables only join across plain
   * whitespace, never across punctuation. Non-overlapping; unmatched text
   * is skipped.
   */
  segment(text: string): LookupMatch[] {
    const tokens = this.tokenize(text);
    const matches: LookupMatch[] = [];
    let i = 0;
    while (i < tokens.length) {
      const found = this.longestMatchFrom(text, tokens, i);
      if (found) {
        matches.push(found.match);
        i += found.length;
      } else {
        i += 1;
      }
    }
    return matches;
  }

  /**
   * Every dictionary entry that covers the syllable at `offset`, longest
   * first — e.g. hovering "học" in "học sinh" gives ["học sinh", "học"], so
   * a popup can show the contextual compound first and still offer the
   * individual word.
   */
  matchesAt(text: string, offset: number): LookupMatch[] {
    const tokens = this.tokenize(text);
    const at = tokens.findIndex((t) => offset >= t.start && offset < t.end);
    if (at === -1) return [];
    const results: LookupMatch[] = [];
    for (let start = Math.max(0, at - this.maxSyllables + 1); start <= at; start++) {
      for (let end = at; end < Math.min(tokens.length, start + this.maxSyllables); end++) {
        if (!this.joinable(text, tokens, start, end)) break;
        const headword = this.byKey.get(this.keyFor(tokens, start, end));
        if (headword) {
          results.push({ start: tokens[start].start, end: tokens[end].end, headword });
        }
      }
    }
    return results.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  }

  private tokenize(text: string): { start: number; end: number; value: string }[] {
    return Array.from(text.matchAll(TOKEN), (m) => ({
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      value: m[0],
    }));
  }

  private keyFor(tokens: { value: string }[], start: number, end: number): string {
    return headwordKey(
      tokens
        .slice(start, end + 1)
        .map((t) => t.value)
        .join(" "),
    );
  }

  /** True if tokens[start..end] are separated only by whitespace (so they can form one word). */
  private joinable(
    text: string,
    tokens: { start: number; end: number }[],
    start: number,
    end: number,
  ): boolean {
    for (let k = start; k < end; k++) {
      const gap = text.slice(tokens[k].end, tokens[k + 1].start);
      if (!/^\s+$/.test(gap)) return false;
    }
    return true;
  }

  private longestMatchFrom(
    text: string,
    tokens: { start: number; end: number; value: string }[],
    i: number,
  ): { match: LookupMatch; length: number } | null {
    const maxEnd = Math.min(tokens.length, i + this.maxSyllables) - 1;
    for (let end = maxEnd; end >= i; end--) {
      if (!this.joinable(text, tokens, i, end)) continue;
      const headword = this.byKey.get(this.keyFor(tokens, i, end));
      if (headword) {
        return {
          match: { start: tokens[i].start, end: tokens[end].end, headword },
          length: end - i + 1,
        };
      }
    }
    return null;
  }
}
