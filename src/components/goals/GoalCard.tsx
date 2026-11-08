"use client";

import type { CSSProperties } from "react";
import { Switch } from "@/components/ui/Switch";
import { TARGET_LIMITS, goalTier, type GoalId, type TierName } from "@/lib/companion/goals";
import {
  SLIDER_COPY,
  lockNote,
  rampColor,
  sliderValueText,
  tierText,
  trackBackground,
} from "@/lib/companion/goalSliders";
import "./goal-slider.css";

/** The tier label beside each slider: darker with difficulty, and always in words too. */
const TIER_PILL: Record<TierName, string> = {
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
  onEnabledChange: (on: boolean) => void;
  onTargetChange: (target: number) => void;
};

/** One goal on the Goals tab: its on/off switch and a slider for its daily target. */
export function GoalCard({ id, enabled, target, locked, onEnabledChange, onTargetChange }: GoalCardProps) {
  const copy = SLIDER_COPY[id];
  const { min, max } = TARGET_LIMITS[id];
  const tier = goalTier(id, target);
  const note = lockNote(id, target, locked);
  const titleId = `goal-${id}-title`;
  const style = { "--goal-track": trackBackground(id, target), "--goal-thumb": rampColor(id, target) } as CSSProperties;

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-ink-300/30 bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="font-heading text-2xl font-extrabold text-ink-900">
            {copy.title}
          </h2>
          <p className="text-sm font-semibold text-ink-500">{copy.hint}</p>
        </div>
        <Switch
          checked={enabled}
          onChange={onEnabledChange}
          label={enabled ? "On" : "Off"}
          ariaLabel={`Show the ${copy.title} goal on Home`}
        />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-2 text-ink-900" data-testid={`goal-${id}-value`}>
            <span className="font-heading text-5xl leading-none font-extrabold tabular-nums">{target}</span>
            <span className="font-bold text-ink-700">
              {target === 1 ? copy.one : copy.many} per day
            </span>
          </p>
          <span
            className={`rounded-full px-3 py-1 text-sm font-extrabold tracking-wide ${TIER_PILL[tier.name]}`}
            data-testid={`goal-${id}-tier`}
          >
            {tierText(tier)}
          </span>
        </div>

        <input
          type="range"
          className="jv-goal-slider mt-2"
          min={min}
          max={max}
          step={1}
          value={target}
          onChange={(e) => onTargetChange(Math.round(Number(e.target.value)))}
          aria-labelledby={titleId}
          aria-valuetext={sliderValueText(id, target)}
          style={style}
        />
        <div className="mt-1.5 flex justify-between px-1 text-xs font-bold text-ink-500" aria-hidden="true">
          <span>{min}</span>
          <span>{max}</span>
        </div>

        {!enabled && <p className="mt-2 text-sm font-semibold text-ink-500">Off: Home won’t show this goal.</p>}
        {note && (
          <p className="mt-3 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700 ring-1 ring-yellow-200">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
