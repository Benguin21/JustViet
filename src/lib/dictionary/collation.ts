/**
 * Vietnamese alphabetical ordering. Pure, no React/Firestore.
 *
 * Conventions (as in Vietnamese dictionaries such as Hoàng Phê's, and
 * CLDR's `vi` collation):
 *  - Alphabet order a ă â b c d đ e ê g h i k l m n o ô ơ p q r s t u ư v x y
 *    (f/j/w/z, which appear only in loanwords, slot in at their Latin position).
 *  - Within a syllable, letters decide first; the tone only breaks ties, in
 *    the order ngang < huyền < hỏi < ngã < sắc < nặng — so
 *    ba < bà < bả < bã < bá < bạ.
 *  - Comparison goes syllable by syllable, so multi-syllable words stay
 *    grouped under their first syllable, dictionary-style:
 *    ba < ba ba < bà < bà con < bác < bác sĩ.
 *
 * Deliberately not using `Intl.Collator("vi")`: ICU compares tones only
 * after comparing the *whole* string's letters, which interleaves entries
 * (ba < bà < ba ba), and results can differ across browsers/ICU versions.
 */
import { decomposeSyllable, headwordKey, TONE_ORDER } from "./normalize";

/** The letters shown in the A–Y jump bar (the 29-letter Vietnamese alphabet). */
export const VIETNAMESE_ALPHABET = [
  "a", "ă", "â", "b", "c", "d", "đ", "e", "ê", "g", "h", "i", "k", "l", "m",
  "n", "o", "ô", "ơ", "p", "q", "r", "s", "t", "u", "ư", "v", "x", "y",
] as const;

const COLLATION_LETTERS = "aăâbcdđeêfghijklmnoôơpqrstuưvwxyz";
const LETTER_RANK = new Map<string, number>(
  Array.from(COLLATION_LETTERS).map((ch, i) => [ch, i + 100]),
);
const TONE_RANK = new Map<string, number>(TONE_ORDER.map((t, i) => [t, i]));

/** Digits sort before letters; any other character after all letters, by code point. */
function charRank(ch: string): number {
  const letter = LETTER_RANK.get(ch);
  if (letter !== undefined) return letter;
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0); // 48-57, below letters
  return 1000 + (ch.codePointAt(0) ?? 0);
}

interface SortSyllable {
  ranks: number[];
  tone: number;
}

/** Precomputes the comparison form of a headword. Cache it when sorting many entries. */
export function sortKey(headword: string): SortSyllable[] {
  return headwordKey(headword)
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((syllable) => {
      const { letters, tone } = decomposeSyllable(syllable);
      return { ranks: Array.from(letters).map(charRank), tone: TONE_RANK.get(tone) ?? 0 };
    });
}

export function compareSortKeys(a: SortSyllable[], b: SortSyllable[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    const m = Math.min(x.ranks.length, y.ranks.length);
    for (let j = 0; j < m; j++) {
      if (x.ranks[j] !== y.ranks[j]) return x.ranks[j] - y.ranks[j];
    }
    if (x.ranks.length !== y.ranks.length) return x.ranks.length - y.ranks.length;
    if (x.tone !== y.tone) return x.tone - y.tone;
  }
  return a.length - b.length;
}

/** Compares two Vietnamese headwords in dictionary order (see the module comment). */
export function compareVietnamese(a: string, b: string): number {
  const result = compareSortKeys(sortKey(a), sortKey(b));
  if (result !== 0) return result;
  // Deterministic tie-break (e.g. capitalization or punctuation differences), on
  // NFC so two encodings of the same word still compare equal.
  const x = a.normalize("NFC");
  const y = b.normalize("NFC");
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Sorts a list by a headword accessor without recomputing sort keys per comparison. */
export function sortByVietnamese<T>(items: T[], getHeadword: (item: T) => string): T[] {
  return items
    .map((item) => ({ item, key: sortKey(getHeadword(item)), raw: getHeadword(item).normalize("NFC") }))
    .sort((a, b) => compareSortKeys(a.key, b.key) || (a.raw < b.raw ? -1 : a.raw > b.raw ? 1 : 0))
    .map((x) => x.item);
}

/**
 * The jump-bar letter a headword is filed under: its first letter with the
 * tone removed ("ắt" → "ă", "Đà Nẵng" → "đ"), or "#" for anything that
 * doesn't start with a Vietnamese letter.
 */
export function firstLetter(headword: string): string {
  const first = headwordKey(headword).split(" ")[0] ?? "";
  const { letters } = decomposeSyllable(first);
  const ch = Array.from(letters)[0] ?? "";
  return (VIETNAMESE_ALPHABET as readonly string[]).includes(ch) ? ch : "#";
}
