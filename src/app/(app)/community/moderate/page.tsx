"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { ModRemoveDialog } from "@/components/community/Moderation";
import { CommunityText } from "@/components/community/CommunityText";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { plainText } from "@/lib/community/format";
import type { ModAction, ReportGroup } from "@/lib/community/moderation";
import { formatAgo, formatDate } from "@/lib/community/posts";
import { REPORT_REASONS } from "@/lib/community/types";
import { responseKey, useModeration } from "@/lib/community/useModeration";
import { useNow } from "@/lib/useNow";
import { useToast } from "@/lib/useToast";

type Tab = "reports" | "removed" | "log";

const ACTION_TEXT: Record<ModAction, string> = {
  remove: "removed content by",
  restore: "restored content by",
  dismiss: "dismissed reports about",
  warn: "warned",
  suspend: "suspended",
  unsuspend: "lifted the suspension of",
  ban: "banned",
  unban: "unbanned",
  rename: "reset the name of",
  void: "cancelled the votes of",
};

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/** The moderator dashboard: the reports queue, removed content and the log. */
export default function ModeratePage() {
  const mod = useModeration();
  const { profiles } = useCommunity();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("reports");
  const { message: toast, showToast } = useToast();

  if (!mod.isModerator) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center sm:px-6">
        <p className="font-heading text-xl font-extrabold text-ink-900">Moderators only</p>
        <p className="mt-2 text-ink-500">If you were just made a moderator, sign out and back in.</p>
      </main>
    );
  }

  const name = (uid: string | null) => (uid ? (profiles[uid]?.name ?? "a member") : "a member");
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "reports", label: "Reports", count: mod.groups.length },
    { id: "removed", label: "Removed", count: mod.removed.length },
    { id: "log", label: "Log" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink-900">Moderate</h1>
          <p className="mt-1 text-sm font-semibold text-ink-500">
            Members are told what happened and why, but never which moderator did it. Warn, suspend or ban from a member&apos;s profile.
          </p>
        </div>
        <Button variant="outline" size="sm" fullWidth={false} onClick={mod.retry}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Moderation">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
              tab === t.id ? "border-red-500 bg-red-500 text-white" : "border-ink-300/50 bg-surface text-ink-700 hover:bg-yellow-50"
            }`}
          >
            {t.label}
            {t.count ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {mod.loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-ink-300/15" aria-busy="true" />
      ) : mod.error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-ink-700">{mod.error}</p>
          <Button variant="outline" fullWidth={false} onClick={mod.retry}>
            Try again
          </Button>
        </div>
      ) : tab === "reports" ? (
        mod.groups.length === 0 ? (
          <Empty text="No open reports. All clear!" />
        ) : (
          <ul className="flex flex-col gap-3">
            {mod.groups.map((g) => (
              <ReportCard key={g.key} group={g} mod={mod} name={name} onDone={showToast} now={now} />
            ))}
          </ul>
        )
      ) : tab === "removed" ? (
        mod.removed.length === 0 ? (
          <Empty text="Nothing removed recently." />
        ) : (
          <ul className="flex flex-col gap-3">
            {mod.removed.map((c) => (
              <li key={c.key} className="flex flex-col gap-2 rounded-2xl border-2 border-ink-300/30 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
                  <Badge tone="gray">{c.response ? "Response" : "Post"}</Badge>
                  by <span className="font-bold text-ink-900">{name(c.author)}</span> · removed {formatAgo(c.removedAt, now)}
                </div>
                {c.title && <p className="font-heading font-extrabold text-ink-900 [overflow-wrap:anywhere]">{c.title}</p>}
                <p className="line-clamp-3 text-sm text-ink-700 [overflow-wrap:anywhere]">{plainText(c.body)}</p>
                {c.reason && <p className="text-xs font-semibold text-ink-500">Reason: {c.reason}</p>}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/community/post?id=${c.post}${c.response ? `#r-${c.response}` : ""}`} className="rounded-lg px-2 py-1 text-sm font-bold text-red-600 hover:bg-yellow-50">
                    View
                  </Link>
                  <AsyncButton label="Restore" onClick={() => mod.restore(c).then(() => showToast("Restored"))} />
                </div>
              </li>
            ))}
          </ul>
        )
      ) : mod.log.length === 0 ? (
        <Empty text="No moderator actions yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {mod.log.map((e) => (
            <li key={e.id} className="rounded-2xl border-2 border-ink-300/30 bg-surface px-4 py-3 text-sm text-ink-700">
              <span className="font-bold text-ink-900">{name(e.by)}</span> {ACTION_TEXT[e.action]}{" "}
              <span className="font-bold text-ink-900">{name(e.uid)}</span>
              {e.until ? ` until ${formatDate(e.until)}` : ""}
              {e.post && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/community/post?id=${e.post}${e.response ? `#r-${e.response}` : ""}`} className="font-bold text-red-600 hover:underline">
                    view
                  </Link>
                </>
              )}
              <span className="text-ink-500"> · {formatAgo(e.at, now)}</span>
              {e.reason && <p className="mt-1 text-xs text-ink-500 [overflow-wrap:anywhere]">Reason: {e.reason}</p>}
            </li>
          ))}
        </ul>
      )}
      {toast && <Toast message={toast} />}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-8 text-center font-semibold text-ink-500">{text}</p>;
}

function AsyncButton({ label, onClick, variant = "outline" }: { label: string; onClick: () => Promise<unknown>; variant?: "outline" | "danger" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <Button
        variant={variant}
        size="sm"
        fullWidth={false}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onClick();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      {error && <span className="mt-1 text-xs font-semibold text-red-600">{error}</span>}
    </span>
  );
}

function ReportCard({
  group: g,
  mod,
  name,
  onDone,
  now,
}: {
  group: ReportGroup;
  mod: ReturnType<typeof useModeration>;
  name: (uid: string | null) => string;
  onDone: (msg: string) => void;
  now: number;
}) {
  const [removing, setRemoving] = useState(false);
  const post = g.post ? mod.posts[g.post] : undefined;
  const response = g.post && g.response ? mod.responses[responseKey(g.post, g.response)] : undefined;
  const author = mod.authorOf(g);
  const gone = g.kind === "profile" ? false : g.response ? !response || response.deleted : !post || post.deleted;
  const kindLabel = g.kind === "post" ? "Post" : g.kind === "response" ? (post?.type === "discussion" ? "Comment" : "Answer") : g.kind === "reply" ? "Reply" : "Profile";
  const topReason = Object.entries(g.reasons).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
  const link =
    g.kind === "profile"
      ? `/community/profile?uid=${encodeURIComponent(g.profile ?? "")}`
      : `/community/post?id=${g.post}${g.response ? `#r-${g.response}` : ""}`;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-ink-300/30 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <Badge tone="red">{kindLabel}</Badge>
        <span>
          {g.reports.length} report{g.reports.length === 1 ? "" : "s"} · first {formatAgo(g.firstAt, now)}
        </span>
        <span>
          · {g.kind === "profile" ? "member" : "by"} <span className="font-bold text-ink-900">{name(author)}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(g.reasons).map(([reason, count]) => (
          <Badge key={reason} tone="gray">
            {reasonLabel(reason)}
            {count && count > 1 ? ` ×${count}` : ""}
          </Badge>
        ))}
      </div>
      {g.kind !== "profile" && (
        <div className="rounded-xl bg-paper p-3">
          {gone ? (
            <p className="text-sm font-semibold text-ink-500 italic">Already deleted or removed.</p>
          ) : (
            <>
              {!g.response && post && <p className="font-heading font-extrabold text-ink-900 [overflow-wrap:anywhere]">{post.title}</p>}
              <CommunityText text={(g.response ? response?.body : post?.body) ?? ""} className="line-clamp-6 text-sm" />
            </>
          )}
        </div>
      )}
      {g.notes.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-ink-700">
          {g.notes.map((n, i) => (
            <li key={i} className="border-l-4 border-yellow-200 pl-2 [overflow-wrap:anywhere]">
              “{n}”
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <Link href={link} className="rounded-lg px-2 py-1.5 text-sm font-bold text-red-600 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          {g.kind === "profile" ? "Open profile" : "View in context"}
        </Link>
        {author && g.kind !== "profile" && (
          <Link
            href={`/community/profile?uid=${encodeURIComponent(author)}`}
            className="rounded-lg px-2 py-1.5 text-sm font-bold text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
          >
            Author&apos;s profile
          </Link>
        )}
        {g.kind !== "profile" && !gone && <Button variant="danger" size="sm" fullWidth={false} onClick={() => setRemoving(true)}>Remove</Button>}
        <AsyncButton label="Dismiss" onClick={() => mod.dismiss(g).then(() => onDone("Reports dismissed"))} />
      </div>
      {removing && (
        <ModRemoveDialog
          noun={kindLabel.toLowerCase()}
          initialReason={topReason ? reasonLabel(topReason) : ""}
          onClose={() => setRemoving(false)}
          onConfirm={async (reason) => {
            await mod.removeReported(g, reason);
            onDone("Removed");
          }}
        />
      )}
    </li>
  );
}
