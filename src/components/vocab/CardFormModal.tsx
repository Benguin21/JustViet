"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PARTS_OF_SPEECH } from "@/lib/vocab/types";
import type { NewVocabCardInput, PartOfSpeech, VocabCard } from "@/lib/vocab/types";

type CardFormModalProps = {
  /** Pass an existing card to edit it; omit to create a new one. */
  card?: VocabCard;
  onClose: () => void;
  onSubmit: (input: NewVocabCardInput) => Promise<unknown>;
  onResetProgress?: () => Promise<void>;
};

const EMPTY: NewVocabCardInput = {
  front: "",
  back: "",
  exampleSentence: "",
  partOfSpeech: "",
  tags: [],
  pronunciation: "",
  notes: "",
};

export function CardFormModal({ card, onClose, onSubmit, onResetProgress }: CardFormModalProps) {
  const isEditing = Boolean(card);
  const [form, setForm] = useState<NewVocabCardInput>(
    card
      ? {
          front: card.front,
          back: card.back,
          exampleSentence: card.exampleSentence,
          partOfSpeech: card.partOfSpeech,
          tags: card.tags,
          pronunciation: card.pronunciation ?? "",
          notes: card.notes ?? "",
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  function update<K extends keyof NewVocabCardInput>(key: K, value: NewVocabCardInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const nextErrors: typeof errors = {};
    if (!form.front.trim()) nextErrors.front = "Enter the vocabulary word or phrase.";
    if (!form.back.trim()) nextErrors.back = "Enter its meaning.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return; // guard against double-submission (e.g. a fast double-click)
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose(); // success: close immediately, the caller shows a toast
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleResetProgress() {
    if (!onResetProgress) return;
    setResetting(true);
    setFormError(null);
    try {
      await onResetProgress();
      setConfirmingReset(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <Modal title={isEditing ? "Edit Card" : "Add Card"} onClose={onClose} maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Front (word/phrase)"
              value={form.front}
              onChange={(e) => update("front", e.target.value)}
              error={errors.front}
              autoFocus
              placeholder="ăn"
            />
            <TextField
              label="Back (meaning)"
              value={form.back}
              onChange={(e) => update("back", e.target.value)}
              error={errors.back}
              placeholder="to eat"
            />
          </div>

          <Textarea
            label="Example sentence"
            value={form.exampleSentence}
            onChange={(e) => update("exampleSentence", e.target.value)}
            placeholder="Tôi ăn cơm."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Part of speech"
              value={form.partOfSpeech}
              onChange={(e) => update("partOfSpeech", e.target.value as PartOfSpeech)}
            >
              <option value="">—</option>
              {PARTS_OF_SPEECH.map((pos) => (
                <option key={pos} value={pos}>
                  {pos[0].toUpperCase() + pos.slice(1)}
                </option>
              ))}
            </Select>
            <TagInput
              label="Tags"
              value={form.tags}
              onChange={(tags) => update("tags", tags)}
              placeholder="food, travel…"
            />
          </div>

          <details className="rounded-xl border border-ink-300/30 px-4 py-3">
            <summary className="cursor-pointer text-sm font-bold text-ink-500">
              More fields (optional)
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Pronunciation"
                value={form.pronunciation}
                onChange={(e) => update("pronunciation", e.target.value)}
                placeholder="an"
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Common verb"
              />
            </div>
          </details>

          {formError && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {formError}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} fullWidth={false} className="px-6">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} fullWidth={false} className="px-8">
              {isEditing ? "Save Changes" : "Add Card"}
            </Button>
          </div>

          {isEditing && onResetProgress && (
            <details className="mt-2 rounded-xl border border-ink-300/30 px-4 py-3">
              <summary className="cursor-pointer text-sm font-bold text-ink-500">Advanced</summary>
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="text-sm text-ink-500">
                  Resets this card back to New, clearing its scheduling — its past review history is
                  kept.
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onClick={() => setConfirmingReset(true)}
                >
                  Reset SRS Progress
                </Button>
              </div>
            </details>
          )}
        </form>
      </Modal>

      {confirmingReset && (
        <ConfirmDialog
          title="Reset SRS progress?"
          description="This card will go back to New and lose its current schedule. Its past review history stays intact. This can't be undone."
          confirmLabel={resetting ? "Resetting…" : "Reset Progress"}
          onConfirm={handleResetProgress}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </>
  );
}
