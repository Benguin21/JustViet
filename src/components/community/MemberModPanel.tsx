"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { friendlyCommunityError } from "@/lib/community/errors";
import { SUSPENSION_DAYS, isSuspended } from "@/lib/community/moderation";
import { formatDate } from "@/lib/community/posts";
import * as repo from "@/lib/community/repository";
import { useNow } from "@/lib/useNow";
import { ReasonField } from "./Moderation";

type Dialog = "warn" | "suspend" | "ban" | "rename" | "void" | null;

/**
 * On a member's profile, for moderators: their standing, and warn,
 * suspend, lift a suspension, ban or unban, reset an offensive name, or
 * cancel all their votes (vote manipulation). Every action notifies the
 * member (from "a moderator") and is written to the moderator log.
 */
export function MemberModPanel({ modUid, uid, name, onDone }: { modUid: string; uid: string; name: string; onDone: (msg: string) => void }) {
  const now = useNow();
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState<{ key: string; banned: boolean; suspendedUntil: number | null } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const key = `${uid}:${reload}`;

  useEffect(() => {
    let cancelled = false;
    repo.fetchMemberStatus(uid).then(
      (s) => {
        if (!cancelled) setStatus({ key, ...s });
      },
      (err) => {
        if (!cancelled) setError(friendlyCommunityError(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid, key]);

  const current = status?.key === key ? status : null;
  const suspended = current ? isSuspended(current.suspendedUntil, now) : false;

  async function run(fn: () => Promise<unknown>, msg: string) {
    setError(null);
    try {
      await fn();
      setDialog(null);
      setReload((n) => n + 1);
      onDone(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : friendlyCommunityError(err));
      throw err;
    }
  }

  return (
    <section aria-label="Moderation" className="flex flex-col gap-3 rounded-3xl border-2 border-red-200 bg-red-50 p-5">
      <h2 className="font-heading text-lg font-extrabold text-ink-900">Moderation</h2>
      <p className="text-sm font-semibold text-ink-700">
        {!current
          ? "Checking…"
          : current.banned
            ? `${name} is banned from the Community.`
            : suspended
              ? `${name} is suspended from posting until ${formatDate(current.suspendedUntil!)}.`
              : `${name} is in good standing.`}
      </p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {progress && <p role="status" className="text-sm font-semibold text-ink-700">{progress}</p>}
      {current && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" fullWidth={false} onClick={() => setDialog("warn")}>
            Warn
          </Button>
          {suspended ? (
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => run(() => repo.unsuspendMember(modUid, uid), "Suspension lifted").catch(() => {})}>
              Lift suspension
            </Button>
          ) : (
            !current.banned && (
              <Button variant="outline" size="sm" fullWidth={false} onClick={() => setDialog("suspend")}>
                Suspend
              </Button>
            )
          )}
          {current.banned ? (
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => run(() => repo.unbanMember(modUid, uid), "Ban lifted").catch(() => {})}>
              Unban
            </Button>
          ) : (
            <Button variant="danger" size="sm" fullWidth={false} onClick={() => setDialog("ban")}>
              Ban
            </Button>
          )}
          <Button variant="outline" size="sm" fullWidth={false} onClick={() => setDialog("rename")}>
            Reset name
          </Button>
          <Button variant="outline" size="sm" fullWidth={false} onClick={() => setDialog("void")}>
            Cancel their votes
          </Button>
        </div>
      )}
      {dialog && (
        <SanctionDialog
          kind={dialog}
          name={name}
          onClose={() => setDialog(null)}
          onConfirm={(reason, days) =>
            dialog === "warn"
              ? run(() => repo.warnMember(modUid, uid, reason), "Warning sent")
              : dialog === "suspend"
                ? run(() => repo.suspendMember(modUid, uid, days, reason), "Member suspended")
                : dialog === "rename"
                  ? run(() => repo.resetMemberName(modUid, uid, reason), "Name reset")
                  : dialog === "void"
                    ? run(async () => {
                        const n = await repo.voidMemberVotes(modUid, uid, reason, (done, total) =>
                          setProgress(`Cancelling votes: ${done} of ${total}…`),
                        );
                        setProgress(`Cancelled ${n} vote${n === 1 ? "" : "s"}.`);
                      }, "Votes cancelled")
                    : run(() => repo.banMember(modUid, uid, reason), "Member banned")
          }
        />
      )}
    </section>
  );
}

const COPY = {
  warn: { title: "Warn", body: "They get a notification with your message. Nothing else changes.", action: "Send warning" },
  suspend: {
    title: "Suspend",
    body: "They can still read the Community, but can't post, answer, comment, reply, vote, edit or report until it ends.",
    action: "Suspend",
  },
  ban: {
    title: "Ban",
    body: "They lose all access to the Community (reading too) until unbanned. Their posts stay unless you remove them.",
    action: "Ban",
  },
  rename: {
    title: "Reset the name of",
    body: "Their name becomes \"Member\" and six digits, and they're asked to choose a new one (they can right away).",
    action: "Reset name",
  },
  void: {
    title: "Cancel the votes of",
    body: "For vote manipulation: every vote they cast is cancelled and everyone's Community XP is corrected. This can take a minute.",
    action: "Cancel votes",
  },
} as const;

function SanctionDialog({
  kind,
  name,
  onClose,
  onConfirm,
}: {
  kind: Exclude<Dialog, null>;
  name: string;
  onClose: () => void;
  onConfirm: (reason: string, days: number) => Promise<unknown>;
}) {
  const daysId = useId();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState<number>(SUSPENSION_DAYS[1]);
  const [saving, setSaving] = useState(false);
  const copy = COPY[kind];

  return (
    <Modal title={`${copy.title} ${name}`} onClose={onClose} maxWidth="md">
      <p className="text-ink-700">{copy.body} They&apos;re told it was a moderator, not which one.</p>
      {kind === "suspend" && (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={daysId} className="text-sm font-bold tracking-wide text-ink-700 uppercase">
            For how long
          </label>
          <select
            id={daysId}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-3 text-ink-900 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-100"
          >
            {SUSPENSION_DAYS.map((d) => (
              <option key={d} value={d}>
                {d} day{d === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-4">
        <ReasonField value={reason} onChange={setReason} label={kind === "warn" ? "Message" : "Reason"} required />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={kind === "ban" ? "danger" : "primary"}
          disabled={!reason.trim()}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onConfirm(reason, days);
            } catch {
              setSaving(false);
            }
          }}
        >
          {copy.action}
        </Button>
      </div>
    </Modal>
  );
}
