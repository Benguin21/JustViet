"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { GoalId } from "@/lib/companion/goals";
import { BLOCK_EMPTY, TARGET_CHOICES, choiceLabel, offLabel, rampColor } from "@/lib/companion/goalSelectors";
import "./goal-selector.css";

type GoalSelectorProps = {
  id: GoalId;
  enabled: boolean;
  target: number;
  /** The id of the card's heading, which names the group. */
  labelledBy: string;
  onOff: () => void;
  onPick: (target: number) => void;
};

/**
 * A goal's target picker: an Off button, then five blocks like a game's volume bar. Picking a block
 * fills it and every block before it. It's one radio group of six options (Off plus the five
 * targets): one Tab stop, and the arrow keys (or Home/End) move the selection, as radios do. The
 * blocks are never disabled; picking one while the goal is off turns it back on.
 */
export function GoalSelector({ id, enabled, target, labelledBy, onOff, onPick }: GoalSelectorProps) {
  const choices = TARGET_CHOICES[id];
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  // 0 is Off, 1 to 5 the blocks. A goal that's on always holds one of its choices (formFromSaved).
  const selected = enabled ? Math.max(1, choices.indexOf(target) + 1) : 0;

  const choose = (i: number) => {
    if (i === 0) onOff();
    else onPick(choices[i - 1]);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowDown: selected + 1,
      ArrowLeft: selected - 1,
      ArrowUp: selected - 1,
      Home: 0,
      End: choices.length,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(choices.length, keys[e.key]));
    choose(next);
    options.current[next]?.focus();
  };

  return (
    <div className="jv-goal-picker mt-3" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      <div className="jv-goal-tray">
        <button
          ref={(el) => {
            options.current[0] = el;
          }}
          type="button"
          role="radio"
          aria-checked={!enabled}
          aria-label={offLabel(id)}
          tabIndex={selected === 0 ? 0 : -1}
          onClick={() => choose(0)}
          className="jv-goal-off"
          data-testid={`goal-${id}-off`}
        >
          Off
        </button>
        {choices.map((value, i) => {
          const filled = i + 1 <= selected;
          return (
            <button
              key={value}
              ref={(el) => {
                options.current[i + 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected === i + 1}
              aria-label={choiceLabel(id, value)}
              tabIndex={selected === i + 1 ? 0 : -1}
              onClick={() => choose(i + 1)}
              className="jv-goal-block"
              data-filled={filled || undefined}
              data-testid={`goal-${id}-block-${value}`}
              style={{ "--goal-block": filled ? rampColor(id, value) : BLOCK_EMPTY } as CSSProperties}
            />
          );
        })}
      </div>
      <div className="jv-goal-scale" aria-hidden="true">
        <span />
        {choices.map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    </div>
  );
}
