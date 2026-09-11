"use client";

import { useSyncExternalStore } from "react";

/**
 * Reading `Date.now()` directly during render is impure (React's
 * react-hooks/purity rule flags it), so `useSyncExternalStore` is the
 * React-sanctioned way to read external mutable state like the clock
 * during render.
 *
 * Important: `getSnapshot` must return the *same* value between renders
 * unless the store actually changed and `subscribe`'s callback fired —
 * calling `Date.now()` directly inside `getSnapshot` breaks that contract
 * (every call returns a different value, so React sees "torn" state and
 * re-renders in a loop). Instead we cache the time and only update the
 * cache on a timer tick.
 */
let cachedNow = Date.now();
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  setInterval(() => {
    cachedNow = Date.now();
    for (const listener of listeners) listener();
  }, 60_000);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return cachedNow;
}

/** Returns the current time in ms, refreshed roughly every minute. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
