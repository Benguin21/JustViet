"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { friendlyCommunityError } from "@/lib/community/errors";
import { MOD_REASON_MAX } from "@/lib/community/moderation";
import * as repo from "@/lib/community/repository";
import type { ItemRef } from "@/lib/community/types";
import { CommunityText } from "./CommunityText";

const QUICK_REASONS = ["Spam or promotion", "Harassment or hate", "Personal information", "Inappropriate content", "Off-topic"];

/** A reason box with one-tap common reasons. */
export function ReasonField({
  value,
  onChange,
  label = "Reason",
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
        {label} {!required && <span className="font-semibold normal-case text-ink-500">(optional)</span>}
      </label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common reasons">
        {QUICK_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={value === r}
            className={`rounded-full border-2 px-3 py-1 text-xs font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
              value === r ? "border-red-400 bg-red-50 text-ink-900" : "border-ink-300/50 text-ink-700 hover:bg-yellow-50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <textarea
        id={id}
        rows={3}
        maxLength={MOD_REASON_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-3 text-ink-900 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100"
      />
      <p className="text-right text-xs font-semibold text-ink-500">
        {value.length} / {MOD_REASON_MAX}
      </p>
    </div>
  );
}

/** Confirms a removal and collects the reason the author will see. */
export function ModRemoveDialog({
  noun,
  onConfirm,
  onClose,
  initialReason = "",
}: {
  noun: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
  initialReason?: string;
}) {
  const [reason, setReason] = useState(initialReason);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyCommunityError(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={`Remove this ${noun}?`} onClose={onClose} maxWidth="md">
      <p className="text-ink-700">
        It will show as &ldquo;Removed by a moderator&rdquo;. Its author is notified with your reason, and its votes
        stop counting toward their Community XP. You can restore it later.
      </p>
      <div className="mt-4">
        <ReasonField value={reason} onChange={setReason} />
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} loading={saving}>
          Remove
        </Button>
      </div>
    </Modal>
  );
}

/**
 * In place of removed content: "Removed by a moderator." Its author can see
 * what they wrote (and delete it for good); moderators can see it and
 * restore it.
 */
export function RemovedNotice({
  item,
  author,
  noun,
  onRestore,
}: {
  item: ItemRef;
  author: string;
  noun: string;
  onRestore?: () => Promise<void>;
}) {
  const { uid, isModerator } = useCommunity();
  const mine = Boolean(uid) && author === uid;
  const [copy, setCopy] = useState<repo.RemovedCopy | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyCommunityError(err));
    } finally {
      setBusy(false);
    }
  }

  const action =
    "rounded-lg px-2 py-1 text-sm font-bold text-ink-500 hover:bg-yellow-50 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-ink-300/50 bg-paper px-3 py-2.5">
      <p className="text-sm font-semibold text-ink-500 italic">
        {mine ? `A moderator removed your ${noun}. Only you and moderators can see what it said.` : `This ${noun} was removed by a moderator.`}
      </p>
      {copy && (
        <div className="rounded-lg bg-surface p-3">
          {copy.title && <p className="font-heading font-extrabold text-ink-900">{copy.title}</p>}
          <CommunityText text={copy.body} className="text-sm" />
          {copy.reason && <p className="mt-2 text-xs font-semibold text-ink-500">Reason: {copy.reason}</p>}
        </div>
      )}
      {copy === null && <p className="text-xs font-semibold text-ink-500">Its author deleted it for good.</p>}
      {(mine || isModerator) && (
        <div className="-ml-2 flex flex-wrap gap-0.5">
          {copy === undefined && (
            <button type="button" className={action} disabled={busy} onClick={() => run(async () => setCopy(await repo.fetchRemovedCopy(item)))}>
              {mine ? "Show what I wrote" : "Show original"}
            </button>
          )}
          {isModerator && onRestore && copy !== null && (
            <button type="button" className={action} disabled={busy} onClick={() => run(onRestore)}>
              Restore
            </button>
          )}
          {mine && copy !== null && (
            <button type="button" className={action} disabled={busy} onClick={() => setConfirm(true)}>
              Delete it for good
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {confirm && (
        <ConfirmDialog
          title="Delete it for good?"
          description="What you wrote will be erased permanently, and it can't be restored. The notice that it was removed stays."
          confirmLabel="Delete"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            run(async () => {
              await repo.deleteRemovedCopy(item);
              setCopy(null);
            });
          }}
        />
      )}
    </div>
  );
}
