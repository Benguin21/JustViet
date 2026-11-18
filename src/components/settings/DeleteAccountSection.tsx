"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { deleteMyData, STEP_LABELS, type DeletionProgress } from "@/lib/account/deleteAccount";
import { deleteSignInAccount, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";
import { friendlyCommunityError } from "@/lib/community/errors";
import { FormMessage, SettingsSection } from "./SettingsSection";
import { ReauthCancelled } from "./useReauth";

const CONFIRM_WORD = "DELETE";

/**
 * "Delete my account": deletes everything the app can (Community posts,
 * votes and profile, learning data), then the sign-in account. The XP
 * records and the 13+ answer, which the database protects, are purged by
 * us within 30 days (scripts/purge-deleted-accounts.mts). Safe to retry if
 * it's interrupted.
 */
export function DeleteAccountSection({ withRecentLogin }: { withRecentLogin: <T>(action: () => Promise<T>) => Promise<T> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DeletionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyData(user.uid, setProgress);
    } catch (err) {
      setError(`${friendlyCommunityError(err)} Nothing else was deleted; you can try again.`);
      setBusy(false);
      return;
    }
    try {
      setProgress(null);
      await withRecentLogin(() => deleteSignInAccount());
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ReauthCancelled
          ? "Your data was deleted, but your sign-in account wasn't, because you didn't confirm it's you. Try again to finish."
          : `${friendlyAuthError(err, "settings")} Your data was deleted; try again to delete your sign-in account.`,
      );
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      title="Delete my account"
      description="Permanently delete your JustViet account and data. This can't be undone."
    >
      {!open ? (
        <Button variant="danger" fullWidth={false} className="px-6" onClick={() => setOpen(true)}>
          Delete my account…
        </Button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm text-ink-700">
            <p className="font-bold text-ink-900">This deletes, right away:</p>
            <ul className="ml-5 flex list-disc flex-col gap-1">
              <li>Your flashcards, review history, dictionary words, goals and settings, and Rồng Con&apos;s progress.</li>
              <li>
                In the Community: your votes are withdrawn, your posts, answers, comments and replies are deleted (where
                others replied, they stay as &ldquo;deleted by its author&rdquo; with your name and text erased), and
                your profile, name and notifications are deleted.
              </li>
              <li>Your sign-in account, last. Firebase may ask you to confirm it&apos;s you.</li>
            </ul>
            <p>
              Your XP records and your Community age answer are protected from changes in the app, so we delete them
              ourselves within 30 days. Reports you sent are kept to keep the Community safe.
            </p>
          </div>
          <TextField
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
          {progress && (
            <p role="status" className="text-sm font-semibold text-ink-700">
              {STEP_LABELS[progress.step]}
              {progress.total > 1 ? `: ${progress.done} of ${progress.total}` : ""}…
            </p>
          )}
          {busy && !progress && <p role="status" className="text-sm font-semibold text-ink-700">Deleting your sign-in account…</p>}
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              fullWidth={false}
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth={false} loading={busy} disabled={typed.trim() !== CONFIRM_WORD} onClick={run}>
              Delete everything
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
