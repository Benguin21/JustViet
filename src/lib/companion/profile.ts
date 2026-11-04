/**
 * What the learner has been through once on Home: the teachers' intro (done or skipped) and
 * Rồng Con's hatching. Whether someone is new is only ever this flag, never worked out from
 * dates, so it follows them to any browser or device. Flags only ever turn on.
 */
export interface CompanionProfile {
  onboarded: boolean;
  hatchSeen: boolean;
}

export function normalizeProfile(raw: unknown): CompanionProfile {
  const o = (raw ?? {}) as Partial<Record<keyof CompanionProfile, unknown>>;
  return { onboarded: o.onboarded === true, hatchSeen: o.hatchSeen === true };
}
