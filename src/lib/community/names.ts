/**
 * Community display names: what's allowed, the key that makes them unique,
 * reserved names, and the 30-day rename rule. Pure.
 *
 * - 3–30 characters: Latin letters (with every Vietnamese accent), digits,
 *   spaces and . _ -, starting and ending with a letter or digit, single
 *   spaces only.
 * - Unique ignoring case and accents: the key is `foldDiacritics` (the
 *   Dictionary's accent folding), so "Bảo" and "bao" are the same name. The
 *   key is also the id of the `communityNames/{key}` doc that claims it.
 *
 * Letters from other alphabets aren't allowed. That keeps the key
 * computable in firestore.rules (which can't do Unicode folding, so it maps
 * each accented letter itself; see `nameKeyOf` there) and stops look-alike
 * letters (Cyrillic "а" for Latin "a") from impersonating another member.
 * `names.test.ts` checks the rules' letter classes against VIET_LETTERS.
 */
import { foldDiacritics } from "@/lib/dictionary/normalize";
import { RENAME_DAYS } from "./limits";

export const NAME_MIN = 3;
export const NAME_MAX = 30;

/** Every accented Vietnamese letter (both cases), by the plain letter it folds to. */
export const VIET_LETTERS: Readonly<Record<string, string>> = {
  a: "àáảãạăằắẳẵặâầấẩẫậÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ",
  d: "đĐ",
  e: "èéẻẽẹêềếểễệÈÉẺẼẸÊỀẾỂỄỆ",
  i: "ìíỉĩịÌÍỈĨỊ",
  o: "òóỏõọôồốổỗộơờớởỡợÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ",
  u: "ùúủũụưừứửữựÙÚỦŨỤƯỪỨỬỮỰ",
  y: "ỳýỷỹỵỲÝỶỸỴ",
};

const VIET = Object.values(VIET_LETTERS).join("");
const ALNUM = `A-Za-z0-9${VIET}`;
const NAME_RE = new RegExp(`^[${ALNUM}][${ALNUM} ._-]{${NAME_MIN - 2},${NAME_MAX - 2}}[${ALNUM}]$`);
const ALLOWED_CHAR_RE = new RegExp(`^[${ALNUM} ._-]$`);
const ALNUM_RE = new RegExp(`^[${ALNUM}]$`);

/**
 * Reserved names, checked on the key. These exact strings also appear in
 * firestore.rules' `reservedName` (names.test.ts checks), so keep them
 * plain: no character classes the two regex engines might read differently.
 */
export const RESERVED_ANYWHERE = "(admin|moderator|justviet)";
export const RESERVED_EXACT = "(cotuoi|thayvinh|rongcon)[0-9]*";
export const RESERVED_WORDS = "(mod|mods|staff|support|official|system|team)";

const SEPARATORS = /[ ._-]/g;

/** NFC, invisible characters removed, whitespace collapsed to single spaces, trimmed. */
export function cleanName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The uniqueness key: lowercase, accents removed, đ → d. "Thầy Vinh" → "thay vinh". */
export function nameKey(name: string): string {
  return foldDiacritics(cleanName(name));
}

export function isReservedKey(key: string): boolean {
  const compact = key.replace(SEPARATORS, "");
  return (
    new RegExp(`^.*${RESERVED_ANYWHERE}.*$`).test(compact) ||
    new RegExp(`^${RESERVED_EXACT}$`).test(compact) ||
    new RegExp(`^(.*[ ._-])?${RESERVED_WORDS}([ ._-].*)?$`).test(key)
  );
}

/** Why a (cleaned) name can't be used, or null if it's fine. */
export function nameProblem(name: string): string | null {
  const n = cleanName(name);
  if (n.length < NAME_MIN) return `Use at least ${NAME_MIN} characters.`;
  if (n.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
  if (![...n].every((ch) => ALLOWED_CHAR_RE.test(ch))) {
    return "Use letters, numbers, spaces and . _ - only.";
  }
  if (!ALNUM_RE.test(n[0]) || !ALNUM_RE.test(n[n.length - 1])) {
    return "Start and end with a letter or number.";
  }
  if (!NAME_RE.test(n)) return "Use letters, numbers, spaces and . _ - only.";
  if (isReservedKey(nameKey(n))) return "That name is reserved. Please choose another.";
  return null;
}

/**
 * A starting suggestion from the account's display name: never an email
 * address, with characters that aren't allowed dropped. "" if nothing usable.
 */
export function suggestName(displayName: string | null | undefined): string {
  if (!displayName || displayName.includes("@")) return "";
  const kept = [...cleanName(displayName)].filter((ch) => ALLOWED_CHAR_RE.test(ch)).join("");
  let n = cleanName(kept).slice(0, NAME_MAX);
  // Trim punctuation off the ends so it starts and ends with a letter or digit.
  while (n && !ALNUM_RE.test(n[0])) n = n.slice(1);
  while (n && !ALNUM_RE.test(n[n.length - 1])) n = n.slice(0, -1);
  n = cleanName(n);
  return nameProblem(n) ? "" : n;
}

const DAY_MS = 86_400_000;

/** Whether the name can be changed now, and if not, when. The first change is allowed any time. */
export function renameStatus(nameChangedAt: number | null, now: number): { allowed: boolean; nextAt: number | null } {
  if (nameChangedAt == null) return { allowed: true, nextAt: null };
  const nextAt = nameChangedAt + RENAME_DAYS * DAY_MS;
  return now >= nextAt ? { allowed: true, nextAt: null } : { allowed: false, nextAt };
}
