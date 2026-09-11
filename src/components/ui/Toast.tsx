"use client";

/** A small, auto-dismissing success notification, fixed to the bottom of the screen. */
export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white shadow-lg"
    >
      {message}
    </div>
  );
}
