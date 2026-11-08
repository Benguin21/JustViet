/**
 * JustViet's 100 levels: the total XP each one starts at, and where a learner stands.
 *
 * The thresholds are cumulative (Level 6 starts at 952 XP in total, not 952 XP more). They come
 * from JustViet_XP_Levels_1_to_100.xlsx, which interpolates linearly between these benchmark
 * levels: 1 → 0, 5 → 700, 10 → 1,960, 20 → 4,200, 30 → 8,400, 40 → 16,800, 50 → 25,200,
 * 60 → 37,800, 70 → 56,000, 80 → 84,000, 90 → 168,000, 100 → 252,000 (every step lands on a
 * whole number). levels.test.ts checks the table against those benchmarks.
 *
 * Rồng Con grows with the level (see growth.ts): it hatches at Level 5 and evolves every 10 levels.
 */
export const MAX_LEVEL = 100;

export const LEVEL_BENCHMARKS: readonly (readonly [level: number, xp: number])[] = [
  [1, 0], [5, 700], [10, 1960], [20, 4200], [30, 8400], [40, 16800], [50, 25200],
  [60, 37800], [70, 56000], [80, 84000], [90, 168000], [100, 252000],
];

/** LEVEL_XP[n - 1] is the total XP Level n starts at. */
export const LEVEL_XP: readonly number[] = [
  0, 175, 350, 525, 700, 952, 1204, 1456, 1708, 1960,
  2184, 2408, 2632, 2856, 3080, 3304, 3528, 3752, 3976, 4200,
  4620, 5040, 5460, 5880, 6300, 6720, 7140, 7560, 7980, 8400,
  9240, 10080, 10920, 11760, 12600, 13440, 14280, 15120, 15960, 16800,
  17640, 18480, 19320, 20160, 21000, 21840, 22680, 23520, 24360, 25200,
  26460, 27720, 28980, 30240, 31500, 32760, 34020, 35280, 36540, 37800,
  39620, 41440, 43260, 45080, 46900, 48720, 50540, 52360, 54180, 56000,
  58800, 61600, 64400, 67200, 70000, 72800, 75600, 78400, 81200, 84000,
  92400, 100800, 109200, 117600, 126000, 134400, 142800, 151200, 159600, 168000,
  176400, 184800, 193200, 201600, 210000, 218400, 226800, 235200, 243600, 252000,
];

/** The total XP a level starts at (Level 1 = 0). */
export function levelThreshold(level: number): number {
  const n = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return LEVEL_XP[n - 1];
}

/** The highest level whose threshold is at or below this much XP (1..100). */
export function levelFor(xp: number): number {
  const total = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let lo = 0;
  let hi = LEVEL_XP.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (LEVEL_XP[mid] <= total) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export interface LevelProgress {
  level: number;
  xp: number;
  /** The current level's threshold and the next one's (null at Level 100). */
  from: number;
  to: number | null;
  /** XP still needed for the next level (0 at Level 100). */
  toNext: number;
  /** How far through the current level, 0..1 (1 at Level 100). */
  fraction: number;
  isMax: boolean;
}

/** Where a learner with this much total XP stands. XP past Level 100 still counts, the level stays 100. */
export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.round(Number.isFinite(xp) ? xp : 0));
  const level = levelFor(total);
  const from = levelThreshold(level);
  if (level >= MAX_LEVEL) return { level, xp: total, from, to: null, toNext: 0, fraction: 1, isMax: true };
  const to = levelThreshold(level + 1);
  return { level, xp: total, from, to, toNext: to - total, fraction: (total - from) / (to - from), isMax: false };
}
