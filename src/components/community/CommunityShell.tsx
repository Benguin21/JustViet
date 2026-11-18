"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CommunityProvider, useCommunity } from "@/lib/community/CommunityProvider";
import { isSuspended } from "@/lib/community/moderation";
import { formatDate } from "@/lib/community/posts";
import { useNow } from "@/lib/useNow";
import { CommunityGate } from "./CommunityGate";
import { GuidelinesDialog } from "./Guidelines";

/** The Community's frame: shared member state, the joining steps, the section nav and any suspension. */
export function CommunityShell({ children }: { children: ReactNode }) {
  return (
    <CommunityProvider>
      <CommunityGate>
        <CommunityNav />
        <SuspendedBanner />
        {children}
      </CommunityGate>
    </CommunityProvider>
  );
}

function CommunityNav() {
  const pathname = usePathname();
  const { uid, unreadCount, isModerator } = useCommunity();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const links = [
    { href: "/community", label: "Feed", active: pathname === "/community" || pathname.startsWith("/community/post") },
    {
      href: "/community/notifications",
      label: "Notifications",
      badge: unreadCount,
      active: pathname.startsWith("/community/notifications"),
    },
    { href: `/community/profile?uid=${encodeURIComponent(uid ?? "")}`, label: "My profile", active: pathname.startsWith("/community/profile") },
    { href: "/community/blocked", label: "Blocked", active: pathname.startsWith("/community/blocked") },
    ...(isModerator ? [{ href: "/community/moderate", label: "Moderate", active: pathname.startsWith("/community/moderate") }] : []),
  ];
  const item =
    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200";
  return (
    <nav aria-label="Community" className="border-b-2 border-ink-300/20 bg-paper">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6">
        <Link href="/community" className="font-heading mr-2 rounded-lg text-lg font-extrabold text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          <span aria-hidden="true">💬 </span>Community
        </Link>
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            aria-current={l.active ? "page" : undefined}
            className={`${item} ${l.active ? "bg-yellow-100 text-ink-900" : "text-ink-500 hover:bg-yellow-50 hover:text-ink-900"}`}
          >
            {l.label}
            {"badge" in l && l.badge ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] leading-none font-extrabold text-white">
                {l.badge > 99 ? "99+" : l.badge}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </Link>
        ))}
        <button type="button" onClick={() => setShowGuidelines(true)} className={`${item} text-ink-500 hover:bg-yellow-50 hover:text-ink-900`}>
          Guidelines
        </button>
      </div>
      {showGuidelines && <GuidelinesDialog onClose={() => setShowGuidelines(false)} />}
    </nav>
  );
}

/** While a moderator's suspension lasts: reading works, contributing doesn't. */
function SuspendedBanner() {
  const { activity } = useCommunity();
  const now = useNow();
  if (!isSuspended(activity.suspendedUntil, now)) return null;
  return (
    <div role="status" className="border-b-2 border-yellow-200 bg-yellow-50 px-4 py-2.5 sm:px-6">
      <p className="mx-auto max-w-3xl text-sm font-semibold text-ink-700">
        A moderator suspended you from posting until {formatDate(activity.suspendedUntil!)}. You can still read the
        Community.{" "}
        <Link href="/community/notifications" className="font-bold text-red-600 underline-offset-2 hover:underline">
          See why
        </Link>
      </p>
    </div>
  );
}
