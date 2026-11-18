"use client";

import Link from "next/link";
import type { CommunityProfile } from "@/lib/community/types";
import { formatAgo, showEdited } from "@/lib/community/posts";
import { useNow } from "@/lib/useNow";
import { Avatar, BlankAvatar } from "./Avatar";
import { CommunityXp } from "./CommunityXp";

/** "(avatar) Name · 12 Community XP · 3h ago · Edited". Deleted authors show no name. */
export function MemberLine({
  uid,
  profile,
  createdAt,
  editedAt = null,
  size = "sm",
  showXp = true,
}: {
  uid: string;
  profile: CommunityProfile | undefined;
  createdAt: number;
  editedAt?: number | null;
  size?: "sm" | "md";
  showXp?: boolean;
}) {
  const now = useNow();
  const when = (
    <time dateTime={new Date(createdAt).toISOString()} title={new Date(createdAt).toLocaleString()}>
      {formatAgo(createdAt, now)}
    </time>
  );
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
      {uid && profile ? (
        <Link
          href={`/community/profile?uid=${encodeURIComponent(uid)}`}
          className="flex min-w-0 items-center gap-2 rounded-lg font-bold text-ink-900 hover:text-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
        >
          <Avatar name={profile.name} color={profile.color} size={size} />
          <span className="truncate">{profile.name}</span>
        </Link>
      ) : (
        <span className="flex items-center gap-2 font-semibold">
          <BlankAvatar size={size} />
          {uid ? "…" : "Deleted"}
        </span>
      )}
      {uid && profile && showXp && (
        <>
          <span aria-hidden="true">·</span>
          <CommunityXp totals={profile} className="font-semibold" />
        </>
      )}
      <span aria-hidden="true">·</span>
      {when}
      {showEdited(createdAt, editedAt) && (
        <>
          <span aria-hidden="true">·</span>
          <span className="font-semibold" title={editedAt ? new Date(editedAt).toLocaleString() : undefined}>
            Edited
          </span>
        </>
      )}
    </div>
  );
}
