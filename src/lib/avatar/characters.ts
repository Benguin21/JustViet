/**
 * The learner's avatar: a character and its current form. For now every learner has Rồng Con,
 * whose form follows their XP level (src/lib/companion/growth.ts: an egg until Level 5, then a
 * new evolution every 10 levels). More characters, each with its own forms, are planned; a
 * character only needs its forms listed here and art in src/components/avatar/AvatarFigure.tsx,
 * and the learner's choice will be saved with their profile.
 *
 * Anything that shows "the learner" outside Home (the Grammar map, later the Skills map) should go
 * through `avatarFor`, never ask Rồng Con's growth directly.
 */
import { evolutionFor, hatchFor, type HatchState } from "@/lib/companion/growth";
import { levelFor } from "@/lib/xp/levels";

export type CharacterId = "rong-con";

export interface AvatarCharacter {
  id: CharacterId;
  name: string;
}

export const CHARACTERS: Record<CharacterId, AvatarCharacter> = {
  "rong-con": { id: "rong-con", name: "Rồng Con" },
};

export const DEFAULT_CHARACTER: CharacterId = "rong-con";

export interface Avatar {
  character: CharacterId;
  /** The form's index: for Rồng Con 0 is the egg, 1 hatched (Level 5), 2 at Level 10, … */
  form: number;
  /** The form's name ("Hatching", "Baby Dragon" …). */
  formName: string;
  /** The XP level it was worked out from. */
  level: number;
  /** Rồng Con only: how far the egg is from hatching, for small cues on the egg. */
  hatch: HatchState;
  /** Rồng Con only: stands clear of its shell (Level 10+). */
  fullBody: boolean;
}

export function avatarFor(xp: number, character: CharacterId = DEFAULT_CHARACTER): Avatar {
  const level = levelFor(xp);
  const evo = evolutionFor(level);
  return {
    character,
    form: evo.index,
    formName: evo.name,
    level,
    hatch: hatchFor(xp).state,
    fullBody: evo.fullBody,
  };
}
