"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { useGuidelinesGate } from "@/components/community/Guidelines";
import { MemberLine } from "@/components/community/MemberLine";
import { PostBadges } from "@/components/community/PostCard";
import { PostForm } from "@/components/community/PostForm";
import { ReportDialog } from "@/components/community/ReportDialog";
import { ResponseComposer } from "@/components/community/ResponseComposer";
import { ResponseItem, actionClass, type ThreadActions } from "@/components/community/ResponseItem";
import { RichText } from "@/components/community/RichText";
import { VoteControls } from "@/components/community/VoteControls";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { RateLimitError } from "@/lib/community/errors";
import { pleaseWait } from "@/lib/community/limits";
import { DELETED_POST_TEXT, highestVotedId, orderResponses } from "@/lib/community/posts";
import { usePostThread } from "@/lib/community/usePostThread";
import { VOTE_GUIDANCE } from "@/lib/community/votes";
import { responseNoun, type ReportTarget } from "@/lib/community/types";
import { useToast } from "@/lib/useToast";

export default function PostPage() {
  // useSearchParams needs a Suspense boundary in production builds (static export).
  return (
    <Suspense fallback={<Loading />}>
      <PostPageContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-40 animate-pulse rounded-3xl bg-ink-300/15" />
      <div className="h-24 animate-pulse rounded-2xl bg-ink-300/15" />
      <span className="sr-only">Loading post…</span>
    </main>
  );
}

