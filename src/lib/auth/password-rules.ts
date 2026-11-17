/**
 * Password rules for every place a password is chosen: signup, the
 * settings page's change/set password, and the reset-password email link
 * (`/auth/action`). Pure — no Firebase, no React — so it's unit tested in
 * `password-rules.test.ts`. The breach check lives next door in
 * `breach-check.ts` because it needs the network.
 *
 * Hard rules (a password is rejected if it breaks any):
 *  - at least `PASSWORD_MIN_LENGTH` (10) characters, at most `PASSWORD_MAX_LENGTH`
 *  - not a very common password or an obvious pattern ("password123",
 *    "1234567890", "qwertyuiop", "aaaaaaaaaa"…)
 *  - not found in a known data breach (async; see `breach-check.ts`)
 *
 * Deliberately no "must contain a symbol/number/uppercase" rule: those push
 * people toward "Password1!" patterns. Length matters most, so the
 * strength meter rewards length and passphrases instead.
 *
 * Existing accounts with shorter passwords can still sign in — these rules
 * only apply when a password is set or changed.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordProblem = "too-short" | "too-long" | "common" | "breached";

export const PASSWORD_PROBLEM_MESSAGE: Record<PasswordProblem, string> = {
  "too-short": `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  "too-long": `Use at most ${PASSWORD_MAX_LENGTH} characters.`,
  common: "That password is too common or easy to guess. Try a few unrelated words.",
  breached:
    "That password has appeared in a known data breach, so it isn't safe to use. Please choose a different one.",
};

/** Optional details about the account, used to spot passwords built from the user's own name or email. */
export interface PasswordContext {
  email?: string | null;
  name?: string | null;
}

/**
 * Base words that make a password guessable no matter what digits or
 * symbols are tacked on ("Password2024!", "iloveyou123"). Compared after
 * lowercasing, undoing common letter swaps (p@ssw0rd) and stripping
 * leading/trailing digits and symbols. Includes a few Vietnamese and
 * JustViet-specific favourites.
 */
const COMMON_BASES = new Set([
  "password", "passwort", "motdepasse", "contrasena", "matkhau", "pass", "passcode", "secret",
  "qwerty", "qwertz", "azerty", "qwertyuiop", "asdfghjkl", "asdfgh", "zxcvbnm", "qazwsx",
  "iloveyou", "loveyou", "love", "lovely", "anhyeuem", "emyeuanh", "yeuem", "yeuanh",
  "letmein", "welcome", "admin", "administrator", "login", "user", "guest", "test", "default",
  "changeme", "whatever", "trustno", "nothing", "access", "master", "hello", "hellokitty",
  "monkey", "dragon", "sunshine", "princess", "shadow", "superman", "batman", "starwars",
  "pokemon", "football", "baseball", "basketball", "soccer", "hockey", "jordan", "michael",
  "jennifer", "charlie", "hunter", "freedom", "computer", "internet", "google", "facebook",
  "apple", "samsung", "iphone", "chocolate", "cheese", "flower", "summer", "winter",
  "justviet", "vietnam", "vietnamese", "tiengviet", "xinchao", "hanoi", "saigon", "hochiminh",
  "abc", "abcd", "abcdef", "abcdefg", "abcdefgh", "abcdefghi", "abcdefghij",
]);

/** Whole passwords that are common at 10+ characters and aren't caught by the pattern checks. */
const COMMON_EXACT = new Set([
  "1234567890", "0987654321", "1q2w3e4r5t", "1q2w3e4r5t6y", "1qaz2wsx3edc", "zaq12wsxcde3",
  "q1w2e3r4t5", "a1b2c3d4e5", "1a2b3c4d5e", "123qweasdzxc", "qweasdzxc123", "0123456789",
  "9876543210", "123123123123", "11223344556677", "1122334455",
]);

/** Keyboard rows; a password that's just a run along one of these is a pattern, not a secret. */
const KEYBOARD_RUNS = [
  "qwertyuiopasdfghjklzxcvbnm",
  "1234567890qwertyuiop",
  "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
  "!@#$%^&*()_+",
  "zxcvbnmasdfghjklqwertyuiop",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i",
};

function undoLeet(text: string): string {
  return Array.from(text, (ch) => LEET[ch] ?? ch).join("");
}

