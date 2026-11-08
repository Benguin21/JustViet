"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TIER_BONUS, type GoalId, type GoalSettings, type PerGoal } from "@/lib/companion/goals";
import { GOALS_TAB_ORDER, describeSave } from "@/lib/companion/goalSliders";
import { GoalCard } from "./GoalCard";

type GoalsFormProps = {
  saved: GoalSettings;
  /** Today's targets for goals already active today. */
  locked: Partial<PerGoal<number>>;
  /** Saves the goals; resolves once saved, with today's locks as they are now. Never awards XP. */
  onSave: (settings: GoalSettings) => Promise<{ locked: Partial<PerGoal<number>> }>;
};

function same(a: GoalSettings, b: GoalSettings): boolean {
  return GOALS_TAB_ORDER.every((id) => a.enabled[id] === b.enabled[id] && a.targets[id] === b.targets[id]);
}

/**
 * The Goals tab: a card per goal with its switch and target slider, and one Save action. Moving
 * a slider only changes this form; nothing reaches the learner's goals, or their XP, until Save.
 */
export function GoalsForm({ saved, locked, onSave }: GoalsFormProps) {
  const [form, setForm] = useState<GoalSettings>(saved);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ lines: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = !same(form, saved);

  const edit = (change: (f: GoalSettings) => GoalSettings) => {
    setForm(change);
    setResult(null);
    setError(null);
  };
  const setEnabled = (id: GoalId, on: boolean) => edit((f) => ({ ...f, enabled: { ...f.enabled, [id]: on } }));
  const setTarget = (id: GoalId, n: number) => edit((f) => ({ ...f, targets: { ...f.targets, [id]: n } }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = form;
      const after = await onSave(next);
      setResult({ lines: describeSave(saved, next, after.locked) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your goals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">Daily goals</h1>
        <p className="mt-1 font-semibold text-ink-500">
          Choose how much to do each day. Reach a goal, then feed Rồng Con on Home for its bonus XP.
        </p>
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-ink-700">
          A goal’s bonus comes from the target you pick: Small +{TIER_BONUS.Small}, Medium +{TIER_BONUS.Medium}, Big +
          {TIER_BONUS.Big} XP. Doing more than your target still earns XP for each lesson, card or activity, but not a
          bigger bonus.
        </p>
      </header>

      {GOALS_TAB_ORDER.map((id) => (
        <GoalCard
          key={id}
          id={id}
          enabled={form.enabled[id]}
          target={form.targets[id]}
          locked={locked[id]}
          onEnabledChange={(on) => setEnabled(id, on)}
          onTargetChange={(n) => setTarget(id, n)}
        />
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={save} loading={saving} disabled={!dirty} fullWidth={false} className="w-full sm:w-auto">
          Save goals
        </Button>
        <p className="text-sm font-semibold text-ink-500" aria-live="polite">
          {dirty ? "You have unsaved changes." : result ? "Goals saved." : ""}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      {result && result.lines.length > 0 && (
        <ul role="status" className="flex flex-col gap-1 rounded-2xl bg-surface p-4 text-sm font-semibold text-ink-700 ring-1 ring-ink-300/30">
          {result.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
