import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/**
 * The public website: landing page, privacy policy and terms. Rendered on
 * the server and visible without signing in (unlike the `(app)` group).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-paper">
      <a
        href="#main"
        className="sr-only z-50 rounded-xl bg-surface px-4 py-2 font-bold text-ink-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-4 focus:ring-yellow-200"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
