"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/home" : "/login");
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
        aria-hidden="true"
      />
    </main>
  );
}
