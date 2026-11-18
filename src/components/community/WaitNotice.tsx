"use client";

import { pleaseWait } from "@/lib/community/limits";
import { useSecondsLeft } from "@/lib/community/useSecondsLeft";

/** "Please wait N seconds." counting down; renders nothing once the wait is over. */
export function WaitNotice({ until, what }: { until: number | null; what?: string }) {
  const seconds = useSecondsLeft(until);
  if (seconds <= 0) return null;
  return (
    <p role="status" className="rounded-xl bg-yellow-50 px-3 py-2 text-sm font-semibold text-ink-700">
      {pleaseWait(seconds)}
      {what ? ` ${what}` : ""}
    </p>
  );
}
