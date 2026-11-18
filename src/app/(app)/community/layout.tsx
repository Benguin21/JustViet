import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CommunityShell } from "@/components/community/CommunityShell";

// Community pages render only in the browser after sign-in, so nothing reaches signed-out
// visitors or link previews; this keeps any crawler that gets this far from indexing them
// (robots.ts also disallows /community).
export const metadata: Metadata = {
  title: "Community",
  robots: { index: false, follow: false, nocache: true },
};

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <CommunityShell>{children}</CommunityShell>;
}
