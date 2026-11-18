"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CommunityProvider, useCommunity } from "@/lib/community/CommunityProvider";
import { CommunityGate } from "./CommunityGate";
import { GuidelinesDialog } from "./Guidelines";

/** The Community's frame: shared member state, the joining steps, and the section nav. */
export function CommunityShell({ children }: { children: ReactNode }) {
  return (
    <CommunityProvider>
      <CommunityGate>
        <CommunityNav />
        {children}
      </CommunityGate>
    </CommunityProvider>
  );
}

function CommunityNav() {
  const pathname = usePathname();
  const { uid } = useCommunity();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const links = [
    { href: "/community", label: "Feed", active: pathname === "/community" || pathname.startsWith("/community/post") },
    { href: `/community/profile?uid=${encodeURIComponent(uid ?? "")}`, label: "My profile", active: pathname.startsWith("/community/profile") },
    { href: "/community/blocked", label: "Blocked", active: pathname.startsWith("/community/blocked") },
  ];
  const item =
    "rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200";
  return (
    <nav aria-label="Community" className="border-b-2 border-ink-300/20 bg-paper">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6">
        <Link href="/community" className="font-heading mr-2 rounded-lg text-lg font-extrabold text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          <span aria-hidden="true">💬 </span>Community
        </Link>
        {links.map((l) => (
          <Link key={l.label} href={l.href} aria-current={l.active ? "page" : undefined} className={`${item} ${l.active ? "bg-yellow-100 text-ink-900" : "text-ink-500 hover:bg-yellow-50 hover:text-ink-900"}`}>
            {l.label}
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
