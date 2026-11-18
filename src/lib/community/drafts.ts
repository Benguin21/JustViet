/**
 * Unsent drafts in localStorage, so a failed submit or a closed tab doesn't
 * lose what someone wrote. Each draft carries the id its post or response
 * will be created under (chosen once), which is what makes resubmitting
 * safe: the repository won't create a second copy under the same id.
 * Cleared on success. Every access is wrapped, because storage can be
 * missing or blocked (private windows, strict settings).
 */

export interface PostDraft {
  id: string;
  type: "question" | "discussion";
  category: string;
  title: string;
  body: string;
}

export interface ResponseDraft {
  id: string;
  body: string;
}

export const postDraftKey = (uid: string) => `jv-community-draft:${uid}`;
export const responseDraftKey = (uid: string, postId: string, parent: string | null) =>
  `jv-community-reply:${uid}:${postId}:${parent ?? "top"}`;

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}
