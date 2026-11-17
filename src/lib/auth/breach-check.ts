/**
 * Checks a password against known data breaches with the Have I Been Pwned
 * "range" API, using k-anonymity: only the first 5 hex characters of the
 * password's SHA-1 hash ever leave the browser, never the password or its
 * full hash. The API returns every breached hash suffix starting with that
 * prefix and the match happens locally. `Add-Padding: true` makes the
 * response size uniform, so even the response length doesn't hint at the
 * password (padding rows come back with a count of 0 and are ignored).
 *
 * Never blocks on failure: if the check can't run (offline, the API is
 * down, a timeout), the result is "unavailable" and callers let the
 * password through — a breach check is a bonus, not a gate on signing up.
 *
 * https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
 */

export const BREACH_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export type BreachCheckResult =
  | { status: "breached"; count: number }
  | { status: "not-found" }
  | { status: "unavailable" };

export interface BreachCheckOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPasswordBreach(
  password: string,
  { fetchImpl = globalThis.fetch, timeoutMs = 5000 }: BreachCheckOptions = {},
): Promise<BreachCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetchImpl(`${BREACH_RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: controller.signal,
    });
    if (!response.ok) return { status: "unavailable" };
    const body = await response.text();
    for (const line of body.split("\n")) {
      const [lineSuffix, countText] = line.trim().split(":");
      if (lineSuffix?.toUpperCase() === suffix) {
        const count = Number.parseInt(countText ?? "0", 10);
        // Padding rows have a count of 0 — they're fake, not a breach.
        return count > 0 ? { status: "breached", count } : { status: "not-found" };
      }
    }
    return { status: "not-found" };
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
