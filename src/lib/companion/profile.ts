/**
 * What the learner has been through on Home, kept so it never replays: the teachers' intro (done
 * or skipped), the highest level whose level-up was celebrated (Level 5 is Rồng Con's hatching),
 * and the XP total Home last showed, so XP earned elsewhere is shown landing when Home opens.
 * Whether someone is new is only ever these, never worked out from dates, so they follow the
 * learner to any browser or device. `onboarded` only turns on and `levelSeen` only goes up.
 *
 * (The old `hatchSeen` flag is no longer read: XP restarted at 0 with the 100-level system, so
 * every learner hatches Rồng Con again at Level 5.)
 */
import { HATCH_LEVEL } from "./growth";

export interface CompanionProfile {
  onboarded: boolean;
  levelSeen: number;
  /** Null until Home has shown an XP total. */
  seenXp: number | null;
}

export function normalizeProfile(raw: unknown): CompanionProfile {
  const o = (raw ?? {}) as Partial<Record<keyof CompanionProfile, unknown>>;
  const level = typeof o.levelSeen === "number" && Number.isInteger(o.levelSeen) ? Math.max(1, Math.min(100, o.levelSeen)) : 1;
  const seen = typeof o.seenXp === "number" && Number.isFinite(o.seenXp) ? o.seenXp : null;
  return { onboarded: o.onboarded === true, levelSeen: level, seenXp: seen };
}

/** Rồng Con's hatching has been shown (it hatches at Level 5). */
export function hatchSeen(p: CompanionProfile): boolean {
  return p.levelSeen >= HATCH_LEVEL;
}
