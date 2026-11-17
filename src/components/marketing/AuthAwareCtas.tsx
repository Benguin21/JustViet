"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAuth } from "@/lib/auth-context";

/**
 * The marketing site's calls to action. Signed-out visitors get "start
 * free" + "log in"; anyone already signed in gets a single "continue
 * learning" button straight into the app.
 */
export function HeroCtas({ align = "start" }: { align?: "start" | "center" }) {
  const { user, loading } = useAuth();
  const justify = align === "center" ? "justify-center" : "justify-center sm:justify-start";

  if (!loading && user) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${justify}`}>
        <ButtonLink href="/home" size="lg">
          Continue Learning →
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${justify}`}>
      <ButtonLink href="/login?view=signup" size="lg">
        Start Learning Free
      </ButtonLink>
      <ButtonLink href="/login" size="lg" variant="outline">
        Log In
      </ButtonLink>
    </div>
  );
}

/** The header's right-hand buttons. */
export function HeaderCtas() {
  const { user, loading } = useAuth();
  if (!loading && user) {
    return (
      <ButtonLink href="/home" size="sm" className="px-4 py-2">
        Open JustViet
      </ButtonLink>
    );
  }
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="rounded-xl px-2 py-2 text-sm font-bold text-ink-700 hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 sm:px-3"
      >
        Log in
      </Link>
      <ButtonLink href="/login?view=signup" size="sm" className="px-4 py-2">
        Start Free
      </ButtonLink>
    </div>
  );
}
