"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { plainText } from "@/lib/community/format";
import { categoryLabel, responseNoun, type CommunityProfile, type Post } from "@/lib/community/types";
import { MemberLine } from "./MemberLine";

/** Shows a "has answers" badge apart from an "accepted answer" one, and "No answers yet" for open questions. */
export function PostBadges({ post }: { post: Post }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={post.type === "question" ? "red" : "yellow"}>{post.type === "question" ? "Question" : "Discussion"}</Badge>
      <Badge tone="gray">{categoryLabel(post.category)}</Badge>
      {post.type === "question" && post.accepted && <Badge tone="green">✓ Accepted answer</Badge>}
      {post.responses > 0 ? (
        <Badge tone="blue">
          {post.responses} {responseNoun(post.type, post.responses)}
        </Badge>
      ) : (
        post.type === "question" && <Badge tone="gray">No answers yet</Badge>
      )}
    </div>
  );
}

export function PostCard({ post, author, blocked }: { post: Post; author: CommunityProfile | undefined; blocked: boolean }) {
  const [reveal, setReveal] = useState(false);
  if (blocked && !reveal) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-dashed border-ink-300/40 bg-paper px-4 py-3 text-sm font-semibold text-ink-500">
        Hidden: from someone you blocked
        <button type="button" onClick={() => setReveal(true)} className="rounded-lg px-2 py-1 font-bold text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200">
          Show
        </button>
      </li>
    );
  }
  const snippet = plainText(post.body).slice(0, 180);
  return (
    <li className="relative flex gap-3 rounded-2xl border-2 border-ink-300/30 bg-surface p-4 shadow-[0_3px_0_rgba(74,47,34,0.05)] focus-within:ring-4 focus-within:ring-yellow-200 hover:border-yellow-300 sm:gap-4">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-paper py-2 text-center" aria-label={`Score ${post.score}`}>
        <span className="font-heading text-xl font-extrabold text-ink-900">{post.score}</span>
        <span className="text-[11px] font-bold text-ink-500 uppercase">{Math.abs(post.score) === 1 ? "vote" : "votes"}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <PostBadges post={post} />
        <h3 className="font-heading text-lg leading-snug font-extrabold text-ink-900 [overflow-wrap:anywhere]">
          <Link href={`/community/post?id=${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
            {post.title}
          </Link>
        </h3>
        {snippet && <p className="line-clamp-2 text-sm text-ink-500 [overflow-wrap:anywhere]">{snippet}</p>}
        <div className="relative z-10">
          <MemberLine uid={post.author} profile={author} createdAt={post.createdAt} editedAt={post.editedAt} />
        </div>
      </div>
    </li>
  );
}
