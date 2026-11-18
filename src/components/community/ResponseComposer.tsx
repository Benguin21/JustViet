"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { clearDraft, loadDraft, responseDraftKey, saveDraft, type ResponseDraft } from "@/lib/community/drafts";
import { friendlyCommunityError, RateLimitError } from "@/lib/community/errors";
import { REPLY_MAX, RESPONSE_INTERVAL_S, RESPONSE_MAX, linkProblem, waitSeconds } from "@/lib/community/limits";
import { mentionPrefix, validateResponse } from "@/lib/community/posts";
import * as repo from "@/lib/community/repository";
import { RichTextEditor } from "./RichTextEditor";
import { WaitNotice } from "./WaitNotice";

/**
 * Writes an answer/comment (parent null) or a reply. Keeps an unsent draft
 * (with the id it will be saved under) in local storage until it posts.
 * A reply to a reply starts with "@Name ".
 */
export function ResponseComposer({
  postId,
  parent,
  mention,
  label,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
}: {
  postId: string;
  parent: string | null;
  mention: { uid: string; name: string } | null;
  label: string;
  submitLabel: string;
  onSubmit: (id: string, input: repo.ResponseInput) => Promise<unknown>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const { uid, activity, profile } = useCommunity();
  const key = uid ? responseDraftKey(uid, postId, parent) : null;
  const [draft, setDraft] = useState<ResponseDraft>(() => {
    const saved = key ? loadDraft<ResponseDraft>(key) : null;
    const prefix = mention ? mentionPrefix(mention.name) : "";
    if (saved && typeof saved.id === "string" && typeof saved.body === "string") {
      return { ...saved, body: prefix && !saved.body.startsWith(prefix) ? prefix + saved.body : saved.body };
    }
    return { id: repo.newId(), body: prefix };
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const isReply = parent != null;

  function change(body: string) {
    const d = { ...draft, body };
    setDraft(d);
    setError(null);
    if (key) saveDraft(key, d);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem =
      validateResponse(draft.body, isReply) ?? (profile ? linkProblem(draft.body, profile.joinedAt, Date.now()) : null);
    if (problem) {
      setError(problem);
      return;
    }
    const wait = waitSeconds(activity.lastResponse, Date.now(), RESPONSE_INTERVAL_S);
    if (wait > 0) {
      setWaitUntil(Date.now() + wait * 1000);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft.id, { body: draft.body, parent, mention: mention?.uid ?? null });
      if (key) clearDraft(key);
      setDraft({ id: repo.newId(), body: "" });
      onCancel?.();
    } catch (err) {
      if (err instanceof RateLimitError) setWaitUntil(Date.now() + err.seconds * 1000);
      else setError(err instanceof Error ? err.message : friendlyCommunityError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <RichTextEditor
        label={label}
        value={draft.body}
        onChange={change}
        max={isReply ? REPLY_MAX : RESPONSE_MAX}
        rows={isReply ? 3 : 6}
        error={error ?? undefined}
        autoFocus={autoFocus}
        hideLabel={isReply}
      />
      <WaitNotice until={waitUntil} what="You can respond once every 15 seconds." />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" fullWidth={false} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size={isReply ? "sm" : "md"} fullWidth={false} loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
