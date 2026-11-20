"use client";

import { goalTier, type GoalId, type TierName } from "@/lib/companion/goals";
import { GOAL_COPY, OFF_TEXT, lockNote, tierText } from "@/lib/companion/goalSelectors";
import { GoalSelector } from "./GoalSelector";

/** The badge beside each target: darker with difficulty, and always in words too. */
const TIER_PILL: Record<TierName | "Off", string> = {
  Off: "bg-surface text-ink-500 ring-1 ring-ink-300/60",
  Starter: "bg-yellow-50 text-ink-700 ring-1 ring-ink-300/50",
  Small: "bg-red-50 text-red-700 ring-1 ring-red-200",
  Medium: "bg-red-100 text-red-700 ring-1 ring-red-300",
  Big: "bg-red-700 text-white ring-1 ring-red-700",
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

/** One goal on the Goals tab: its target, its bonus badge and its Off-plus-five-blocks selector. */
export function GoalCard({ id, enabled, target, locked, snapped, onOff, onPick }: GoalCardProps) {
  const copy = GOAL_COPY[id];
  const tier = goalTier(id, target);
  const note = lockNote(id, enabled, target, locked);
  const titleId = `goal-${id}-title`;

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-ink-300/30 bg-surface p-5 sm:p-6">
      <div>
        <h2 id={titleId} className="font-heading text-2xl font-extrabold text-ink-900">
          {copy.title}
        </h2>
        <p className="text-sm font-semibold text-ink-500">{copy.hint}</p>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-2 text-ink-900" data-testid={`goal-${id}-value`}>
            {enabled ? (
              <>
                <span className="font-heading text-5xl leading-none font-extrabold tabular-nums">{target}</span>
                <span className="font-bold text-ink-700">{target === 1 ? copy.one : copy.many} per day</span>
              </>
            ) : (
              <span className="font-heading text-5xl leading-none font-extrabold text-ink-500">Off</span>
            )}
          </p>
          <span
            className={`rounded-full px-3 py-1 text-sm font-extrabold tracking-wide ${TIER_PILL[enabled ? tier.name : "Off"]}`}
            data-testid={`goal-${id}-tier`}
          >
            {enabled ? tierText(tier) : OFF_TEXT}
          </span>
        </div>

        <GoalSelector id={id} enabled={enabled} target={target} labelledBy={titleId} onOff={onOff} onPick={onPick} />

        {!enabled && <p className="mt-2 text-sm font-semibold text-ink-500">Off: Home won’t show this goal.</p>}
        {enabled && snapped && (
          <p className="mt-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700 ring-1 ring-yellow-200">
            {snapped}
          </p>
        )}
        {note && (
          <p className="mt-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700 ring-1 ring-yellow-200">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
