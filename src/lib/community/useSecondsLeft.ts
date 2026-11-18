"use client";

import { useSyncExternalStore } from "react";

/*
 * A once-a-second clock for the "Please wait N seconds" countdowns
 * (useNow() only ticks once a minute). Same contract as useNow: the
 * snapshot is a cached value that only changes when the timer fires, and
 * the timer only runs while something is subscribed.
 */
let cached = typeof window === "undefined" ? 0 : Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  cached = Date.now();
  for (const l of listeners) l();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (!timer) {
    timer = setInterval(tick, 1000);
    // Catch up straight away: the cached time may be from a while ago.
    queueMicrotask(tick);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => cached;

/** Whole seconds until `untilMs` (0 once it has passed, or when null). */
export function useSecondsLeft(untilMs: number | null): number {
  const now = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (untilMs == null) return 0;
  return Math.max(0, Math.ceil((untilMs - now) / 1000));
}
