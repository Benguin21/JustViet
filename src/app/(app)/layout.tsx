"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AppHeader } from "@/components/AppHeader";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-1 flex-col bg-paper">
        <AppHeader />
        <VerifyEmailBanner />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </RequireAuth>
  );
}
