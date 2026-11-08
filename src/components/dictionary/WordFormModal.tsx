"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { AddToVocabButton } from "@/components/dictionary/AddToVocabButton";
import { DICTIONARY_POS_OPTIONS } from "@/lib/dictionary/part-of-speech";
import { inputFromPersonalEntry, validatePersonalEntryInput } from "@/lib/dictionary/entries";
import { DuplicateDictionaryEntryError } from "@/lib/dictionary/errors";
import type {
  DictionaryHeadword,
  PersonalEntry,
  PersonalEntryInput,
} from "@/lib/dictionary/types";

export type WordFormMode =
  | { kind: "create"; initialHeadword?: string }
  | { kind: "edit"; entry: PersonalEntry; isOverlay: boolean }
  | { kind: "add-meaning"; headword: DictionaryHeadword };

type WordFormModalProps = {
  mode: WordFormMode;
  /** Live duplicate lookup against the merged dictionary (shared + personal). */
  findExisting: (headword: string) => DictionaryHeadword | undefined;
  onCreate: (input: PersonalEntryInput) => Promise<PersonalEntry>;
  onAddMeaning: (headword: string, input: PersonalEntryInput) => Promise<PersonalEntry>;
  onUpdate: (entry: PersonalEntry, input: PersonalEntryInput) => Promise<PersonalEntry>;
  onViewEntry: (key: string) => void;
  /** For the post-create "add it to your vocab too?" step. */
  srsCardIdFor: (key: string) => string | undefined;
  srsPending: boolean;
  onAddToVocab: (key: string) => Promise<void>;
  onClose: () => void;
};

const EMPTY: PersonalEntryInput = {
  headword: "",
  english: "",
  partOfSpeech: "",
  additionalMeanings: [],
  exampleVi: "",
  exampleEn: "",
  notes: "",
};

function initialInput(mode: WordFormMode): PersonalEntryInput {
  if (mode.kind === "edit") return inputFromPersonalEntry(mode.entry);
  if (mode.kind === "add-meaning") return { ...EMPTY, headword: mode.headword.headword };
  return { ...EMPTY, headword: mode.initialHeadword ?? "" };
}

const TITLES: Record<WordFormMode["kind"], string> = {
  create: "Add Word",
  edit: "Edit Word",
  "add-meaning": "Add a Meaning",
};

/**
 * Create a personal dictionary word, edit one, or add the user's own
 * meaning to an existing headword. In create mode the headword is checked
 * against the dictionary as you type, so a duplicate is flagged before
 * submitting — with a way to view the existing entry or attach the new
 * meaning to it instead.
 */
