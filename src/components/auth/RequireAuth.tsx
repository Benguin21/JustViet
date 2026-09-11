"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Client-side route guard: redirects to /login when there's no signed-in
 * user, and renders nothing until we know either way (avoids a flash of
 * protected content).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
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
