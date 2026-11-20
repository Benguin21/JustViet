"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * What a signed-in page shows if it crashes while rendering, instead of the browser's blank
 * "Application error" screen. The header (from the (app) layout) stays, so the learner can still
 * get Home or to Settings. "Try again" re-renders the page; nothing is lost, since every change is
 * saved as it happens.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">
        🐉
      </span>
      <h1 className="font-heading text-2xl font-extrabold text-ink-900">Oops, this page hit a snag.</h1>
      <p className="max-w-sm font-semibold text-ink-500">
        Your progress is saved. Try again, or head back Home and come back in a moment.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button fullWidth={false} className="px-8" onClick={() => retry()}>
          Try again
        </Button>
        <ButtonLink href="/home" variant="outline" fullWidth={false} className="px-8">
          Go Home
        </ButtonLink>
      </div>
    </main>
  );
}