export function WordFormModal({
  mode: initialMode,
  findExisting,
  onCreate,
  onAddMeaning,
  onUpdate,
  onViewEntry,
  srsCardIdFor,
  srsPending,
  onAddToVocab,
  onClose,
}: WordFormModalProps) {
  const [mode, setMode] = useState<WordFormMode>(initialMode);
  const [form, setForm] = useState<PersonalEntryInput>(() => initialInput(initialMode));
  const [errors, setErrors] = useState<Partial<Record<"headword" | "english", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<PersonalEntry | null>(null);

  const existing = mode.kind === "create" ? findExisting(form.headword) : undefined;
  const headwordLocked = mode.kind !== "create";

  function update<K extends keyof PersonalEntryInput>(key: K, value: PersonalEntryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchToAddMeaning(headword: DictionaryHeadword) {
    setMode({ kind: "add-meaning", headword });
    setForm((prev) => ({ ...prev, headword: headword.headword }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    const nextErrors = validatePersonalEntryInput(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (existing) {
      setFormError("This word is already in your dictionary.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode.kind === "create") {
        setCreated(await onCreate(form));
        setSubmitting(false);
        return; // show the "add to vocab too?" step
      }
      if (mode.kind === "edit") await onUpdate(mode.entry, form);
      else await onAddMeaning(mode.headword.headword, form);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof DuplicateDictionaryEntryError || err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <Modal title="Word Added" onClose={onClose} maxWidth="md">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl" aria-hidden="true">
            🎉
          </span>
          <p className="font-semibold text-ink-700">
            <span className="font-heading text-2xl font-extrabold text-ink-900" lang="vi">
              {created.headword}
            </span>
            <br />
            is now in your dictionary.
          </p>
          <p className="text-sm text-ink-500">Want to practice it with spaced repetition too?</p>
          <AddToVocabButton
            cardId={srsCardIdFor(created.key)}
            pending={srsPending}
            onAdd={() => onAddToVocab(created.key)}
            showViewLink={false}
          />
          <Button variant="outline" onClick={onClose} className="mt-2">
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  const posOptions = DICTIONARY_POS_OPTIONS.some((o) => o.value === form.partOfSpeech)
    ? DICTIONARY_POS_OPTIONS
    : form.partOfSpeech
      ? [...DICTIONARY_POS_OPTIONS, { value: form.partOfSpeech, label: form.partOfSpeech }]
      : DICTIONARY_POS_OPTIONS;

  const title =
    mode.kind === "edit" && mode.isOverlay ? "Edit My Meanings" : TITLES[mode.kind];

  return (
    <Modal title={title} onClose={onClose} maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {headwordLocked ? (
          <div>
            <p className="text-sm font-bold tracking-wide text-ink-700 uppercase">Vietnamese</p>
            <p className="font-heading text-2xl font-extrabold text-ink-900" lang="vi">
              {form.headword}
            </p>
            {mode.kind === "edit" && !mode.isOverlay && (
              <p className="text-xs text-ink-500">
                To change the spelling, delete this word and add it again.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <TextField
              label="Vietnamese word or phrase"
              value={form.headword}
              onChange={(e) => update("headword", e.target.value)}
              error={errors.headword}
              autoFocus
              lang="vi"
              placeholder="xin chào"
            />
            {existing && (
              <div
                className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3"
                role="status"
              >
                <p className="text-sm font-semibold text-ink-700">
                  <span className="font-bold" lang="vi">
                    {existing.headword}
                  </span>{" "}
                  is already in your dictionary.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    fullWidth={false}
                    onClick={() => onViewEntry(existing.key)}
                  >
                    View entry
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    onClick={() => switchToAddMeaning(existing)}
                  >
                    Add my meaning to it
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="English meaning"
            value={form.english}
            onChange={(e) => update("english", e.target.value)}
            error={errors.english}
            autoFocus={headwordLocked}
            placeholder="hello"
          />
          <Select
            label="Part of speech"
            value={form.partOfSpeech}
            onChange={(e) => update("partOfSpeech", e.target.value)}
          >
            <option value="">—</option>
            {posOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label[0].toUpperCase() + o.label.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <details className="rounded-xl border border-ink-300/30 px-4 py-3" open={mode.kind === "edit"}>
          <summary className="cursor-pointer text-sm font-bold text-ink-500">
            More fields (optional)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <Textarea
              label="Other meanings (one per line)"
              value={form.additionalMeanings.join("\n")}
              onChange={(e) => update("additionalMeanings", e.target.value.split("\n"))}
              rows={2}
              placeholder="hi"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Example (Vietnamese)"
                value={form.exampleVi}
                onChange={(e) => update("exampleVi", e.target.value)}
                lang="vi"
                placeholder="Xin chào cô!"
              />
              <TextField
                label="Example (English)"
                value={form.exampleEn}
                onChange={(e) => update("exampleEn", e.target.value)}
                placeholder="Hello, teacher!"
              />
            </div>
            <Textarea
              label="Personal notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Used any time of day"
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
            {mode.kind === "create" ? "Add Word" : mode.kind === "edit" ? "Save Changes" : "Add Meaning"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
