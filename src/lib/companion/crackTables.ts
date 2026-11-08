// Generated from the HomeDraft prototype by the egg-cracks generator
// (/mnt/project-files/justviet-design/tools/egg-cracks-gen.py). Each crack piece starts at
// 'from' XP and is fully drawn by 'to'; 'late' pieces belong to the almost-hatched zip line.
// Chips, flakes, lifts and crumbs each show from 'at' XP. Don't edit by hand.

export interface CrackPiece { id: string; from: number; to: number; late?: boolean }
export interface ShellBit { id: string; at: number }

export const CRACKS: readonly CrackPiece[] = [
  { id: "r2a", from: 20, to: 30 },
  { id: "r2b", from: 30, to: 39 },
  { id: "r2c", from: 39, to: 48 },
  { id: "r5a", from: 22, to: 32 },
  { id: "r5b", from: 32, to: 44 },
  { id: "r3a", from: 30, to: 41 },
  { id: "r3b", from: 41, to: 54 },
  { id: "r1a", from: 34, to: 45 },
  { id: "r1b", from: 45, to: 51 },
  { id: "r1c", from: 51, to: 62 },
  { id: "r4a", from: 38, to: 47 },
  { id: "r4b", from: 47, to: 55 },
  { id: "r4c", from: 55, to: 64 },
  { id: "b1", from: 58, to: 74 },
  { id: "b2", from: 56, to: 70 },
  { id: "b3", from: 62, to: 78 },
  { id: "b4", from: 64, to: 80 },
  { id: "t1a", from: 48, to: 73 },
  { id: "t1b", from: 73, to: 80 },
  { id: "l3a", from: 44, to: 70 },
  { id: "l3b", from: 70, to: 92 },
  { id: "u1", from: 54, to: 76 },
  { id: "t2a", from: 62, to: 86 },
  { id: "t2b", from: 86, to: 92 },
  { id: "l4a", from: 64, to: 83 },
  { id: "l4b", from: 83, to: 100 },
  { id: "l5a", from: 74, to: 94 },
  { id: "l5b", from: 94, to: 104 },
  { id: "l6a", from: 80, to: 103 },
  { id: "l6b", from: 103, to: 108 },
  { id: "t2b", from: 84, to: 98 },
  { id: "s2c", from: 92, to: 104 },
  { id: "s2aa", from: 88, to: 97 },
  { id: "s2ab", from: 97, to: 108 },
  { id: "s3a", from: 96, to: 110 },
  { id: "s2ba", from: 90, to: 104 },
  { id: "s2bb", from: 104, to: 112 },
  { id: "s3b", from: 98, to: 112 },
  { id: "zla", from: 175, to: 212, late: true },
  { id: "zlb", from: 212, to: 240, late: true },
  { id: "zra", from: 186, to: 210, late: true },
  { id: "zrb", from: 210, to: 234, late: true },
  { id: "h1", from: 194, to: 203, late: true },
  { id: "h2", from: 209, to: 218, late: true },
  { id: "h3", from: 222, to: 231, late: true },
  { id: "h4", from: 212, to: 221, late: true },
  { id: "h5", from: 220, to: 229, late: true },
  { id: "h6", from: 232, to: 241, late: true },
  { id: "fa", from: 192, to: 200, late: true },
  { id: "fb", from: 216, to: 225, late: true }
];

export const CHIPS: readonly ShellBit[] = [
  { id: "p0", at: 20 },
  { id: "p1", at: 40 },
  { id: "p2", at: 60 },
  { id: "d2", at: 88 },
  { id: "d3", at: 96 },
  { id: "zl0", at: 183 },
  { id: "zl1", at: 190 },
  { id: "zl2", at: 202 },
  { id: "zl3", at: 211 },
  { id: "zl4", at: 219 },
  { id: "zl5", at: 228 },
  { id: "zl6", at: 237 },
  { id: "zr0", at: 198 },
  { id: "zr1", at: 205 },
  { id: "zr2", at: 215 },
  { id: "zr3", at: 226 }
];

export const FLAKES: readonly ShellBit[] = [
  { id: "f0", at: 150 },
  { id: "f1", at: 174 },
  { id: "f2", at: 184 },
  { id: "f3", at: 192 },
  { id: "f4", at: 198 },
  { id: "f5", at: 204 },
  { id: "f6", at: 209 },
  { id: "f7", at: 214 },
  { id: "f8", at: 218 },
  { id: "f9", at: 222 },
  { id: "f10", at: 226 },
  { id: "f11", at: 230 },
  { id: "f12", at: 233 },
  { id: "f13", at: 237 },
  { id: "f14", at: 240 },
  { id: "f15", at: 243 },
  { id: "f16", at: 246 },
  { id: "f17", at: 249 }
];

export const LIFTS: readonly ShellBit[] = [
  { id: "u0", at: 233 },
  { id: "u1", at: 240 },
  { id: "u2", at: 246 }
];

export const CRUMBS: readonly ShellBit[] = [
  { id: "c0", at: 205 },
  { id: "c1", at: 218 },
  { id: "c2", at: 230 },
  { id: "c3", at: 240 },
  { id: "c4", at: 247 }
];
