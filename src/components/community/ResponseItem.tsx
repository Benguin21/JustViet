"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { RateLimitError } from "@/lib/community/errors";
import { deletedResponseText, responseDeleteMode } from "@/lib/community/posts";
import type * as repo from "@/lib/community/repository";
import type { Post, ReportTarget, Response, VoteValue } from "@/lib/community/types";
import { MemberLine } from "./MemberLine";
import { ModRemoveDialog, RemovedNotice } from "./Moderation";
import { ResponseComposer } from "./ResponseComposer";
import { RichText } from "./RichText";
import { RichTextEditor } from "./RichTextEditor";
import { VoteControls } from "./VoteControls";
import { REPLY_MAX, RESPONSE_MAX, pleaseWait } from "@/lib/community/limits";

export const actionClass =
  "rounded-lg px-2 py-1 text-sm font-bold text-ink-500 hover:bg-yellow-50 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:opacity-50";

export interface ThreadActions {
  vote: (item: { post: string; response: string | null }, clicked: 1 | -1) => Promise<void>;
  respond: (id: string, input: repo.ResponseInput) => Promise<unknown>;
  editResponse: (r: Response, body: string) => Promise<void>;
  deleteResponse: (r: Response) => Promise<void>;
  accept: (responseId: string | null) => Promise<void>;
  report: (target: ReportTarget, authorUid: string | null) => void;
  /** Moderators only. */
  remove: (item: { post: string; response: string | null }, reason: string) => Promise<void>;
  restore: (item: { post: string; response: string | null }) => Promise<void>;
  /** Wraps a contribution so the guidelines are accepted first. */
  requireGuidelines: (then: () => void) => void;
}

/** "Hidden: from someone you blocked" with a Show button. */
function Collapsed({ onShow }: { onShow: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-dashed border-ink-300/40 bg-paper px-3 py-2 text-sm font-semibold text-ink-500">
      Hidden: from someone you blocked
      <button type="button" onClick={onShow} className={actionClass}>
        Show
      </button>
    </div>
  );
}

