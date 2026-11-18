"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { AlreadyReportedError, friendlyCommunityError } from "@/lib/community/errors";
import { REPORT_NOTE_MAX, reportsLeft } from "@/lib/community/limits";
import * as repo from "@/lib/community/repository";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/community/types";
import { useNow } from "@/lib/useNow";

const WHAT: Record<ReportTarget["kind"], string> = {
  post: "post",
  response: "response",
  reply: "reply",
  profile: "profile",
};

/**
 * Report a post, response, reply or profile. One report per member and
 * item. Reports are kept for the JustViet team and never remove anything by
 * themselves; afterwards we offer to hide the post or block its author.
 */
export function ReportDialog({
  target,
  authorUid,
  authorName,
  onClose,
}: {
  target: ReportTarget;
  /** Whose content it is, to offer blocking them afterwards. */
  authorUid: string | null;
  authorName: string | null;
  onClose: () => void;
}) {
  const { uid, activity, noteActivity, hide, block, blocked, hidden } = useCommunity();
  const now = useNow();
  const nameId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"form" | "sending" | "sent" | "already">("form");
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const left = reportsLeft(activity.reportDay, activity.reports, now);

  async function send() {
    if (!uid || !reason) return;
    setState("sending");
    setError(null);
    try {
      await repo.fileReport(uid, target, reason, note);
      noteActivity("report");
      setState("sent");
    } catch (err) {
      if (err instanceof AlreadyReportedError) setState("already");
      else {
        setError(friendlyCommunityError(err));
        setState("form");
      }
    }
  }

  async function doFollowUp(kind: "hide" | "block") {
    setError(null);
    try {
      if (kind === "hide" && target.kind === "post") await hide(target.post);
      if (kind === "block" && authorUid) await block(authorUid);
      setFollowUp(kind === "hide" ? "This post is now hidden for you." : `${authorName ?? "This member"} is now blocked.`);
    } catch (err) {
      setError(friendlyCommunityError(err));
    }
  }

  if (state === "sent" || state === "already") {
    const canHide = target.kind === "post" && !hidden.has(target.post);
    const canBlock = authorUid && authorUid !== uid && !blocked.has(authorUid);
    return (
      <Modal title={state === "sent" ? "Thanks for reporting" : "Already reported"} onClose={onClose} maxWidth="md">
        <p className="text-ink-700">
          {state === "sent"
            ? "We've received your report. Reports are confidential and are reviewed by the JustViet team."
            : "You've already reported this. Thanks for letting us know."}
        </p>
        {followUp ? (
          <p role="status" className="mt-4 rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success-dark">
            {followUp}
          </p>
        ) : (
          (canHide || canBlock) && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink-500">Don&apos;t want to see it?</p>
              {canHide && (
                <Button variant="outline" size="sm" onClick={() => doFollowUp("hide")}>
                  Hide this post
                </Button>
              )}
              {canBlock && (
                <Button variant="outline" size="sm" onClick={() => doFollowUp("block")}>
                  Block {authorName ?? "this member"}
                </Button>
              )}
            </div>
          )
        )}
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-6">
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Report this ${WHAT[target.kind]}`} onClose={onClose} maxWidth="md">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold text-ink-700">What&apos;s wrong with it?</legend>
        {REPORT_REASONS.map((r) => (
          <label
            key={r.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5 font-semibold focus-within:ring-4 focus-within:ring-yellow-200 ${
              reason === r.id ? "border-red-400 bg-red-50 text-ink-900" : "border-ink-300/40 text-ink-700 hover:bg-yellow-50"
            }`}
          >
            <input type="radio" name="report-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="h-4 w-4 accent-red-500" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
          Note <span className="font-semibold normal-case text-ink-500">(optional)</span>
        </label>
        <textarea
          id={nameId}
          rows={3}
          maxLength={REPORT_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full resize-none rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-3 text-ink-900 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100"
        />
        <p className="text-right text-xs font-semibold text-ink-500">
          {note.length} / {REPORT_NOTE_MAX}
        </p>
      </div>
      <p className="mt-2 text-sm text-ink-500">Reports are confidential. Nothing is removed automatically.</p>
      {left === 0 && <p className="mt-2 text-sm font-semibold text-ink-700">You&apos;ve reached today&apos;s limit for reports. Please try again tomorrow.</p>}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={send} disabled={!reason || left === 0} loading={state === "sending"}>
          Send report
        </Button>
      </div>
    </Modal>
  );
}
