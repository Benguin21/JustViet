/**
 * Rồng Con's choreography: timings, poses and where things sit on the page. No goal or XP
 * rules in here (see src/lib/companion).
 */
import type { HatchState } from "@/lib/companion/growth";

export type Pose =
  | "intro" | "aside" | "idle" | "turn" | "bow" | "hello" | "wants" | "ask"
  | "poke" | "perk" | "eat" | "celebrate" | "hatching" | "notice";

export const EYES: Partial<Record<Pose, string>> = { bow: "happy", poke: "happy", perk: "happy", eat: "happy", celebrate: "happy", idle: "half" };
export const MOUTH: Partial<Record<Pose, string>> = { notice: "open", hello: "open", poke: "open", celebrate: "open", perk: "open", eat: "chomp" };

export const HATCH_ORDER: Record<HatchState, number> = { egg: 0, peek: 1, almost: 2, hatched: 3 };

/**
 * Feeding beats (ms after the tap): the item lands at the companion, is swallowed (the XP
 * shows up), then Rồng Con reacts and the card's item turns into its finished drawing.
 */
export const FEED = { arrive: 650, swallow: 1100, settle: 1700, react: 1900, next: 2200 };
/**
 * Where the flying item (44px) comes to rest in the unscaled 220×250 dragon drawing: the
 * mouth once Rồng Con can eat, or the middle of the egg while it is still hatching.
 */
export const FEED_TOP = { eat: 125, absorb: 108 } as const;
export type FeedMode = keyof typeof FEED_TOP;

/**
 * The one-time hatching at Baby Dragon (ms after its XP lands): the egg shakes, big cracks
 * split it, it bursts and Rồng Con pops out, then jumps for joy saying "Mình nở rồi!". Once
 * all is quiet the teachers' card follows (GUIDES.hatch).
 */
export const HATCH_FX = { crack: 900, burst: 1500, cheer: 2200, end: 5000 };

/**
 * Phases of a big jump, each ended by its own event: 'prep' (the line is up, so the room it
 * leaves can be measured), 'open' (the clearance opens: margin-top transitionend), 'held'
 * (opened early, at the day's last meal, waiting for the celebration itself), 'rise' (the
 * dialogue's translate transitionend), 'jump' (jv-celebrate's animationend), 'ret'
 * (translate again) and 'close' (margin-top again). A phase in which nothing would move is
 * skipped. The guard only moves a phase on if its event never arrives (say, a background
 * tab); 'held' has none, as the celebration (or whatever cuts it short) ends it.
 */
export type LiftPhase = "prep" | "open" | "held" | "rise" | "jump" | "ret" | "close";
export const LIFT_GUARD: Partial<Record<LiftPhase, number>> = { prep: 300, open: 700, rise: 650, jump: 2900, ret: 800, close: 700 };
/** After settling back, the celebration line stays a moment before Rồng Con goes idle. */
export const CHEER_HOLD = 700;
/** Without motion the celebration keeps its original length. */
export const CHEER_STILL = 2600;

/**
 * Where the dialogue sits. Heights of the drawing are in drawing units, stroke included,
 * measured from the drawing itself: REST_TOP is its top at rest, PEAK its highest point at
 * the top of jv-celebrate, THOUGHT_TOP the top of the daydream cloud. Until it hatches the
 * egg is whole, so its top is the egg's in every look (the lifting shell pieces stay below it).
 */
const REST_TOP: Record<HatchState, number> = { egg: -15.75, peek: -15.75, almost: -15.75, hatched: 18.28 };
const PEAK: Record<HatchState, number> = { egg: -55.9, peek: -55.9, almost: -55.9, hatched: -24.7 };
const THOUGHT_TOP = -42;
const HOP = 16; // the little hops (jv-hop), in drawing units
const TAIL_Y = 7; // the bubble's tail reaches 7px below the top of Rồng Con's box
const LIFT_AIR = 6; // gap kept between the tail and a still Rồng Con (reduced motion)
// Gap left at the very top of a big jump: small enough that the plain egg's jump fits under
// the dialogue with no clearance.
const JUMP_AIR = 3;
// Once it has grown, its growth spring overshoots by about 0.01 just as the happy hop peaks.
const GROW_OVERSHOOT = 0.01;

/**
 * A height in drawing units as px from the top of the 220x250 box: one unit is 250/260 px,
 * the drawing starts 40 units above the box, and the box scales from 50% 92% as goals are fed.
 */
function boxY(u: number, scale: number): number {
  return 230 + (((u + 40) * 250) / 260 - 230) * scale;
}

/**
 * Resting: the original gap above Rồng Con's little hops, kept as it grows. At the start of
 * the day (nothing fed yet) that is exactly the original spot, so no offset. With reduced
 * motion (still) there are no hops or spring: only its resting top counts, with the same
 * LIFT_AIR as a big jump so the tail never sits right on Rồng Con.
 */
export function talkRestPx(hatchState: HatchState, scale: number, thought: boolean, still: boolean): number {
  if (scale > 1 && !still) scale += GROW_OVERSHOOT;
  let top = still ? boxY(REST_TOP[hatchState], scale) - LIFT_AIR : boxY(REST_TOP[hatchState] - HOP, scale);
  if (thought) top = Math.min(top, boxY(THOUGHT_TOP, scale));
  return Math.max(0, Math.round(TAIL_Y - top));
}

/** A big jump: just enough to clear the drawing's highest point, plus JUMP_AIR. */
export function talkLiftPx(hatchState: HatchState, scale: number): number {
  return Math.max(0, Math.ceil(TAIL_Y - boxY(PEAK[hatchState], scale) + JUMP_AIR));
}

/** The dialogue stays this far below the goal cards' boxes: their 4px shadow and 4px of air. */
export const GOAL_AIR = 8;
/**
 * Where a big jump's clearance comes from, so nothing after the hero moves: first the hero's
 * bottom padding (24px, down to 8), then the 40px gap under the hero (down to 8).
 */
export const HERO_PAD = 24;
export const CLEAR_PAD = 16;
export const CLEAR_GAP = 32;

/**
 * The confetti burst, fixed per piece so a re-render never reshuffles it: each starts behind
 * one of Rồng Con's sides at a slightly different spot, pops outward and up, then falls with
 * its own drift, spin, speed, delay, size and flutter.
 */
const CONFETTI_COLORS = ["#f15b48", "#f2c35b", "#7fb89a", "#f9cfb4"];
function confettiRand(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
export const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const r = (k: number) => confettiRand(i, k);
  const shape = i % 3;
  const w = shape === 1 ? 7 : shape === 2 ? 4 : 7 + Math.round(r(9) * 3);
  const h = shape === 1 ? 7 : shape === 2 ? 12 + Math.round(r(9) * 3) : 10 + Math.round(r(10) * 4);
  return {
    x: Math.round(side * (36 + r(1) * 44)),
    y: Math.round(72 + r(2) * 76),
    dx: Math.round(side * (55 + r(3) * 75)),
    up: Math.round(34 + r(4) * 40),
    fall: Math.round(170 + r(5) * 90),
    rot: Math.round(side * (220 + r(6) * 420)),
    dur: Math.round(1600 + r(7) * 700),
    delay: Math.round(r(8) * 380),
    w,
    h,
    r: shape === 1 ? "50%" : "2px",
    color: CONFETTI_COLORS[(i * 3 + Math.floor(r(11) * 2)) % CONFETTI_COLORS.length],
    flip: Math.round(320 + r(12) * 420),
  };
});
