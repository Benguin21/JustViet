"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { GoalId, GoalSettings, PerGoal } from "@/lib/companion/goals";
import { GOALS_TAB_ORDER, formFromSaved, snapNote } from "@/lib/companion/goalSelectors";
import { GoalCard } from "./GoalCard";

type GoalsFormProps = {
  saved: GoalSettings;
  /** Today's targets for goals already active today. */
  locked: Partial<PerGoal<number>>;
  /** Saves the goals; resolves once saved. Never awards XP. */
  onSave: (settings: GoalSettings) => Promise<unknown>;
};

function same(a: GoalSettings, b: GoalSettings): boolean {
  return GOALS_TAB_ORDER.every((id) => a.enabled[id] === b.enabled[id] && a.targets[id] === b.targets[id]);
}

/**
 * The Goals tab: a card per goal with its Off-plus-five-blocks selector, and one Save action.
 * Picking only changes this form; nothing reaches the learner's goals, or their XP, until Save.
 * Off saves the goal as off and keeps its last target; a block saves it as on with that target.
 * The form starts from the saved goals with any target the selector doesn't offer snapped to a
 * choice (formFromSaved), so such a goal shows as an unsaved change until the learner saves.
 */
export function GoalsForm({ saved, locked, onSave }: GoalsFormProps) {
  const [form, setForm] = useState<GoalSettings>(() => formFromSaved(saved));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !same(form, saved);

  const edit = (change: (f: GoalSettings) => GoalSettings) => {
    setForm(change);
    setJustSaved(false);
    setError(null);
  };
  const setOff = (id: GoalId) => edit((f) => ({ ...f, enabled: { ...f.enabled, [id]: false } }));
  const pick = (id: GoalId, n: number) =>
    edit((f) => ({ enabled: { ...f.enabled, [id]: true }, targets: { ...f.targets, [id]: n } }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your goals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-4 py-3 sm:gap-3 sm:px-6 sm:py-5">
      <header>
        <h1 className="font-heading text-2xl leading-8 font-extrabold text-ink-900 sm:text-3xl sm:leading-9">Daily goals</h1>
        <p className="text-sm leading-5 font-semibold text-ink-500 sm:text-base sm:leading-6">
          Set your daily goals here. Each time you complete one, you can feed Rồng Con and earn bonus XP.
        </p>
      </header>

      {GOALS_TAB_ORDER.map((id) => (
        <GoalCard
          key={id}
          id={id}
          enabled={form.enabled[id]}
          target={form.targets[id]}
          locked={locked[id]}
          snapped={snapNote(id, saved, form)}
          onOff={() => setOff(id)}
          onPick={(n) => pick(id, n)}
        />
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} disabled={!dirty} fullWidth={false} className="shrink-0">
          Save goals
        </Button>
        <p className="text-sm font-semibold text-ink-500" aria-live="polite">
          {dirty ? "You have unsaved changes." : justSaved ? "Goals saved." : ""}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
