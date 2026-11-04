/**
 * Rồng Con's growth: stages by total XP, and how far along the egg's hatching is.
 *
 * Hatching runs in three looks that follow on from each other (the egg keeps one size):
 *   egg     0-112 XP  cracks spread over the shell
 *   peek  113-174 XP  a small hole opens and only Rồng Con's eye looks out
 *   almost 175-249 XP  a line of pecks runs round the egg from the hole; the shell goes flaky
 * It hatches at Baby Dragon (STAGES[1].min).
 */
import { CHIPS, CRACKS, CRUMBS, FLAKES, LIFTS } from "./crackTables";

export interface Stage {
  en: string;
  min: number;
}

export const STAGES: readonly Stage[] = [
  { en: "Hatching", min: 0 },
  { en: "Baby Dragon", min: 250 },
  { en: "Young Dragon", min: 600 },
  { en: "Majestic Dragon", min: 1200 },
];

export type HatchState = "egg" | "peek" | "almost" | "hatched";
export const PEEK_AT = 113;
export const ALMOST_AT = 175;
/** From here the egg gets restless and "Almost ready to hatch!" shows. Only a cue. */
export const HATCH_SOON = 225;
/** A crack piece that has started shows at least this much of itself at once. */
export const CRACK_FIRST = 0.18;
/** Crack colour: a light grey-brown at first, a warm brown (never the outline's) when done. */
export const CRACK_INK = { from: [184, 163, 146], to: [143, 108, 86] } as const;
/** The two shell pieces that loosen while it is almost hatched. */
export const FRAGS = { a: { from: 200 }, b: { from: 225 } } as const;

export function stageFor(xp: number): { index: number; cur: Stage; next: Stage | null } {
  let i = 0;
  while (i + 1 < STAGES.length && xp >= STAGES[i + 1].min) i++;
  return { index: i, cur: STAGES[i], next: STAGES[i + 1] ?? null };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * How much of each crack piece is drawn (0..1), by id, plus `strength`: how far the early
 * cracks have spread overall (0 at the first, 1 when they're all done), which sets the ink.
 */
export function crackProgress(xp: number): { strength: number; pieces: Record<string, number> } {
  const early = CRACKS.filter((k) => !k.late);
  const first = early[0].from;
  const last = Math.max(...early.map((k) => k.to));
  const pieces: Record<string, number> = {};
  for (const k of CRACKS) pieces[k.id] = xp < k.from ? 0 : Math.max(CRACK_FIRST, clamp01((xp - k.from) / (k.to - k.from)));
  return { strength: clamp01((xp - first) / (last - first)), pieces };
}

/** The crack pieces that start between two XP totals (going up). */
export function newCracks(from: number, to: number): string[] {
  return CRACKS.filter((k) => from < k.from && to >= k.from).map((k) => k.id);
}

export interface Hatch {
  state: HatchState;
  /** Size of the pip hole (0 = none). */
  hole: number;
  /** Restlessness band 1..3 (0 once hatched). */
  wiggle: 0 | 1 | 2 | 3;
  soon: boolean;
  frag: { a: number; b: number };
}

export function hatchFor(xp: number): Hatch {
  const top = STAGES[1].min;
  if (xp >= top) return { state: "hatched", hole: 0, wiggle: 0, soon: false, frag: { a: 0, b: 0 } };
  const h = clamp01(xp / top);
  const state: HatchState = xp < PEEK_AT ? "egg" : xp < ALMOST_AT ? "peek" : "almost";
  // The hole: just the eye at first, a little more of it each day, then barely growing.
  const hole =
    state === "egg"
      ? 0
      : state === "peek"
        ? 0.55 + 0.45 * clamp01((xp - PEEK_AT) / (ALMOST_AT - 1 - PEEK_AT))
        : 1 + 0.1 * clamp01((xp - ALMOST_AT) / (top - 1 - ALMOST_AT));
  const lift = (from: number) => (xp < from ? 0 : 0.3 + 0.7 * clamp01((xp - from) / (top - 1 - from)));
  return {
    state,
    hole: Math.round(hole * 100) / 100,
    wiggle: h < 0.3 ? 1 : h < 0.6 ? 2 : 3,
    soon: xp >= HATCH_SOON,
    frag: { a: lift(FRAGS.a.from), b: lift(FRAGS.b.from) },
  };
}

/** The crack ink for a given spread (0..1), as a hex colour. */
export function crackInk(strength: number): string {
  return (
    "#" +
    CRACK_INK.from
      .map((v, i) => Math.round(v + (CRACK_INK.to[i] - v) * strength).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Which shell bits show at this XP. Chips, curled flakes and crumbs go once it hatches;
 * the flaked patches stay on the shell (the burst pieces carry them).
 */
export function shellBitsFor(xp: number, hatched: boolean) {
  const on = (list: readonly { id: string; at: number }[], keepWhenHatched: boolean) =>
    Object.fromEntries(list.map((k) => [k.id, xp >= k.at && (keepWhenHatched || !hatched)]));
  return {
    chips: on(CHIPS, false),
    flakes: on(FLAKES, true),
    lifts: on(LIFTS, false),
    crumbs: on(CRUMBS, false),
  };
}
