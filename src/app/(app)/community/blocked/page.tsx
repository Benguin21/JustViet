"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar, BlankAvatar } from "@/components/community/Avatar";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/community/CommunityProvider";

/** The member's blocked accounts, with Unblock. */
export default function BlockedPage() {
  const { blocked, profiles, ensureProfiles, unblock } = useCommunity();
  const list = [...blocked];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = list.join(",");

  useEffect(() => {
    if (key) ensureProfiles(key.split(","));
  }, [key, ensureProfiles]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">Blocked accounts</h1>
        <p className="mt-2 text-ink-700">
          Posts, answers, comments and replies from accounts you block are collapsed for you, and you can still open
          them. Blocking doesn&apos;t stop the other person seeing community content, and it doesn&apos;t change any votes or
          Community XP. They aren&apos;t told that you blocked them.
        </p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {list.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-6 text-center font-semibold text-ink-500">
          You haven&apos;t blocked anyone. You can block a member from their profile or from anything they post.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((id) => {
            const p = profiles[id];
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink-300/30 bg-surface px-4 py-3">
                {p ? (
                  <Link href={`/community/profile?uid=${encodeURIComponent(id)}`} className="flex min-w-0 items-center gap-3 rounded-lg font-bold text-ink-900 hover:text-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
                    <Avatar name={p.name} color={p.color} />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-3 font-semibold text-ink-500">
                    <BlankAvatar /> Loading…
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  loading={busy === id}
                  onClick={async () => {
                    setBusy(id);
                    setError(null);
                    try {
                      await unblock(id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Couldn't unblock.");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Unblock
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
