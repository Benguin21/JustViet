"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AddToVocabButton } from "@/components/dictionary/AddToVocabButton";
import { EntryDetails } from "@/components/dictionary/EntryDetails";
import type { DictionaryHeadword } from "@/lib/dictionary/types";

type EntryDetailModalProps = {
  headword: DictionaryHeadword;
  /** The user's SRS card for this word, if any. */
  srsCardId?: string;
  srsPending: boolean;
  onClose: () => void;
  onAddToVocab: () => Promise<void>;
  /** Edit the personal entry (custom word) or the personal meanings on a shared word. */
  onEditPersonal: () => void;
  /** Add the user's own meaning to this headword. */
  onAddMeaning: () => void;
  onDeletePersonal: () => Promise<void>;
};

export function EntryDetailModal({
  headword,
  srsCardId,
  srsPending,
  onClose,
  onAddToVocab,
  onEditPersonal,
  onAddMeaning,
  onDeletePersonal,
}: EntryDetailModalProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCustomWord = !headword.shared;

  async function handleDelete() {
    setError(null);
    try {
      await onDeletePersonal();
      setConfirmingDelete(false);
    } catch (err) {
      setConfirmingDelete(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Modal title="Dictionary" onClose={onClose} maxWidth="lg">
        <div className="flex flex-col gap-6">
          <EntryDetails headword={headword} />

          <div className="rounded-2xl bg-paper p-4">
            <p className="mb-3 text-sm font-semibold text-ink-500">
              {srsCardId
                ? "You're studying this word in your Vocab SRS."
                : "Want to remember this word? Add it to your spaced-repetition practice."}
            </p>
            <AddToVocabButton cardId={srsCardId} onAdd={onAddToVocab} pending={srsPending} />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t-2 border-ink-300/20 pt-4">
            {headword.personal ? (
              <>
                <Button variant="outline" size="sm" fullWidth={false} onClick={onEditPersonal}>
                  {isCustomWord ? "Edit word" : "Edit my meanings"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onClick={() => setConfirmingDelete(true)}
                >
                  {isCustomWord ? "Delete word" : "Remove my meanings"}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" fullWidth={false} onClick={onAddMeaning}>
                + Add my own meaning
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {confirmingDelete && (
        <ConfirmDialog
          title={isCustomWord ? "Delete this word?" : "Remove your meanings?"}
          description={
            isCustomWord
              ? `"${headword.headword}" will be removed from your dictionary.${srsCardId ? " Your vocab card for it — and its review history — will stay." : ""}`
              : `Your own meanings and notes for "${headword.headword}" will be removed. The dictionary's definition stays.`
          }
          confirmLabel={isCustomWord ? "Delete" : "Remove"}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