/** One response or reply's text, its edit form, and its actions. */
function Entry({
  post,
  r,
  actions,
  onReply,
  extraActions,
}: {
  post: Post;
  r: Response;
  actions: ThreadActions;
  onReply: () => void;
  extraActions?: React.ReactNode;
}) {
  const { uid, profiles, blocked, block, isModerator } = useCommunity();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [draft, setDraft] = useState(r.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const mine = Boolean(uid) && r.author === uid;
  const isReply = r.parent != null;
  const author = profiles[r.author];
  const noun = isReply ? "reply" : post.type === "question" ? "answer" : "comment";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof RateLimitError ? pleaseWait(err.seconds) : err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (r.removed) {
    return (
      <RemovedNotice
        item={{ post: post.id, response: r.id }}
        author={r.author}
        noun={noun}
        onRestore={() => actions.restore({ post: post.id, response: r.id })}
      />
    );
  }
  if (r.deleted) {
    return <p className="text-sm font-semibold text-ink-500 italic">{deletedResponseText(post.type)}</p>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MemberLine uid={r.author} profile={author} createdAt={r.createdAt} editedAt={r.editedAt} />
      {editing ? (
        <div className="flex flex-col gap-2">
          <RichTextEditor label={`Edit your ${noun}`} value={draft} onChange={setDraft} max={isReply ? REPLY_MAX : RESPONSE_MAX} rows={isReply ? 3 : 6} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" fullWidth={false} onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              fullWidth={false}
              loading={busy}
              onClick={() =>
                run(async () => {
                  await actions.editResponse(r, draft);
                  setEditing(false);
                })
              }
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <RichText text={r.body} />
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      {!editing && (
        <div className="-ml-2 flex flex-wrap items-center gap-0.5">
          {!post.deleted && (
            <button type="button" className={actionClass} onClick={() => actions.requireGuidelines(onReply)}>
              Reply
            </button>
          )}
          {extraActions}
          {mine ? (
            <>
              <button
                type="button"
                className={actionClass}
                onClick={() => {
                  setDraft(r.body);
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button type="button" className={actionClass} onClick={() => setConfirm(true)}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" className={actionClass} onClick={() => actions.report({ kind: isReply ? "reply" : "response", post: post.id, response: r.id }, r.author)}>
                Report
              </button>
              {author && !blocked.has(r.author) && (
                <button type="button" className={actionClass} disabled={busy} onClick={() => run(() => block(r.author))}>
                  Block
                </button>
              )}
              {isModerator && (
                <button type="button" className={`${actionClass} text-red-600`} onClick={() => setRemoving(true)}>
                  Remove
                </button>
              )}
            </>
          )}
        </div>
      )}
      {removing && (
        <ModRemoveDialog
          noun={noun}
          onClose={() => setRemoving(false)}
          onConfirm={(reason) => actions.remove({ post: post.id, response: r.id }, reason)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={`Delete your ${noun}?`}
          description={
            (isReply ? "" : `Votes on it will stop counting toward your Community XP. `) +
            (responseDeleteMode(r) === "erase"
              ? `Because it has replies, it will show as "${deletedResponseText(post.type)}" and the replies will stay. `
              : "") +
            "This can't be undone."
          }
          confirmLabel="Delete"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            run(() => actions.deleteResponse(r));
          }}
        />
      )}
    </div>
  );
}

/** A top-level answer or comment, with its votes, labels, replies and reply box. */
export function ResponseItem({
  post,
  response,
  replies,
  myVote,
  highestVoted,
  actions,
}: {
  post: Post;
  response: Response;
  replies: Response[];
  myVote: VoteValue;
  highestVoted: boolean;
  actions: ThreadActions;
}) {
  const { uid, profiles, blocked } = useCommunity();
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<{ uid: string; name: string } | null | undefined>(undefined);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const accepted = post.type === "question" && post.accepted === response.id;
  const isAsker = Boolean(uid) && post.author === uid;
  const noun = post.type === "question" ? "answer" : "comment";
  const show = (id: string) => setReveal((s) => new Set(s).add(id));
  // Replies deleted by their authors are gone; removed ones stay as "removed by a moderator".
  const visibleReplies = replies.filter((r) => !r.deleted || r.removed);

  if (response.deleted && !response.removed && visibleReplies.length === 0) return null;

  async function vote(clicked: 1 | -1) {
    setVoting(true);
    setVoteError(null);
    try {
      await actions.vote({ post: post.id, response: response.id }, clicked);
    } catch (err) {
      setVoteError(err instanceof RateLimitError ? pleaseWait(err.seconds) : err instanceof Error ? err.message : "Couldn't vote.");
    } finally {
      setVoting(false);
    }
  }

  const disabledReason = response.author === uid ? `You can't vote on your own ${noun}.` : undefined;

  return (
    <li id={`r-${response.id}`} className={`scroll-mt-24 rounded-2xl border-2 bg-surface p-4 ${accepted ? "border-success/50" : "border-ink-300/30"}`}>
      {blocked.has(response.author) && !reveal.has(response.id) ? (
        <Collapsed onShow={() => show(response.id)} />
      ) : (
        <div className="flex gap-3">
          {!response.deleted && (
            <div className="flex flex-col items-center gap-1">
              <VoteControls score={response.score} value={myVote} busy={voting} disabledReason={disabledReason} onVote={vote} label={`this ${noun}`} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {(accepted || highestVoted) && (
              <div className="flex flex-wrap gap-1.5">
                {accepted && <Badge tone="green">✓ Accepted by the asker</Badge>}
                {highestVoted && <Badge tone="blue">Highest voted</Badge>}
              </div>
            )}
            <Entry
              post={post}
              r={response}
              actions={actions}
              onReply={() => setReplyTo(null)}
              extraActions={
                isAsker && post.type === "question" && !post.deleted && !response.deleted ? (
                  <button
                    type="button"
                    className={actionClass}
                    disabled={accepting}
                    aria-pressed={accepted}
                    onClick={async () => {
                      setAccepting(true);
                      try {
                        await actions.accept(accepted ? null : response.id);
                      } catch (err) {
                        setVoteError(err instanceof Error ? err.message : "Couldn't change that.");
                      } finally {
                        setAccepting(false);
                      }
                    }}
                  >
                    {accepted ? "Remove acceptance" : "Accept answer"}
                  </button>
                ) : null
              }
            />
            {voteError && (
              <p role="alert" className="text-sm font-semibold text-red-600">
                {voteError}
              </p>
            )}
          </div>
        </div>
      )}

      {(visibleReplies.length > 0 || replyTo !== undefined) && (
        <ul className="mt-3 flex flex-col gap-3 border-l-4 border-yellow-200 pl-3 sm:ml-12">
          {visibleReplies.map((reply) => (
            <li key={reply.id} id={`r-${reply.id}`} className="scroll-mt-24">
              {blocked.has(reply.author) && !reveal.has(reply.id) ? (
                <Collapsed onShow={() => show(reply.id)} />
              ) : (
                <Entry
                  post={post}
                  r={reply}
                  actions={actions}
                  onReply={() => {
                    const p = profiles[reply.author];
                    setReplyTo(p && reply.author !== uid ? { uid: reply.author, name: p.name } : null);
                  }}
                />
              )}
            </li>
          ))}
          {replyTo !== undefined && !post.deleted && !response.deleted && (
            <li>
              <ResponseComposer
                key={replyTo?.uid ?? "top"}
                postId={post.id}
                parent={response.id}
                mention={replyTo}
                label="Your reply"
                submitLabel="Reply"
                onSubmit={actions.respond}
                onCancel={() => setReplyTo(undefined)}
                autoFocus
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
