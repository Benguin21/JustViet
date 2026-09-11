"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/vocab/StatusBadge";
import { effectiveStatus, formatDueDate } from "@/lib/vocab/srs";
import type { ReviewLogEntry, VocabCard } from "@/lib/vocab/types";

const RATING_LABEL: Record<ReviewLogEntry["rating"], string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const RATING_TONE: Record<ReviewLogEntry["rating"], "red" | "yellow" | "green" | "blue"> = {
  again: "red",
  hard: "yellow",
  good: "green",
  easy: "blue",
};

type CardDetailModalProps = {
  card: VocabCard;
  reviewHistory: ReviewLogEntry[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onToggleSuspend: () => Promise<void>;
  onStudyNow: () => void;
};

export function CardDetailModal({
  card,
  reviewHistory,
  onClose,
  onEdit,
  onDelete,
  onToggleSuspend,
  onStudyNow,
}: CardDetailModalProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = [...reviewHistory].sort((a, b) => b.reviewedAt - a.reviewedAt);
  const lapses = history.filter((r) => r.rating === "again" && r.priorState === "review").length;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  async function handleToggleSuspend() {
    setBusy(true);
    setError(null);
    try {
      await onToggleSuspend();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal title="Card Details" onClose={onClose} maxWidth="lg">
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={effectiveStatus(card)} />
              <Badge tone="gray">{card.partOfSpeech}</Badge>
              {card.tags.map((tag) => (
                <Badge key={tag} tone="yellow">
                  {tag}
                </Badge>
              ))}
            </div>
            <h3 className="font-heading mt-2 text-3xl font-extrabold text-ink-900">{card.front}</h3>
            <p className="text-lg font-semibold text-ink-700">{card.back}</p>
            {card.exampleSentence && (
              <p className="mt-2 rounded-xl bg-yellow-50 px-4 py-2 text-ink-700 italic">
                “{card.exampleSentence}”
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-paper p-4 sm:grid-cols-3">
            <Stat label="Total reviews" value={String(card.reviewCount)} />
            <Stat label="Lapses" value={String(lapses)} />
            <Stat
              label="Current interval"
              value={card.scheduledDays > 0 ? `${card.scheduledDays} d` : "—"}
            />
            <Stat label="Difficulty" value={card.difficulty > 0 ? card.difficulty.toFixed(1) : "—"} />
            <Stat label="Stability" value={card.stability > 0 ? `${card.stability.toFixed(1)} d` : "—"} />
            <Stat label="Next review" value={card.suspended ? "Suspended" : formatDueDate(card.due)} />
            <Stat label="Date created" value={new Date(card.createdAt).toLocaleDateString()} />
          </dl>

          <div>
            <h4 className="mb-2 text-sm font-bold tracking-wide text-ink-500 uppercase">
              Review History
            </h4>
            {history.length === 0 ? (
              <p className="text-sm text-ink-500">No reviews yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-ink-300/30">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-paper text-left text-xs font-bold tracking-wide text-ink-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Rating</th>
                      <th className="px-3 py-2">Interval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-t border-ink-300/20">
                        <td className="px-3 py-2 text-ink-700">
                          {new Date(entry.reviewedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={RATING_TONE[entry.rating]}>{RATING_LABEL[entry.rating]}</Badge>
                        </td>
                        <td className="px-3 py-2 text-ink-700">
                          {entry.scheduledDays >= 1
                            ? `${Math.round(entry.scheduledDays)} days`
                            : "< 1 day"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button fullWidth={false} className="px-6" onClick={onStudyNow}>
              Study Now
            </Button>
            <Button variant="outline" fullWidth={false} className="px-6" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              fullWidth={false}
              className="px-6"
              onClick={handleToggleSuspend}
              disabled={busy}
            >
              {card.suspended ? "Unsuspend" : "Suspend"}
            </Button>
            <Button
              variant="danger"
              fullWidth={false}
              className="px-6"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this card?"
          description={`"${card.front}" and its full review history will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="font-heading text-lg font-bold text-ink-900">{value}</dd>
    </div>
  );
}
