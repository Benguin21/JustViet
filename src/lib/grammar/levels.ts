/**
 * The Grammar tab's ten levels, easiest first, and the scene each one climbs through: from a lotus
 * lake at Beginner, through flooded paddies, fields, terraced rice fields and the mountains, up a
 * stone staircase to the chùa at Master. These are the grammar course's levels, separate from the
 * learner's XP level (src/lib/xp/levels.ts), which sets Rồng Con's form.
 */
export type GrammarBand = "Beginner" | "Intermediate" | "Advanced" | "Master";

/** The scenery a level's stretch of the path runs through (and the look of its lesson circles). */
export type SceneId = "lake" | "paddy" | "fields" | "terraces" | "mountains" | "stairs" | "chua";

export interface GrammarLevel {
  id: string;
  /** As written in the curriculum spreadsheet's Difficulty column. */
  name: string;
  band: GrammarBand;
  scene: SceneId;
  /** 0 for Beginner I … 9 for Master. */
  index: number;
}

const LEVELS: readonly Omit<GrammarLevel, "index">[] = [
  { id: "beginner-1", name: "Beginner I", band: "Beginner", scene: "lake" },
  { id: "beginner-2", name: "Beginner II", band: "Beginner", scene: "lake" },
  { id: "beginner-3", name: "Beginner III", band: "Beginner", scene: "paddy" },
  { id: "intermediate-1", name: "Intermediate I", band: "Intermediate", scene: "fields" },
  { id: "intermediate-2", name: "Intermediate II", band: "Intermediate", scene: "fields" },
  { id: "intermediate-3", name: "Intermediate III", band: "Intermediate", scene: "terraces" },
  { id: "advanced-1", name: "Advanced I", band: "Advanced", scene: "terraces" },
  { id: "advanced-2", name: "Advanced II", band: "Advanced", scene: "mountains" },
  { id: "advanced-3", name: "Advanced III", band: "Advanced", scene: "stairs" },
  { id: "master", name: "Master", band: "Master", scene: "chua" },
];

export const GRAMMAR_LEVELS: readonly GrammarLevel[] = LEVELS.map((l, index) => ({ ...l, index }));

const ROMAN: Record<string, string> = { "1": "i", "2": "ii", "3": "iii" };

/**
 * The level a spreadsheet's Difficulty cell names, or null. Case and spacing don't matter, and
 * "Beginner 2" means Beginner II.
 */
export function levelFromName(name: string): GrammarLevel | null {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ ([123])$/, (_, d: string) => ` ${ROMAN[d]}`);
  return GRAMMAR_LEVELS.find((l) => l.name.toLowerCase() === key || l.id === key) ?? null;
}

export function levelById(id: string): GrammarLevel | null {
  return GRAMMAR_LEVELS.find((l) => l.id === id) ?? null;
}
