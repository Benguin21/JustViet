/**
 * What the Grammar map's background shows at each level: its colours (each level's gradient runs
 * from its own colour at the bottom to the next level's at the top, so the scenery blends as you
 * climb), and which small drawings are scattered beside the path. Placements come from a seeded
 * random generator, so every visit (and every learner) sees the same map. Pure; the drawings
 * themselves are in src/components/grammar/SceneryArt.tsx.
 */
import type { SceneId } from "./levels";

export type SpriteId =
  | "lilypad"
  | "lotus"
  | "bud"
  | "reeds"
  | "ripple"
  | "fish"
  | "boat"
  | "rice"
  | "egret"
  | "grass"
  | "tree"
  | "bamboo"
  | "haystack"
  | "flowers"
  | "peak"
  | "pine"
  | "rock"
  | "cloud"
  | "lantern";

/** Each drawing's box (its symbol's viewBox) and how wide it's drawn, in px. */
export const SPRITES: Record<SpriteId, { w: number; h: number; size: number }> = {
  lilypad: { w: 60, h: 36, size: 70 },
  lotus: { w: 60, h: 46, size: 64 },
  bud: { w: 30, h: 52, size: 28 },
  reeds: { w: 40, h: 60, size: 44 },
  ripple: { w: 60, h: 20, size: 72 },
  fish: { w: 40, h: 20, size: 34 },
  boat: { w: 100, h: 44, size: 110 },
  rice: { w: 40, h: 36, size: 40 },
  egret: { w: 40, h: 50, size: 38 },
  grass: { w: 30, h: 20, size: 34 },
  tree: { w: 60, h: 72, size: 72 },
  bamboo: { w: 40, h: 84, size: 46 },
  haystack: { w: 50, h: 40, size: 58 },
  flowers: { w: 36, h: 24, size: 40 },
  peak: { w: 160, h: 110, size: 200 },
  pine: { w: 40, h: 64, size: 42 },
  rock: { w: 44, h: 28, size: 46 },
  cloud: { w: 90, h: 40, size: 120 },
  lantern: { w: 30, h: 60, size: 26 },
};

/**
 * The colour at the bottom of each level, plus one for the top of Master: lake water, paddies,
 * fields, golden plains, terraces, mountain greens, mist, and the dawn sky round the chùa.
 */
export const LEVEL_COLOURS = [
  "#a9dbe0",
  "#b2dfdc",
  "#bfe3d2",
  "#d2e8bd",
  "#dfecb2",
  "#e9eeb0",
  "#cfe4a6",
  "#bcd5ab",
  "#c9d4d8",
  "#e4e0ea",
  "#fde9cf",
] as const;

/** Which drawings each scene scatters, with how often each comes up. */
export const SCENE_SPRITES: Record<SceneId, readonly (readonly [SpriteId, number])[]> = {
  lake: [["lilypad", 5], ["lotus", 3], ["bud", 2], ["ripple", 3], ["reeds", 1], ["fish", 1]],
  paddy: [["rice", 6], ["ripple", 2], ["lilypad", 1], ["lotus", 1], ["egret", 1]],
  fields: [["grass", 3], ["flowers", 3], ["tree", 2], ["bamboo", 1], ["haystack", 1]],
  terraces: [["rice", 4], ["flowers", 1], ["tree", 1], ["egret", 1]],
  mountains: [["pine", 3], ["peak", 2], ["rock", 2], ["cloud", 2]],
  stairs: [["cloud", 3], ["peak", 2], ["pine", 2], ["rock", 2], ["lantern", 1]],
  chua: [["cloud", 4], ["lantern", 2], ["pine", 1]],
};

/** A drawing a level adds now and then on top of its scene's own, to vary long stretches. */
export const LEVEL_EXTRAS: Readonly<Record<number, readonly [SpriteId, number]>> = {
  1: ["boat", 1],
  4: ["egret", 1],
};

export interface SpritePlacement {
  sprite: SpriteId;
  /** Left edge, as a percentage of the map's width. */
  xPct: number;
  /** Top edge, in px from the top of the level's section. */
  y: number;
  /** Drawn width in px. */
  width: number;
}

/** Small, fast, seeded random numbers (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One drawing per this many px of height, on alternating sides of the path. */
export const SPRITE_SPACING = 64;

/**
 * Where a level's drawings go: down both sides of the path (the middle third is left for it),
 * from the top of the section to its bottom.
 */
export function placeSprites(scene: SceneId, levelIndex: number, height: number): SpritePlacement[] {
  const rand = seededRandom(1000 + levelIndex * 7919);
  const pool = [...SCENE_SPRITES[scene], ...(LEVEL_EXTRAS[levelIndex] ? [LEVEL_EXTRAS[levelIndex]] : [])];
  const total = pool.reduce((n, [, w]) => n + w, 0);
  const pick = () => {
    let r = rand() * total;
    for (const [id, w] of pool) if ((r -= w) < 0) return id;
    return pool[pool.length - 1][0];
  };
  const out: SpritePlacement[] = [];
  for (let y = 10, i = 0; y < height - 30; y += SPRITE_SPACING * (0.7 + rand() * 0.6), i++) {
    const sprite = pick();
    const width = Math.round(SPRITES[sprite].size * (0.8 + rand() * 0.4));
    const left = i % 2 === 0;
    const xPct = left ? 1 + rand() * 26 : 64 + rand() * 26;
    out.push({ sprite, xPct: Math.round(xPct * 10) / 10, y: Math.round(y), width });
  }
  return out;
}