function PostPageContent() {
  const router = useRouter();
  const postId = useSearchParams().get("id");
  const thread = usePostThread(postId);
  const { uid, profiles, blocked, hidden, hide, unhide, block, unblock } = useCommunity();
  const { accepted: guidelinesAccepted, require, dialog: guidelinesDialog } = useGuidelinesGate();
  const { message: toast, showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [report, setReport] = useState<{ target: ReportTarget; author: string | null } | null>(null);
  const [revealBlocked, setRevealBlocked] = useState(false);
  const [revealHidden, setRevealHidden] = useState(false);
  const [voting, setVoting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { post, responses } = thread;
  const top = useMemo(
    () => (post ? orderResponses(post.type, responses.filter((r) => r.parent == null), post.accepted) : []),
    [post, responses],
  );
  const repliesFor = (id: string) => responses.filter((r) => r.parent === id).sort((a, b) => a.createdAt - b.createdAt);
  const highest = post?.type === "question" ? highestVotedId(responses) : null;

  if (!postId) {
    return <Missing text="No post was chosen." />;
  }
  if (thread.loading) return <Loading />;
  if (thread.error) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
        <p className="font-semibold text-ink-700">{thread.error}</p>
        <Button variant="outline" fullWidth={false} onClick={thread.retry}>
          Try again
        </Button>
      </main>
    );
  }
  if (!post) return <Missing text="This post doesn't exist or was deleted by its author." />;

  const mine = Boolean(uid) && post.author === uid;
  const author = profiles[post.author];
  const myVote = thread.myVotes[""] ?? 0;
  const noun = responseNoun(post.type);
  const authorBlocked = !post.deleted && blocked.has(post.author);
  const isHidden = hidden.has(post.id);

  const actions: ThreadActions = {
    vote: thread.vote,
    respond: async (id, input) => {
      const r = await thread.respond(id, input);
      showToast(input.parent ? "Reply posted" : `${post.type === "question" ? "Answer" : "Comment"} posted`);
      return r;
    },
    editResponse: thread.editResponse,
    deleteResponse: async (r) => {
      await thread.deleteResponse(r);
      showToast("Deleted");
    },
    accept: thread.accept,
    report: (target, a) => setReport({ target, author: a }),
    requireGuidelines: require,
  };

  async function vote(clicked: 1 | -1) {
    setVoting(true);
    setNotice(null);
    try {
      await thread.vote({ post: post!.id, response: null }, clicked);
    } catch (err) {
      setNotice(err instanceof RateLimitError ? pleaseWait(err.seconds) : err instanceof Error ? err.message : "Couldn't vote.");
    } finally {
      setVoting(false);
    }
  }

  async function quick(fn: () => Promise<void>, done: string) {
    setNotice(null);
    try {
      await fn();
      showToast(done);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const content = post.deleted ? (
    <p className="font-semibold text-ink-500 italic">{DELETED_POST_TEXT}</p>
  ) : editing ? (
    <PostForm
      initial={{ type: post.type, category: post.category, title: post.title, body: post.body }}
      editing={post}
      typeLocked={post.responses > 0 || post.erased > 0 || post.accepted != null}
      onSubmit={async (input) => {
        setSaving(true);
        setEditError(null);
        try {
          await thread.editPost(input);
          setEditing(false);
          showToast("Saved");
        } catch (err) {
          setEditError(err instanceof Error ? err.message : "Couldn't save.");
        } finally {
          setSaving(false);
        }
      }}
      onCancel={() => setEditing(false)}
      submitting={saving}
      serverError={editError}
    />
  ) : (
    <>
      <PostBadges post={post} />
      <h1 className="font-heading text-2xl leading-tight font-extrabold text-ink-900 [overflow-wrap:anywhere] sm:text-3xl">{post.title}</h1>
      <MemberLine uid={post.author} profile={author} createdAt={post.createdAt} editedAt={post.editedAt} size="md" />
      <RichText text={post.body} className="mt-1" />
    </>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/community" className="w-fit rounded text-sm font-bold text-ink-500 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
        ← Community
      </Link>

      <article className="rounded-3xl border-2 border-ink-300/30 bg-surface p-4 shadow-[0_4px_0_rgba(74,47,34,0.05)] sm:p-6">
        {isHidden && !revealHidden ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink-500">
            You hid this post.
            <span className="flex gap-1">
              <button type="button" className={actionClass} onClick={() => setRevealHidden(true)}>
                Show it
              </button>
              <button type="button" className={actionClass} onClick={() => quick(() => unhide(post.id), "Post unhidden")}>
                Unhide
              </button>
            </span>
          </div>
        ) : authorBlocked && !revealBlocked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink-500">
            Hidden: from someone you blocked
            <button type="button" className={actionClass} onClick={() => setRevealBlocked(true)}>
              Show
            </button>
          </div>
        ) : (
          <div className="flex gap-3 sm:gap-4">
            {!post.deleted && !editing && (
              <VoteControls
                score={post.score}
                value={myVote}
                busy={voting}
                disabledReason={mine ? "You can't vote on your own post." : undefined}
                onVote={vote}
                label="this post"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {content}
              {!post.deleted && !editing && (
                <div className="-ml-2 flex flex-wrap items-center gap-0.5">
                  {mine ? (
                    <>
                      <button type="button" className={actionClass} onClick={() => setEditing(true)}>
                        Edit
                      </button>
                      <button type="button" className={actionClass} onClick={() => setConfirmDelete(true)}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={actionClass} onClick={() => setReport({ target: { kind: "post", post: post.id }, author: post.author })}>
                        Report
                      </button>
                      {isHidden ? (
                        <button type="button" className={actionClass} onClick={() => quick(() => unhide(post.id), "Post unhidden")}>
                          Unhide
                        </button>
                      ) : (
                        <button type="button" className={actionClass} onClick={() => quick(() => hide(post.id), "Post hidden")}>
                          Hide post
                        </button>
                      )}
                      {author &&
                        (blocked.has(post.author) ? (
                          <button type="button" className={actionClass} onClick={() => quick(() => unblock(post.author), `Unblocked ${author.name}`)}>
                            Unblock {author.name}
                          </button>
                        ) : (
                          <button type="button" className={actionClass} onClick={() => quick(() => block(post.author), `Blocked ${author.name}`)}>
                            Block {author.name}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              )}
              {notice && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {notice}
                </p>
              )}
            </div>
          </div>
        )}
      </article>

      <p className="text-center text-xs font-semibold text-ink-500">{VOTE_GUIDANCE}</p>

      <section aria-labelledby="responses-heading" className="flex flex-col gap-3">
        <h2 id="responses-heading" className="font-heading text-xl font-extrabold text-ink-900">
          {post.responses} {responseNoun(post.type, post.responses)}
        </h2>
        {top.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-5 text-center font-semibold text-ink-500">
            {post.deleted ? `No ${noun}s.` : post.type === "question" ? "No answers yet. Can you help?" : "No comments yet. Start the conversation!"}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {top.map((r) => (
              <ResponseItem
                key={r.id}
                post={post}
                response={r}
                replies={repliesFor(r.id)}
                myVote={thread.myVotes[r.id] ?? 0}
                highestVoted={highest === r.id}
                actions={actions}
              />
            ))}
          </ul>
        )}
      </section>

      {!post.deleted && (
        <section aria-label={post.type === "question" ? "Your answer" : "Your comment"} className="rounded-3xl border-2 border-ink-300/30 bg-surface p-4 sm:p-6">
          {guidelinesAccepted ? (
            <ResponseComposer
              postId={post.id}
              parent={null}
              mention={null}
              label={post.type === "question" ? "Your answer" : "Add a comment"}
              submitLabel={post.type === "question" ? "Post answer" : "Post comment"}
              onSubmit={actions.respond}
            />
          ) : (
            <Button variant="secondary" onClick={() => require(() => {})}>
              {post.type === "question" ? "Write an answer" : "Add a comment"}
            </Button>
          )}
        </section>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete your post?"
          description={
            "Votes on it will stop counting toward your Community XP. " +
            (thread.postDeleteMode === "erase"
              ? `Because it has ${noun}s, its title and text will be erased and it will show as "${DELETED_POST_TEXT}" The ${noun}s will stay. `
              : "") +
            "This can't be undone."
          }
          confirmLabel="Delete post"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false);
            try {
              const mode = await thread.deletePost();
              if (mode === "removed") router.push("/community");
              else showToast("Post deleted");
            } catch (err) {
              setNotice(err instanceof Error ? err.message : "Couldn't delete.");
            }
          }}
        />
      )}
      {report && (
        <ReportDialog
          target={report.target}
          authorUid={report.author}
          authorName={report.author ? (profiles[report.author]?.name ?? null) : null}
          onClose={() => setReport(null)}
        />
      )}
      {guidelinesDialog}
      {toast && <Toast message={toast} />}
    </main>
  );
}

function Missing({ text }: { text: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
      <span className="text-5xl" aria-hidden="true">
        🔍
      </span>
      <p className="font-heading text-xl font-extrabold text-ink-900">{text}</p>
      <Link href="/community" className="font-bold text-red-600 underline-offset-2 hover:underline">
        Back to Community
      </Link>
    </main>
  );
}
