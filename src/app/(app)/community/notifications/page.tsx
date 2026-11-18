"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { describeNotification, isModNotification, notificationHref, type CommunityNotification } from "@/lib/community/notifications";
import { formatAgo } from "@/lib/community/posts";
import { useNotifications } from "@/lib/community/useNotifications";
import { useNow } from "@/lib/useNow";

const ICONS: Record<CommunityNotification["type"], string> = {
  response: "💬",
  reply: "↩️",
  mention: "@",
  accepted: "✅",
  removed: "🛡️",
  restored: "🛡️",
  warning: "⚠️",
  suspended: "⏸️",
  unsuspended: "▶️",
  banned: "🚫",
  unbanned: "🔓",
};

/** The member's notifications: answers, replies, mentions, accepted answers and moderation. */
export default function NotificationsPage() {
  const { profiles, blocked } = useCommunity();
  const page = useNotifications();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notifications from members you've blocked aren't shown (moderation ones always are).
  const items = page.items.filter((n) => isModNotification(n.type) || !blocked.has(n.from));
  const unread = items.filter((n) => !n.read).length;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">Notifications</h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" fullWidth={false} loading={busy} onClick={() => run(page.markAllRead)}>
            Mark all as read
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

      {page.loading ? (
        <ul className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-ink-300/15" />
          ))}
        </ul>
      ) : page.error && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-ink-700">{page.error}</p>
          <Button variant="outline" fullWidth={false} onClick={page.retry}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-8 text-center font-semibold text-ink-500">
          No notifications yet. When someone answers or replies to you, it shows up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const post = n.post ? page.posts[n.post] : undefined;
            const sender = n.from === "mod" ? "A moderator" : (profiles[n.from]?.name ?? "Someone");
            const text = describeNotification(n, {
              sender,
              postTitle: post && !post.deleted ? post.title : null,
              postType: post?.type ?? null,
            });
            const href = notificationHref(n);
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-2xl border-2 p-3 sm:p-4 ${n.read ? "border-ink-300/30 bg-surface" : "border-yellow-300 bg-yellow-50"}`}
              >
                <span className="font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-lg font-extrabold text-ink-700" aria-hidden="true">
                  {ICONS[n.type]}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        page.markRead([n.id]).catch(() => {});
                      }}
                      className="rounded font-semibold text-ink-900 [overflow-wrap:anywhere] hover:text-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                    >
                      {text}
                    </Link>
                  ) : (
                    <p className="font-semibold text-ink-900">{text}</p>
                  )}
                  {n.reason && (
                    <p className="rounded-lg bg-surface/70 px-2 py-1 text-sm text-ink-700 [overflow-wrap:anywhere]">
                      <span className="font-bold">Reason:</span> {n.reason}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-ink-500">
                    {!n.read && <span className="mr-1 font-extrabold text-red-600">New ·</span>}
                    {formatAgo(n.at, now)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => run(() => page.markRead([n.id]))}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-ink-500 hover:bg-yellow-100 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Delete notification"
                    onClick={() => run(() => page.remove(n.id))}
                    className="rounded-lg px-2 py-1 text-lg leading-none text-ink-500 hover:bg-yellow-100 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {page.hasMore && !page.loading && (
        <Button variant="outline" onClick={page.loadMore} loading={page.loadingMore}>
          Load more
        </Button>
      )}
    </main>
  );
}
