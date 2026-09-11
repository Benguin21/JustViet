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
    <header className="flex items-center justify-between border-b-2 border-ink-300/30 bg-surface px-6 py-4">
      <Link href="/home">
        <Logo />
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden text-sm font-bold text-ink-700 sm:inline">
            Xin chào, {user.displayName || user.email}!
          </span>
        )}
        <button
          type="button"
          onClick={handleLogOut}
          className="rounded-xl border-2 border-ink-300/60 px-4 py-2 text-sm font-bold text-ink-700 hover:bg-yellow-50"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}
