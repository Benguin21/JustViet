/**
 * Rồng Con's daily menu: one Vietnamese dish for each goal switched on.
 *
 * The day's dishes come from the learner's id and local calendar date alone, so they are
 * the same all day (refreshes, navigation, other devices) and new at local midnight. Each
 * kind goes through its whole library in a per-learner shuffled order before anything
 * comes back, and changes every day.
 */
import type { GoalId } from "./goals";

export type MenuKind = "food" | "drink" | "dessert";
export interface MenuItem {
  key: string;
  vi: string;
  kind: MenuKind;
}

/** Category priority: the active goals, in their fixed order, take these in turn. */
export const MENU_KINDS: readonly MenuKind[] = ["food", "drink", "dessert"];

export const MENU_LIBRARY: Record<MenuKind, readonly { key: string; vi: string }[]> = {
  food: [
    { key: "pho", vi: "Phở bò" }, { key: "banhmi", vi: "Bánh mì" }, { key: "goicuon", vi: "Gỏi cuốn" },
    { key: "bunbohue", vi: "Bún bò Huế" }, { key: "comtam", vi: "Cơm tấm" }, { key: "banhxeo", vi: "Bánh xèo" },
    { key: "buncha", vi: "Bún chả" }, { key: "hutieu", vi: "Hủ tiếu" }, { key: "bone", vi: "Bò né" },
    { key: "miquang", vi: "Mì Quảng" }, { key: "xoiman", vi: "Xôi mặn" }, { key: "banhcuon", vi: "Bánh cuốn" },
  ],
  drink: [
    { key: "caphe", vi: "Cà phê sữa đá" }, { key: "trada", vi: "Trà đá" }, { key: "nuocmia", vi: "Nước mía" },
    { key: "nuocdua", vi: "Nước dừa" }, { key: "sinhtobo", vi: "Sinh tố bơ" }, { key: "rauma", vi: "Rau má" },
    { key: "suadaunanh", vi: "Sữa đậu nành" }, { key: "trachanh", vi: "Trà chanh" }, { key: "trasua", vi: "Trà sữa" },
    { key: "nuocsam", vi: "Nước sâm" },
  ],
  dessert: [
    { key: "chethai", vi: "Chè thái" }, { key: "sambo", vi: "Sâm bổ lượng" }, { key: "bobia", vi: "Bò bía ngọt" },
    { key: "banhflan", vi: "Bánh flan" }, { key: "suachuanepcam", vi: "Sữa chua nếp cẩm" }, { key: "banhcom", vi: "Bánh cốm" },
    { key: "banhchuoi", vi: "Bánh chuối chiên" }, { key: "tauhu", vi: "Tàu hũ nước đường" }, { key: "kemchuoi", vi: "Kem chuối" },
    { key: "traicaydia", vi: "Trái cây dĩa" },
  ],
};

const MENU_ITEMS: Record<string, MenuItem> = {};
for (const kind of MENU_KINDS) for (const it of MENU_LIBRARY[kind]) MENU_ITEMS[it.key] = { ...it, kind };

export function menuItem(key: string | undefined | null): MenuItem | null {
  return (key && MENU_ITEMS[key]) || null;
}

export function isMenuKey(key: unknown): key is string {
  return typeof key === "string" && key in MENU_ITEMS;
}

/**
 * Each drawing's own extent in its 80×80 art box, [x, y, w, h] with its steam left out,
 * so a drawing can be centred wherever it's shown small.
 */