/** Lowercase, accents stripped (so "mậtkhẩu" still matches "matkhau"), whitespace removed. */
function simplify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** True for a run of consecutive characters, up or down ("abcdefghij", "9876543210"). */
function isSequential(text: string): boolean {
  if (text.length < 3) return false;
  const step = text.charCodeAt(1) - text.charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  for (let i = 2; i < text.length; i++) {
    if (text.charCodeAt(i) - text.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

/** True if the whole text is a short unit repeated ("abababab", "123123123", "zzzzzzzzzz"). */
function isRepeatedUnit(text: string): boolean {
  for (let size = 1; size <= 4 && size * 2 <= text.length; size++) {
    const unit = text.slice(0, size);
    if (unit.repeat(Math.ceil(text.length / size)).slice(0, text.length) === text) return true;
  }
  return false;
}

function isKeyboardRun(text: string): boolean {
  return KEYBOARD_RUNS.some((row) => row.includes(text) || row.split("").reverse().join("").includes(text));
}

/**
 * True if the password is a very common one or an obvious pattern. Checks
 * the whole password, and its "core" with leading/trailing digits and
 * symbols removed (so "Dragon2024!!" counts as "dragon").
 */
export function isCommonPassword(password: string): boolean {
  const simple = simplify(password);
  if (COMMON_EXACT.has(simple)) return true;
  if (isSequential(simple) || isRepeatedUnit(simple) || isKeyboardRun(simple)) return true;

  const stripEnds = (text: string) => text.replace(/^[^a-z]+|[^a-z]+$/g, "");
  const digits = simple.replace(/[^0-9]/g, "");
  const digitsArePattern =
    digits.length >= 6 && (isSequential(digits) || isRepeatedUnit(digits) || COMMON_EXACT.has(digits));

  // All digits/symbols ("1111111111!"): guessable if the digits are a pattern.
  if (stripEnds(simple).length === 0 && stripEnds(undoLeet(simple)).length === 0) {
    return digits.length > 0 && (isSequential(digits) || isRepeatedUnit(digits));
  }

  // The "core" word, tried two ways because a trailing "1" may be a digit
  // ("password1") or a letter swap ("passwordi"): strip the ends then undo
  // swaps ("P@ssw0rd123" → "password"), and undo swaps then strip.
  const cores = new Set([undoLeet(stripEnds(simple)), stripEnds(undoLeet(simple)), stripEnds(simple)]);
  for (const core of cores) {
    if (core.length === 0) continue;
    // A letter or two around a digit pattern ("a1234567890").
    if (core.length < 4 && digitsArePattern) return true;
    if (COMMON_BASES.has(core)) return true;
    // The same common word twice ("passwordpassword", "dragondragon").
    const half = core.slice(0, core.length / 2);
    if (core.length % 2 === 0 && COMMON_BASES.has(half) && core === half + half) return true;
    if (core.length >= 4 && (isSequential(core) || isRepeatedUnit(core) || isKeyboardRun(core))) return true;
  }
  return false;
}

/** Problems found by the synchronous rules (length, common). The breach check is separate. */
export function checkPasswordRules(password: string): PasswordProblem[] {
  const problems: PasswordProblem[] = [];
  const length = Array.from(password).length;
  if (length < PASSWORD_MIN_LENGTH) problems.push("too-short");
  else if (length > PASSWORD_MAX_LENGTH) problems.push("too-long");
  if (length > 0 && isCommonPassword(password)) problems.push("common");
  return problems;
}

/** True if the password contains the user's name or the part of their email before the @. */
export function containsPersonalInfo(password: string, context: PasswordContext = {}): boolean {
  const simple = undoLeet(simplify(password));
  const pieces: string[] = [];
  const local = context.email?.split("@")[0];
  if (local) pieces.push(...simplify(local).split(/[^a-z0-9]+/));
  if (context.name) pieces.push(...context.name.split(/\s+/).map((word) => simplify(word).replace(/[^a-z0-9]/g, "")));
  return pieces.some((piece) => piece.length >= 4 && simple.includes(piece));
}

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export const STRENGTH_LABEL: Record<StrengthScore, string> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very strong",
};

export interface PasswordStrength {
  score: StrengthScore;
  label: string;
  /** A short, friendly hint for getting a better score, if there is one. */
  hint?: string;
}

/**
 * A rough strength estimate for the meter. It rewards length most (a
 * four-word passphrase scores "Very strong" without any symbols), gives a
 * little credit for character variety, and discounts repeated or
 * sequential runs. Anything that breaks a hard rule scores 0.
 */
export function passwordStrength(password: string, context: PasswordContext = {}): PasswordStrength {
  if (!password) return { score: 0, label: STRENGTH_LABEL[0] };
  const problems = checkPasswordRules(password);
  if (problems.length > 0) {
    return { score: 0, label: STRENGTH_LABEL[0], hint: PASSWORD_PROBLEM_MESSAGE[problems[0]] };
  }

  const chars = Array.from(password);
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9\s]/.test(password)) pool += 33;
  if (/\s/.test(password)) pool += 1;
  if (/[^\u0000-\u007f]/.test(password)) pool += 40; // accented letters, e.g. Vietnamese

  // Each character counts, except repeats and steps of an ongoing run count for little.
  let effective = 0;
  for (let i = 0; i < chars.length; i++) {
    const prev = chars[i - 1];
    const cur = chars[i];
    if (prev !== undefined && (prev === cur || Math.abs(cur.charCodeAt(0) - prev.charCodeAt(0)) === 1)) {
      effective += 0.25;
    } else {
      effective += 1;
    }
  }
  const bits = effective * Math.log2(Math.max(pool, 2));

  let score: StrengthScore = bits < 45 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  let hint: string | undefined;
  if (containsPersonalInfo(password, context)) {
    score = 1;
    hint = "Avoid using your name or email in your password.";
  } else if (score < 3) {
    hint = "Longer is stronger — try adding another word or two.";
  }
  return { score, label: STRENGTH_LABEL[score], hint };
}
