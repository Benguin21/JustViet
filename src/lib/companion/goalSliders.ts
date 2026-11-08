/**
 * What the Goals tab shows for each goal's slider: its wording, the tier text beside it, and the
 * colour of its selected track. Pure, so the boundaries and the darkening are unit tested; the
 * rules themselves (ranges, tiers, bonuses) are goals.ts's.
 *
 * The selected track darkens with difficulty: a light pastel for a Vocab Starter target, light
 * red for Small, a fuller red for Medium and a deep red for Big, blended smoothly between those
 * anchors so every step to the right is a little darker. The unselected part stays a pale cream.
 */
import { TARGET_LIMITS, goalTier, type GoalId, type GoalSettings, type GoalTier, type PerGoal } from "./goals";

/** The Goals tab lists the goals in this order. */
export const GOALS_TAB_ORDER: readonly GoalId[] = ["grammar", "vocab", "skills"];

export interface SliderCopy {
  title: string;
  /** What one unit of the target is, singular and plural. */
  one: string;
  many: string;
  /** What counts toward the goal. */
  hint: string;
}

export const SLIDER_COPY: PerGoal<SliderCopy> = {
  grammar: { title: "Grammar", one: "lesson", many: "lessons", hint: "New lessons and reviews both count." },
  vocab: {
    title: "Vocab",
    one: "new flashcard",
    many: "new flashcards",
    hint: "Counts cards you study for the first time.",
  },
  skills: { title: "Skills", one: "activity", many: "activities", hint: "Reading and Listening both count." },
};

/** "2 lessons per day". */
export function targetText(id: GoalId, target: number): string {
  const c = SLIDER_COPY[id];
  return `${target} ${target === 1 ? c.one : c.many} per day`;
}

/** "Small · +10 XP". */
export function tierText(tier: GoalTier): string {
  return `${tier.name} · +${tier.bonus} XP`;
}

/** What a screen reader announces for a slider's value. */
export function sliderValueText(id: GoalId, target: number): string {
  const tier = goalTier(id, target);
  return `${targetText(id, target)}, ${tier.name} goal, ${tier.bonus} bonus XP`;
}

/** The unselected part of every track. */
export const TRACK_EMPTY = "#f3e6da";

const STARTER = "#ffd6cd";
const SMALL = "#ff9c8d"; // --color-red-300
const MEDIUM = "#f15b48"; // --color-red-500
const BIG = "#d8452f"; // --color-red-600
const DEEPEST = "#a83220"; // a shade past --color-red-700, for the top of the range

/** Each tier's colour where that tier starts, then the deepest colour at the top of the range. */
const RAMP: PerGoal<readonly (readonly [number, string])[]> = {
  vocab: [
    [1, STARTER],
    [5, SMALL],
    [10, MEDIUM],
    [15, BIG],
    [50, DEEPEST],
  ],
  grammar: [
    [1, SMALL],
    [2, MEDIUM],
    [3, BIG],
    [5, DEEPEST],
  ],
  skills: [
    [1, SMALL],
    [2, MEDIUM],
    [3, BIG],
    [5, DEEPEST],
  ],
};

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: Rgb): string {
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
}

/** The track colour at `value`, blended between the tier anchors around it. */
export function rampColor(id: GoalId, value: number): string {
  const ramp = RAMP[id];
  const v = Math.max(ramp[0][0], Math.min(ramp[ramp.length - 1][0], value));
  for (let i = 1; i < ramp.length; i++) {
    const [b, cb] = ramp[i];
    if (v > b) continue;
    const [a, ca] = ramp[i - 1];
    const t = b === a ? 1 : (v - a) / (b - a);
    const x = rgb(ca);
    const y = rgb(cb);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  return ramp[ramp.length - 1][1];
}

/** How far along the range `value` is, from 0 at the minimum to 1 at the maximum. */
export function sliderFraction(id: GoalId, value: number): number {
  const { min, max } = TARGET_LIMITS[id];
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Where `value` sits on a track whose thumb is `thumb` px wide, as a CSS length. */
function at(id: GoalId, value: number, thumb: number): string {
  const f = sliderFraction(id, value);
  return `calc(${thumb / 2}px + (100% - ${thumb}px) * ${+f.toFixed(4)})`;
}

/**
 * The track's background: the whole difficulty ramp laid along the track, with the part past
 * the thumb covered by the pale unselected colour. So the selected part shows every shade from
 * the easiest target up to the chosen one.
 */
export function trackBackground(id: GoalId, value: number, thumb = 28): string {
  const stops = RAMP[id].map(([v, c]) => `${c} ${at(id, v, thumb)}`).join(", ");
  const edge = at(id, value, thumb);
  return `linear-gradient(to right, transparent ${edge}, ${TRACK_EMPTY} ${edge}), linear-gradient(to right, ${stops})`;
}

/** Relative luminance (WCAG), for checking that the track darkens. */
export function luminance(color: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(color);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * What to tell the learner after saving `next` over `prev`, one line per goal that changed. A
 * new target for a goal already active today (in `locked`) starts tomorrow; today's stays.
 */
export function describeSave(prev: GoalSettings, next: GoalSettings, locked: Partial<PerGoal<number>>): string[] {
  const lines: string[] = [];
  for (const id of GOALS_TAB_ORDER) {
    const { title } = SLIDER_COPY[id];
    if (prev.enabled[id] !== next.enabled[id]) {
      lines.push(next.enabled[id] ? `${title} is on, so it shows on Home.` : `${title} is off, so Home won’t show it.`);
    }
    const t = next.targets[id];
    if (prev.targets[id] === t) continue;
    const today = locked[id];
    if (today != null && today !== t) {
      lines.push(
        `${title}: ${targetText(id, t)} from tomorrow. Today’s goal is already underway, so it stays at ${today} (${tierText(goalTier(id, today))}).`,
      );
    } else {
      lines.push(`${title}: ${targetText(id, t)}, starting today.`);
    }
  }
  return lines;
}

/** The card's note while a goal's chosen target differs from the one locked for today. */
export function lockNote(id: GoalId, target: number, locked: number | undefined): string | null {
  if (locked == null || locked === target) return null;
  return `Today’s goal is already underway, so today stays at ${targetText(id, locked).replace(" per day", "")} (${tierText(goalTier(id, locked))}). This target starts tomorrow.`;
}
