/**
 * Keyword search for Community posts. Firestore has no full-text search, so
 * each post stores `tokens`: the accent-folded prefixes of its words
 * (`foldDiacritics`, the Dictionary's folding, so "hoc" finds "học").
 * A search asks Firestore for posts containing its longest word
 * (`array-contains`), then checks every word and ranks the results here.
 *
 * Limits (documented in AGENTS.md):
 *  - Whole words and word starts only: "hoc" matches "học" and "học sinh",
 *    but nothing matches inside a word ("oc" doesn't find "học").
 *  - Words of one letter are ignored, both in posts and in searches.
 *  - Prefixes are stored up to MAX_PREFIX letters; longer words are matched
 *    on their first MAX_PREFIX letters, then checked against the full text.
 *  - At most MAX_TOKENS tokens per post: the title's words first, then the
 *    body's in order. Words past the cap in a very long post aren't found.
 *  - One Firestore query per search (the 60 newest posts with the longest
 *    word), so in a large community older matches can be missed.
 */
import { foldDiacritics, headwordKey } from "@/lib/dictionary/normalize";
import { MAX_PREFIX, MAX_TOKENS } from "./limits";

/** Words of a text, lowercased and NFC, accents kept. */
export function accentedWords(text: string): string[] {
  return headwordKey(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Words of a text, accent-folded ("Học sinh" → ["hoc", "sinh"]). */
export function foldedWords(text: string): string[] {
  return foldDiacritics(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function prefixesOf(word: string): string[] {
  const chars = [...word];
  if (chars.length < 2) return [];
  const out: string[] = [];
  const top = Math.min(chars.length, MAX_PREFIX);
  for (let n = 2; n <= top; n++) out.push(chars.slice(0, n).join(""));
  return out;
}

/** The tokens stored on a post: title words' prefixes first, then the body's, deduplicated, capped. */
export function searchTokens(title: string, body: string): string[] {
  const tokens = new Set<string>();
  for (const word of [...foldedWords(title), ...foldedWords(body)]) {
    for (const p of prefixesOf(word)) {
      if (tokens.size >= MAX_TOKENS) return [...tokens];
      tokens.add(p);
    }
  }
  return [...tokens];
}

export interface SearchQuery {
  /** Folded words (2+ letters) that must all start a word in the post. */
  words: string[];
  /** The same words with their accents as typed, for ranking exact matches first. */
  exact: string[];
  /** The token to ask Firestore for: the longest word, cut to MAX_PREFIX. Null if nothing searchable. */
  token: string | null;
}

export function parseQuery(q: string): SearchQuery {
  const exact: string[] = [];
  const words: string[] = [];
  for (const w of accentedWords(q)) {
    const folded = foldDiacritics(w);
    if ([...folded].length < 2 || words.includes(folded)) continue;
    words.push(folded);
    exact.push(w);
  }
  const longest = [...words].sort((a, b) => [...b].length - [...a].length)[0];
  return { words, exact, token: longest ? [...longest].slice(0, MAX_PREFIX).join("") : null };
}

interface Searchable {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

function startsAny(words: string[], q: string): boolean {
  return words.some((w) => w.startsWith(q));
}

/** Whether every word of the query starts some word of the post. */
export function matchesQuery(post: Searchable, query: SearchQuery): boolean {
  if (query.words.length === 0) return false;
  const words = foldedWords(`${post.title} ${post.body}`);
  return query.words.every((q) => startsAny(words, q));
}

/**
 * Keeps the posts that match every word and ranks them: exact-accent
 * matches first, then matches in the title, then newer first.
 */
export function rankSearchResults<T extends Searchable>(posts: T[], query: SearchQuery): T[] {
  const scored = posts
    .filter((p) => matchesQuery(p, query))
    .map((p) => {
      const exactWords = accentedWords(`${p.title} ${p.body}`);
      const titleWords = foldedWords(p.title);
      return {
        p,
        exact: query.exact.filter((q) => startsAny(exactWords, q)).length,
        title: query.words.filter((q) => startsAny(titleWords, q)).length,
      };
    });
  scored.sort((a, b) => b.exact - a.exact || b.title - a.title || b.p.createdAt - a.p.createdAt || (a.p.id < b.p.id ? 1 : -1));
  return scored.map((s) => s.p);
}

/** Common words skipped when looking for related posts. */
const STOPWORDS = new Set([
  // English
  "the", "and", "for", "you", "are", "how", "what", "why", "when", "who", "which", "does", "with", "this", "that",
  "can", "say", "use", "difference", "between", "vietnamese", "word", "words", "mean", "means", "meaning",
  "about", "from", "into", "have", "has", "there", "their", "your", "is", "it",
  // Vietnamese (folded)
  "cua", "cho", "nhung", "khong", "nay", "kia", "nao", "the", "voi", "mot", "cac", "duoc", "trong",
]);

/** Up to 10 folded title words (3+ letters, not stopwords) for an `array-contains-any` related-posts query. */
export function relatedTokens(title: string): string[] {
  const out: string[] = [];
  for (const w of foldedWords(title)) {
    if ([...w].length < 3 || STOPWORDS.has(w)) continue;
    const t = [...w].slice(0, MAX_PREFIX).join("");
    if (!out.includes(t)) out.push(t);
    if (out.length === 10) break;
  }
  return out;
}

/** Ranks related-post candidates by how many of the draft's title words they share; at most `limit`. */
export function rankRelated<T extends Searchable>(candidates: T[], title: string, excludeId: string | null, limit = 5): T[] {
  const wanted = relatedTokens(title);
  if (wanted.length === 0) return [];
  return candidates
    .filter((c) => c.id !== excludeId)
    .map((c) => {
      const words = foldedWords(`${c.title} ${c.body}`);
      const titleWords = foldedWords(c.title);
      return {
        c,
        hits: wanted.filter((t) => startsAny(words, t)).length,
        titleHits: wanted.filter((t) => startsAny(titleWords, t)).length,
      };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.titleHits - a.titleHits || b.hits - a.hits || b.c.createdAt - a.c.createdAt)
    .slice(0, limit)
    .map((s) => s.c);
}
