/**
 * Text normalization for Vietnamese headwords — the one place that decides
 * when two spellings are "the same word". Used by the Dictionary (duplicate
 * detection, search, lookup) and by the Vocab SRS integration
 * (`srs-link.ts`), so both modules agree on matching. Pure, no imports.
 *
 * Matching rules (see `headwordKey`):
 *  - trim, collapse runs of whitespace (incl. non-breaking spaces) to one space
 *  - Unicode NFC, so precomposed "à" (U+00E0) and "a" + combining grave
 *    (U+0061 U+0300) compare equal
 *  - case-insensitive ("Xin Chào" = "xin chào")
 *  - diacritics, including tone marks, are PRESERVED: "ma", "má", "mà" are
 *    three different keys.
 *
 * Accent-insensitive comparison (`foldDiacritics`) exists only for search
 * suggestions — it is never used to decide that two headwords are duplicates.
 */

/** Zero-width characters that sometimes ride along in pasted text. */
const INVISIBLES = /[​-‍⁠﻿]/g;

/** NFC + strip invisibles + trim + single-space. Case is kept. Use for display/storage. */
export function cleanHeadword(text: string): string {
  return text.normalize("NFC").replace(INVISIBLES, "").replace(/\s+/g, " ").trim();
}

/**
 * The headword key: the stable dictionary ID for a Vietnamese word or
 * phrase, and the basis of every duplicate check. See the module comment
 * for the rules.
 */
export function headwordKey(text: string): string {
  // Lowercase, then re-normalize: lowercasing can in principle produce
  // non-NFC sequences, and the key must be canonical.
  return cleanHeadword(text).toLowerCase().normalize("NFC");
}

/**
 * Accent-insensitive form for search suggestions only: removes every
 * combining mark (tones, breve, circumflex, horn) and maps đ → d.
 * "Đường phố" → "duong pho". NOT a duplicate key — see the module comment.
 */
export function foldDiacritics(text: string): string {
  return headwordKey(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .normalize("NFC");
}

/** Lowercased, single-spaced English (or any) text for case-insensitive search. */
export function normalizeSearchText(text: string): string {
  return text.normalize("NFC").replace(INVISIBLES, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Vietnamese is written one syllable per space-separated token, but a
 * dictionary *word* can span several syllables ("học sinh", "đại học").
 * This only splits into syllables; grouping syllables into words is the
 * dictionary index's job (`DictionaryIndex.segment`).
 */
export function splitSyllables(text: string): string[] {
  return headwordKey(text).split(" ").filter(Boolean);
}

/** The six Vietnamese tones, in dictionary order (ngang, huyền, hỏi, ngã, sắc, nặng). */
export const TONE_ORDER = ["ngang", "huyen", "hoi", "nga", "sac", "nang"] as const;
export type Tone = (typeof TONE_ORDER)[number];

/** Combining tone marks (in NFD) → tone. Breve/circumflex/horn are letter marks, not tones. */
const TONE_MARKS: Record<string, Tone> = {
  "̀": "huyen", // grave: à
  "̉": "hoi", // hook above: ả
  "̃": "nga", // tilde: ã
  "́": "sac", // acute: á
  "̣": "nang", // dot below: ạ
};

/**
 * Splits one syllable into its letters (with ă/â/ê/ô/ơ/ư/đ kept as their own
 * letters) and its tone. "ộ" → { letters: "ô", tone: "nang" }.
 */
export function decomposeSyllable(syllable: string): { letters: string; tone: Tone } {
  let tone: Tone = "ngang";
  let rest = "";
  for (const ch of syllable.toLowerCase().normalize("NFD")) {
    const mark = TONE_MARKS[ch];
    if (mark) {
      if (tone === "ngang") tone = mark;
    } else {
      rest += ch;
    }
  }
  return { letters: rest.normalize("NFC"), tone };
}
