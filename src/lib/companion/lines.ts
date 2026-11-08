/**
 * What Rồng Con says: bilingual lines (Vietnamese first, then English) and its mood.
 */
import { menuItem, type MenuItem, type MenuKind } from "./menu";

export interface Line {
  vi: string;
  en: string;
}

export const LINES = {
  hello: { vi: "Xin chào!", en: "Hello!" },
  wants: { vi: "Hôm nay mình thèm mấy món này nè!", en: "Here’s what I’m craving today!" },
  ask: { vi: "Học xong rồi quay lại cho mình ăn nha!", en: "Finish your lessons, then come back and feed me!" },
  ready: { vi: "Giỏi quá!", en: "You did it! Let’s celebrate with a little nom nom!" },
  eat: { vi: "Ngon quá!", en: "That was delicious!" },
  tier: { vi: "Giỏi quá! Thêm XP nè!", en: "Great job! Bonus XP!" },
  studied: { vi: "Chăm học ghê!", en: "Look at all that studying! More XP!" },
  levelUp: { vi: "Lên cấp rồi!", en: "Level up! We’re growing!" },
  oops: { vi: "Không sao đâu!", en: "No worries!" },
  hatched: { vi: "Mình nở rồi!", en: "I hatched!" },
  celebrate: { vi: "No quá!", en: "Thank you! See you tomorrow!" },
  noMenu: { vi: "Hôm nay chưa có thực đơn!", en: "No menu for me today yet!" },
  setGoals: { vi: "Chọn mục tiêu trong Goals nha!", en: "Pick your daily goals in Goals, and I’ll plan a dish for each!" },
} as const satisfies Record<string, Line>;

export type LineKey = keyof typeof LINES;

/** After a meal: the classic "Ngon quá!" for food, slang for a drink or a dessert. */
export const EAT_LINES: Record<MenuKind, Line> = {
  food: LINES.eat,
  drink: { vi: "Đã quá trời!", en: "That hit the spot!" },
  dessert: { vi: "Ngọt xỉu luôn!", en: "So sweet I could faint!" },
};

export function eatLine(item: Pick<MenuItem, "key"> & Partial<Pick<MenuItem, "kind">>): Line {
  const kind = item.kind ?? menuItem(item.key)?.kind;
  return (kind && EAT_LINES[kind]) || LINES.eat;
}

export const POKES: readonly Line[] = [
  { vi: "Hihi, nhột quá!", en: "Hehe, that tickles!" },
  { vi: "Cố lên nhé!", en: "You’ve got this!" },
  { vi: "Bạn giỏi lắm!", en: "You’re doing great!" },
  { vi: "Mình đói bụng rồi…", en: "I’m getting a little hungry…" },
  { vi: "Học một chút thôi nha?", en: "Just a little study?" },
];

export const MOODS = [
  "Daydreaming about lunch. Mơ màng…",
  "Happy! One down. Vui quá!",
  "So happy, almost full! Vui lắm!",
  "Over the moon. Hạnh phúc ghê!",
] as const;
export const MOOD_NO_MENU = "Waiting for today’s menu. Chờ thực đơn…";

/** Nothing fed yet: daydreaming. One still to come: almost full. All of them: over the moon. */
export function moodFor(done: number, all: number): string {
  if (!all) return MOOD_NO_MENU;
  if (done >= all) return MOODS[3];
  if (done === 0) return MOODS[0];
  return done === all - 1 ? MOODS[2] : MOODS[1];
}