export const ART_BOX: Record<string, readonly [number, number, number, number]> = {
  pho: [10, 13, 66, 60], banhmi: [10, 28.6, 63.5, 37.4], goicuon: [6, 25, 69, 43], bunbohue: [10, 12.8, 62, 60.2],
  comtam: [6, 28.1, 68, 40.9], banhxeo: [6, 25.7, 68, 43.3], buncha: [11, 23.5, 62, 47.5], hutieu: [4, 13, 66, 60],
  bone: [4, 42, 72, 31], miquang: [5.1, 13.7, 68.9, 58.3], xoiman: [6, 28, 68, 39.1], banhcuon: [6, 27.4, 68, 41.6],
  caphe: [18, 4, 44, 72.5], trada: [18, 16, 44, 60.5], nuocmia: [18, 4, 44, 72.5], nuocdua: [13.4, 5, 56.1, 71.7],
  sinhtobo: [19, 2.9, 49.7, 74.3], rauma: [18, 2.5, 47.5, 74.1], suadaunanh: [15.1, 3.5, 48.9, 73.5], trachanh: [14.9, 4, 44.3, 72.2],
  trasua: [21, 5.5, 38, 70.9], nuocsam: [13.6, 6.2, 48.4, 70.2], chethai: [13, 8.5, 52, 67.5], sambo: [14, 10.5, 54.5, 65.5],
  bobia: [8.5, 31, 63, 44.5], banhflan: [8, 33.6, 65, 41.9], suachuanepcam: [19, 6.5, 44, 70.1], banhcom: [6.8, 42, 66.4, 33],
  banhchuoi: [7, 28.9, 66, 45.1], tauhu: [16, 23, 49.5, 51.7], kemchuoi: [25, 6, 31.8, 71.4], traicaydia: [7, 22.6, 66, 52],
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Days since the epoch for a local day key (see `localDayKey`). */
export function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
}

/** Round r of one kind's rotation: its whole library, shuffled for this learner. */
function round(userId: string, kind: MenuKind, r: number) {
  return shuffle(MENU_LIBRARY[kind], rng(hash(`${userId}|${kind}|${r}`)));
}

export function pickDish(userId: string, kind: MenuKind, n: number): MenuItem {
  const size = MENU_LIBRARY[kind].length;
  const r = Math.floor(n / size);
  const order = round(userId, kind, r);
  // Where one round meets the next, don't serve the same item two days running.
  const last = round(userId, kind, r - 1)[size - 1];
  if (order[0].key === last.key) [order[0], order[1]] = [order[1], order[0]];
  return { ...order[n - r * size], kind };
}

export type DayMenu = Record<MenuKind, MenuItem>;

/** Today's dish of each kind. */
export function menuForDay(userId: string, dayKey: string): DayMenu {
  const n = dayNumber(dayKey);
  return {
    food: pickDish(userId, "food", n),
    drink: pickDish(userId, "drink", n),
    dessert: pickDish(userId, "dessert", n),
  };
}

/**
 * Which dish each active goal gets. The active goals, in their fixed order, take the kinds
 * in priority order (food, drink, dessert); goals switched off are skipped and never move
 * the others' kinds around. A goal Rồng Con was already fed today keeps that dish for the
 * rest of the day (`kept`); the others take the highest-priority kinds still free.
 */
export function assignMenu(
  dishes: DayMenu,
  active: readonly GoalId[],
  kept: Partial<Record<GoalId, string>> = {},
): Partial<Record<GoalId, MenuItem>> {
  const out: Partial<Record<GoalId, MenuItem>> = {};
  const taken = new Set<MenuKind>();
  for (const id of active) {
    const it = menuItem(kept[id]);
    if (it) {
      out[id] = it;
      taken.add(it.kind);
    }
  }
  const free = MENU_KINDS.filter((kind) => !taken.has(kind));
  for (const id of active) if (!out[id]) out[id] = dishes[free.shift() as MenuKind];
  return out;
}

/** Rồng Con's thought cloud, in the dragon drawing's units: its centre and the room in it. */
export const THOUGHT = { cx: 192.7, cy: -15.7, w: 35, h: 27, area: 28.5 } as const;

/**
 * Where to draw a dish in the thought cloud: centred on its own drawing and scaled to fit,
 * with an area cap so wide plates and tall glasses read about the same size.
 */
export function thoughtFit(key: string): { x: number; y: number; size: number } {
  const b = ART_BOX[key] ?? [0, 0, 80, 80];
  const pad = 1.5; // half an outline
  const bw = b[2] + 2 * pad;
  const bh = b[3] + 2 * pad;
  const s = Math.min(THOUGHT.w / bw, THOUGHT.h / bh, THOUGHT.area / Math.sqrt(bw * bh));
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x: r1(THOUGHT.cx - (b[0] + b[2] / 2) * s),
    y: r1(THOUGHT.cy - (b[1] + b[3] / 2) * s),
    size: r1(80 * s),
  };
}
