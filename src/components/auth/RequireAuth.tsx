"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { loginPathFor } from "@/lib/auth/next-path";

/**
 * Client-side route guard: redirects to /login when there's no signed-in
 * user, and renders nothing until we know either way (avoids a flash of
 * protected content). The login URL carries `?next=` so the user lands
 * back on this page after signing in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Read the location here (not via useSearchParams) so this guard
      // doesn't need a Suspense boundary around every page.
      router.replace(loginPathFor(`${window.location.pathname}${window.location.search}`));
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-paper">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
          aria-hidden="true"
        />
      </div>
    );
  }

  return <>{children}</>;
}
