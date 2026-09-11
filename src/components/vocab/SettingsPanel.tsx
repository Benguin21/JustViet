"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatSteps, parseSteps, validateSrsSettings } from "@/lib/vocab/settings";
import type { SrsSettings } from "@/lib/vocab/types";

type SettingsPanelProps = {
  settings: SrsSettings;
  onSave: (settings: SrsSettings) => Promise<void>;
  onRescheduleAll: () => Promise<number>;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-300/20 bg-surface p-5">
      <h3 className="font-heading text-lg font-extrabold text-ink-900">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-sm font-bold tracking-wide text-ink-700 uppercase">{label}</span>
        <Tooltip text={hint} />
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, onSave, onRescheduleAll }: SettingsPanelProps) {
  const [form, setForm] = useState<SrsSettings>(settings);
  const [errors, setErrors] = useState<ReturnType<typeof validateSrsSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmingReschedule, setConfirmingReschedule] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  function set<K extends keyof SrsSettings>(key: K, value: SrsSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
  }

  async function handleSave() {
    const nextErrors = validateSrsSettings(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      await onSave(form);
      setSaveMessage("Settings saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    setRescheduling(true);
    try {
      const count = await onRescheduleAll();
      setSaveMessage(
        count > 0
          ? `Rescheduled ${count} card${count === 1 ? "" : "s"}.`
          : "No cards needed rescheduling.",
      );
      setConfirmingReschedule(false);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setRescheduling(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Daily Limits" description="How many cards show up in a session each day.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Max new cards/day" hint="The most brand-new cards that will be introduced in a single day.">
            <TextField
              type="number"
              min={0}
              value={form.maxNewPerDay}
              onChange={(e) => set("maxNewPerDay", Number(e.target.value))}
              error={errors.maxNewPerDay}
            />
          </Field>
          <Field label="Max reviews/day" hint="The most already-scheduled cards that will come up for review in a single day.">
            <TextField
              type="number"
              min={0}
              value={form.maxReviewsPerDay}
              onChange={(e) => set("maxReviewsPerDay", Number(e.target.value))}
              error={errors.maxReviewsPerDay}
            />
          </Field>
          <Field label="Max cards/session" hint="The most cards shown in one Study session, regardless of how many are due.">
            <TextField
              type="number"
              min={1}
              value={form.maxCardsPerSession}
              onChange={(e) => set("maxCardsPerSession", Number(e.target.value))}
              error={errors.maxCardsPerSession}
            />
          </Field>
        </div>
      </Section>

      <Section title="New Card Settings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Initial learning steps" hint='How long to wait before showing a new card again after each rating, e.g. "1m 10m" means 1 minute, then 10 minutes, before it graduates.'>
            <TextField
              value={formatSteps(form.learningSteps)}
              onChange={(e) => set("learningSteps", parseSteps(e.target.value))}
              error={errors.learningSteps}
              placeholder="1m 10m"
            />
          </Field>
          <Field label="New card order" hint="Whether new cards are introduced in the order you added them, or shuffled.">
            <Select
              value={form.newCardOrder}
              onChange={(e) => set("newCardOrder", e.target.value as SrsSettings["newCardOrder"])}
            >
              <option value="added">Order added</option>
              <option value="random">Random</option>
            </Select>
          </Field>
        </div>
        <Switch
          checked={form.mixNewWithReviews}
          onChange={(v) => set("mixNewWithReviews", v)}
          label="Mix new cards with reviews"
          description="When off, all due reviews are shown before any new cards."
        />
      </Section>

      <Section title="Review Settings">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Minimum interval (days)" hint="A graduated card's next review will never be scheduled sooner than this.">
            <TextField
              type="number"
              min={1}
              value={form.minimumInterval}
              onChange={(e) => set("minimumInterval", Number(e.target.value))}
              error={errors.minimumInterval}
            />
          </Field>
          <Field label="Maximum interval (days)" hint="The longest a card's review can ever be scheduled out, no matter how well you know it.">
            <TextField
              type="number"
              min={1}
              value={form.maximumInterval}
              onChange={(e) => set("maximumInterval", Number(e.target.value))}
              error={errors.maximumInterval}
            />
          </Field>
        </div>
      </Section>

      <Section title="Lapse Settings" description="What happens when you rate a review card Again.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Relearning steps" hint='How long to wait between re-tries after you forget a card, before it returns to the normal review schedule, e.g. "10m".'>
            <TextField
              value={formatSteps(form.relearningSteps)}
              onChange={(e) => set("relearningSteps", parseSteps(e.target.value))}
              error={errors.relearningSteps}
              placeholder="10m"
            />
          </Field>
          <Field label="Min. interval after lapse (days)" hint="Once a lapsed card recovers, its next interval won't be shorter than this.">
            <TextField
              type="number"
              min={1}
              value={form.minimumIntervalAfterLapse}
              onChange={(e) => set("minimumIntervalAfterLapse", Number(e.target.value))}
              error={errors.minimumIntervalAfterLapse}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Algorithm Settings"
        description="This app schedules reviews using FSRS (Free Spaced Repetition Scheduler)."
      >
        <Field
          label={`Desired retention — ${Math.round(form.desiredRetention * 100)}%`}
          hint="How likely you want to remember a card when it comes up for review. Higher retention means shorter, more frequent reviews; lower retention means longer gaps but more forgetting."
        >
          <input
            type="range"
            min={0.7}
            max={0.99}
            step={0.01}
            value={form.desiredRetention}
            onChange={(e) => set("desiredRetention", Number(e.target.value))}
            className="w-full accent-red-500"
          />
          {errors.desiredRetention && (
            <p className="mt-1 text-sm font-semibold text-red-600">{errors.desiredRetention}</p>
          )}
        </Field>

        <Switch
          checked={form.enableFuzz}
          onChange={(v) => set("enableFuzz", v)}
          label="Add slight randomness to intervals"
          description="Spreads cards out so they don't all clump onto the same day."
        />

        <div className="rounded-xl bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-ink-900">Apply new retention to existing cards</p>
              <p className="text-sm text-ink-500">
                Recomputes each review card&apos;s next-due date from its current memory strength
                under the retention above. Doesn&apos;t change review history or difficulty.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              fullWidth={false}
              className="px-5"
              onClick={() => setConfirmingReschedule(true)}
            >
              Reschedule Cards
            </Button>
          </div>
        </div>

        <p className="text-xs text-ink-300">
          We don&apos;t expose FSRS&apos;s raw weight parameters or an automatic optimizer here —
          they need a large personal review history to be meaningful, and the defaults already
          fit most learners well.
        </p>
      </Section>

      {saveMessage && (
        <p className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-semibold text-ink-700">
          {saveMessage}
        </p>
      )}

      <Button onClick={handleSave} loading={saving} fullWidth={false} className="max-w-xs px-8">
        Save Settings
      </Button>

      {confirmingReschedule && (
        <ConfirmDialog
          title="Reschedule existing cards?"
          description="This updates the next-review date for every review-state card to match your current desired retention. It won't affect new or learning cards."
          confirmLabel={rescheduling ? "Rescheduling…" : "Reschedule"}
          danger={false}
          onConfirm={handleReschedule}
          onCancel={() => setConfirmingReschedule(false)}
        />
      )}
    </div>
  );
}
