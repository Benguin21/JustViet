/**
 * "Return to the page you started on": RequireAuth sends signed-out
 * visitors to `/login?next=<path>`, and after signing in they go back
 * there. The `next` value comes from the URL, so it's untrusted — anything
 * that isn't a plain path on this site falls back to /home, which is what
 * stops `/login?next=https://evil.example` (an open redirect) from working.
 */

export const DEFAULT_AFTER_LOGIN = "/home";

const ORIGIN = "https://justviet.invalid";

/** Pages that make no sense to "return" to after signing in. */
const EXCLUDED_PREFIXES = ["/login", "/auth/"];

/**
 * Returns `raw` if it's a safe same-site path (starts with exactly one "/",
 * no backslashes or control characters, not the login page itself);
 * otherwise `fallback`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2000) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== ORIGIN) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (EXCLUDED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p.endsWith("/") ? p : `${p}/`))) {
    return fallback;
  }
  return path;
}

/** The login URL that will bring the user back to `path` afterwards. */
export function loginPathFor(path: string | null | undefined): string {
  const next = safeNextPath(path, "");
  return next && next !== DEFAULT_AFTER_LOGIN ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
