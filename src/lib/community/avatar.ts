/**
 * Avatars are initials on a colour the member picks. The colours are CSS
 * variables in globals.css (`--color-avatar-*`, all dark enough for white
 * text), and firestore.rules accepts exactly these ids.
 */

export const AVATAR_COLORS = [
  { id: "tomato", label: "Tomato", className: "bg-avatar-tomato" },
  { id: "amber", label: "Amber", className: "bg-avatar-amber" },
  { id: "leaf", label: "Leaf", className: "bg-avatar-leaf" },
  { id: "teal", label: "Teal", className: "bg-avatar-teal" },
  { id: "sky", label: "Sky", className: "bg-avatar-sky" },
  { id: "plum", label: "Plum", className: "bg-avatar-plum" },
  { id: "rose", label: "Rose", className: "bg-avatar-rose" },
  { id: "cocoa", label: "Cocoa", className: "bg-avatar-cocoa" },
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number]["id"];
export const AVATAR_COLOR_IDS: readonly string[] = AVATAR_COLORS.map((c) => c.id);
export const DEFAULT_AVATAR_COLOR: AvatarColor = "tomato";

export function isAvatarColor(v: unknown): v is AvatarColor {
  return typeof v === "string" && AVATAR_COLOR_IDS.includes(v);
}

export function avatarClass(color: string): string {
  return AVATAR_COLORS.find((c) => c.id === color)?.className ?? "bg-avatar-cocoa";
}

/** Up to two initials: the first letters of the first two words ("Bảo Ngọc" → "BN"), or the first two of one word. */
export function initialsFor(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/[\s._-]+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return "?";
  const first = (w: string) => [...w].find((ch) => /[\p{L}\p{N}]/u.test(ch)) ?? "";
  const letters = words.length >= 2 ? first(words[0]) + first(words[1]) : [...words[0]].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).slice(0, 2).join("");
  return letters.toLocaleUpperCase("vi");
}
