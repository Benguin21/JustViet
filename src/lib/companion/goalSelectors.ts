/**
 * What the Goals tab shows for each goal's selector: the five targets it offers, its wording, the
 * badge text beside it, and the colour of each block. Pure, so the choices, the snapping of old
 * targets and the darkening are unit tested; the rules themselves (ranges, tiers, bonuses) are
 * goals.ts's.
 *
 * The five choices are only what this page offers. TARGET_LIMITS (Vocab 1 to 50) stays as it is,
 * because it also reads back each day's locked target, and a target locked under the old slider
 * (say Vocab 3 or 30) must read back exactly or claiming its bonus on Home fails.
 *
 * Filled blocks darken with difficulty: each block takes the colour of the tier its value stands
 * for, a light red for Small, a fuller red for Medium and a deep red for Big, so the bar gets
 * darker toward the right. Empty blocks stay a pale cream.
 */
import { goalTier, type GoalId, type GoalSettings, type GoalTier, type PerGoal } from "./goals";

/** The Goals tab lists the goals in this order. */
export const GOALS_TAB_ORDER: readonly GoalId[] = ["grammar", "vocab", "skills"];

/** The five targets each goal's selector offers, one per block, easiest first. */
export const TARGET_CHOICES: PerGoal<readonly number[]> = {
  grammar: [1, 2, 3, 4, 5],
  vocab: [5, 10, 15, 20, 25],
  skills: [1, 2, 3, 4, 5],
};

export interface GoalCopy {
  title: string;
  /** What one unit of the target is, singular and plural. */
  one: string;
  many: string;
}

export const GOAL_COPY: PerGoal<GoalCopy> = {
  grammar: { title: "Grammar", one: "lesson", many: "lessons" },
  vocab: { title: "Vocab", one: "new flashcard", many: "new flashcards" },
  skills: { title: "Skills", one: "activity", many: "activities" },
};

/**
 * The choice to show for a saved target: the nearest of the goal's five (Vocab 1 to 7 → 5,
 * 8 to 12 → 10 … 23 and up → 25). Saved targets are whole numbers, so there's never a tie.
 */
export function snapTarget(id: GoalId, target: number): number {
  const choices = TARGET_CHOICES[id];
  let best = choices[0];
  for (const c of choices) if (Math.abs(c - target) < Math.abs(best - target)) best = c;
  return best;
}

/**
 * The form the Goals tab starts from: a goal that's on shows its saved target snapped to a
 * choice; a goal that's off keeps its saved target untouched (Off keeps the last target). Only
 * Save writes anything, so a snapped target reaches the learner's goals only when they save.
 */
export function formFromSaved(saved: GoalSettings): GoalSettings {
  const targets = { ...saved.targets };
  for (const id of GOALS_TAB_ORDER) if (saved.enabled[id]) targets[id] = snapTarget(id, saved.targets[id]);
  return { enabled: { ...saved.enabled }, targets };
}

/**
 * The card's note while the form still shows a snapped target: the goal was saved as on with a
 * target the selector doesn't offer, and the learner hasn't picked another or saved yet.
 */
export function snapNote(id: GoalId, saved: GoalSettings, form: GoalSettings): string | null {
  if (!saved.enabled[id] || !form.enabled[id]) return null;
  const t = saved.targets[id];
  const shown = snapTarget(id, t);
  if (shown === t || form.targets[id] !== shown) return null;
  const unit = (n: number) => targetText(id, n).replace(" per day", "");
  return `Your saved goal is ${unit(t)} a day, which isn’t one of the choices any more. Save goals to switch to ${unit(shown)}.`;
}

/** "2 lessons per day". */
export function targetText(id: GoalId, target: number): string {
  const c = GOAL_COPY[id];
  return `${target} ${target === 1 ? c.one : c.many} per day`;
}

/** The badge for a goal that's off. */
export const OFF_TEXT = "Goal off · 0 XP";

/** "Small goal · +10 XP". */
export function tierText(tier: GoalTier): string {
  return `${tier.name} goal · +${tier.bonus} XP`;
}

/** What a screen reader announces for one of the selector's targets. */
export function choiceLabel(id: GoalId, target: number): string {
  const tier = goalTier(id, target);
  return `${targetText(id, target)}, ${tier.name} goal, ${tier.bonus} bonus XP`;
}

/** What a screen reader announces for the selector's 0 option, which switches the goal off. */
export function offLabel(id: GoalId): string {
  return `${targetText(id, 0)}, goal off`;
}

/** The pale cream of an empty block. */
export const BLOCK_EMPTY = "#f3e6da";

const STARTER = "#ffd6cd";
const SMALL = "#ff9c8d"; // --color-red-300
const MEDIUM = "#f15b48"; // --color-red-500
const BIG = "#d8452f"; // --color-red-600
const DEEPEST = "#a83220"; // a shade past --color-red-700, for the top choice

/** Each tier's colour where that tier starts, then the deepest colour at the top choice. */
const RAMP: PerGoal<readonly (readonly [number, string])[]> = {
  vocab: [
    [1, STARTER],
    [5, SMALL],
    [10, MEDIUM],
    [15, BIG],
    [25, DEEPEST],
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

/** The colour for `value`, blended between the tier anchors around it. */
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

/** The number inside a block: dark on the pale fills, white on the deep reds, for contrast. */
export function blockTextColor(fill: string): string {
  return luminance(fill) > 0.25 ? "#4a2f22" : "#ffffff"; // --color-ink-900 or white
}

/** Relative luminance (WCAG), for checking that the blocks darken. */
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
    const { title } = GOAL_COPY[id];
    if (prev.enabled[id] !== next.enabled[id]) {
      lines.push(next.enabled[id] ? `${title} is on, so it shows on Home.` : `${title} is off, so Home won’t show it.`);
    }
    // Off keeps the last target, so there's no new target to tell them about.
    if (!next.enabled[id]) continue;
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

/**
 * The card's note while a goal's chosen target differs from the one locked for today. None while
 * the goal is off: switching a goal off takes effect on Home straight away.
 */
export function lockNote(id: GoalId, enabled: boolean, target: number, locked: number | undefined): string | null {
  if (!enabled || locked == null || locked === target) return null;
  return `Today’s goal is already underway, so today stays at ${targetText(id, locked).replace(" per day", "")} (${tierText(goalTier(id, locked))}). This target starts tomorrow.`;
}
