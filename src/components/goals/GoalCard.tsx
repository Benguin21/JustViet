"use client";

import { goalTier, type GoalId, type TierName } from "@/lib/companion/goals";
import { GOAL_COPY, lockNote, targetText, tierBadge } from "@/lib/companion/goalSelectors";
import { GoalSelector } from "./GoalSelector";

/**
 * The badge beside each target: gold for bonus XP (rewards are gold, like coins and stars), deeper
 * for bigger bonuses, and always in words too. Starter earns nothing, so it's neutral like Off.
 */
const TIER_PILL: Record<TierName | "Off", string> = {
  Off: "bg-surface text-ink-500 ring-1 ring-ink-300/60",
  Starter: "bg-surface text-ink-500 ring-1 ring-ink-300/60",
  Small: "bg-yellow-100 text-ink-900 ring-1 ring-yellow-300",
  Medium: "bg-yellow-300 text-ink-900 ring-1 ring-yellow-500",
  Big: "bg-yellow-400 text-ink-900 ring-1 ring-yellow-600",
};

type GoalCardProps = {
  id: GoalId;
  enabled: boolean;
  target: number;
  /** Today's target when this goal is already active today (it then stays until tomorrow). */
  locked?: number;
  /** A note when the saved target isn't one of the selector's choices (snapNote). */
  snapped?: string | null;
  onOff: () => void;
  onPick: (target: number) => void;
};

/**
 * One goal on the Goals tab, kept compact so all three fit on one screen: its title and bonus
 * badge, the target in words, and its 0-plus-five-blocks selector.
 */
export function GoalCard({ id, enabled, target, locked, snapped, onOff, onPick }: GoalCardProps) {
  const copy = GOAL_COPY[id];
  const tier = goalTier(id, target);
  const note = lockNote(id, enabled, target, locked);
  const titleId = `goal-${id}-title`;
  const shown = enabled ? target : 0;
  const [badgeLabel, badgeXp] = tierBadge(enabled ? tier : null);

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-ink-300/30 bg-surface px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-heading text-xl leading-7 font-extrabold text-ink-900">
          {copy.title}
        </h2>
        <span
          className={`inline-flex shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-5 font-extrabold tracking-wide ${TIER_PILL[enabled ? tier.name : "Off"]}`}
          data-testid={`goal-${id}-tier`}
        >
          <span>{badgeLabel}</span> <span>{badgeXp}</span>
        </span>
      </div>
      <p className="mt-0.5 text-sm leading-5 font-extrabold text-ink-900" data-testid={`goal-${id}-value`}>
        {targetText(id, shown)}
      </p>

      <GoalSelector id={id} enabled={enabled} target={target} labelledBy={titleId} onOff={onOff} onPick={onPick} />

      {enabled && snapped && (
        <p className="mt-2.5 rounded-xl bg-yellow-50 px-3 py-2 text-xs leading-4 font-semibold text-ink-700 ring-1 ring-yellow-200">
          {snapped}
        </p>
      )}
      {note && (
        <p className="mt-2.5 rounded-xl bg-yellow-50 px-3 py-2 text-xs leading-4 font-semibold text-ink-700 ring-1 ring-yellow-200">
          {note}
        </p>
      )}
    </section>
  );
}
