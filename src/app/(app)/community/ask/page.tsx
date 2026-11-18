"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GuidelinesList } from "@/components/community/Guidelines";
import { PostForm } from "@/components/community/PostForm";
import { WaitNotice } from "@/components/community/WaitNotice";
import { Button } from "@/components/ui/Button";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { clearDraft, loadDraft, postDraftKey, saveDraft, type PostDraft } from "@/lib/community/drafts";
import { friendlyCommunityError, RateLimitError } from "@/lib/community/errors";
import { POST_INTERVAL_S, waitSeconds } from "@/lib/community/limits";
import * as repo from "@/lib/community/repository";
import { isCategory, isPostType } from "@/lib/community/types";

/** Ask a Question (or switch to Discussion). The draft survives a failed submit or a closed tab. */
export default function AskPage() {
  const router = useRouter();
  const { uid, profile, acceptGuidelines, activity, noteActivity } = useCommunity();
  const [draft, setDraft] = useState<PostDraft>(() => {
    const saved = uid ? loadDraft<PostDraft>(postDraftKey(uid)) : null;
    return saved && typeof saved.id === "string"
      ? { ...saved, type: isPostType(saved.type) ? saved.type : "question", category: isCategory(saved.category) ? saved.category : "" }
      : { id: repo.newId(), type: "question", category: "", title: "", body: "" };
  });
  const restored = Boolean(draft.title || draft.body);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [agreeing, setAgreeing] = useState(false);

  if (!uid || !profile) return null;

  if (profile.guidelinesAt == null) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">Before you post</h1>
        <p className="font-semibold text-ink-700">JustViet&apos;s community is a friendly place to learn. Please agree to these guidelines:</p>
        <div className="rounded-3xl border-2 border-ink-300/30 bg-surface p-5">
          <GuidelinesList />
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            loading={agreeing}
            onClick={async () => {
              setAgreeing(true);
              setError(null);
              try {
                await acceptGuidelines();
              } catch (err) {
                setError(friendlyCommunityError(err));
              } finally {
                setAgreeing(false);
              }
            }}
          >
            I agree
          </Button>
          <Button variant="outline" onClick={() => router.push("/community")}>
            Not now
          </Button>
        </div>
      </main>
    );
  }

  const me = uid;
  function keep(next: Omit<PostDraft, "id">) {
    const d = { ...next, id: draft.id };
    setDraft(d);
    saveDraft(postDraftKey(me), d);
  }

  async function submit(input: Omit<PostDraft, "id">) {
    setError(null);
    const wait = waitSeconds(activity.lastPost, Date.now(), POST_INTERVAL_S);
    if (wait > 0) {
      setWaitUntil(Date.now() + wait * 1000);
      return;
    }
    setSubmitting(true);
    try {
      const { post, duplicate } = await repo.createPost(me, draft.id, input);
      if (!duplicate) noteActivity("post");
      clearDraft(postDraftKey(me));
      router.push(`/community/post?id=${post.id}`);
    } catch (err) {
      if (err instanceof RateLimitError) setWaitUntil(Date.now() + err.seconds * 1000);
      else setError(friendlyCommunityError(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
      <div>
        <Link href="/community" className="rounded text-sm font-bold text-ink-500 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          ← Community
        </Link>
        <h1 className="font-heading mt-2 text-3xl font-extrabold text-ink-900">
          {draft.type === "question" ? "Ask a Question" : "Start a Discussion"}
        </h1>
        {restored && <p className="mt-1 text-sm font-semibold text-ink-500">We kept your unsent draft.</p>}
      </div>
      <PostForm
        initial={draft}
        editing={null}
        onChange={keep}
        onSubmit={submit}
        onCancel={() => router.push("/community")}
        submitting={submitting}
        serverError={error}
        waitNotice={<WaitNotice until={waitUntil} what="You can post once a minute." />}
      />
    </main>
  );
}
