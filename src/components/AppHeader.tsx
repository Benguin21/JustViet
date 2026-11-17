"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logOut, useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleLogOut() {
    await logOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b-2 border-ink-300/30 bg-surface px-4 py-4 sm:px-6">
      <Link href="/home" className="rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
        <Logo />
      </Link>
      <div className="flex items-center gap-2 sm:gap-4">
        {user && (
          <span className="hidden text-sm font-bold text-ink-700 md:inline">
            Xin chào, {user.displayName || user.email}!
          </span>
        )}
        <Link
          href="/settings"
          className="rounded-xl border-2 border-ink-300/60 px-3 py-2 text-sm font-bold text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 sm:px-4"
        >
          <span aria-hidden="true">⚙️ </span>Settings
        </Link>
        <button
          type="button"
          onClick={handleLogOut}
          className="rounded-xl border-2 border-ink-300/60 px-3 py-2 text-sm font-bold text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 sm:px-4"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}
