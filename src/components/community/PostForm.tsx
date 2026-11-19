"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { BODY_MAX, BODY_MIN, TITLE_MAX, TITLE_MIN } from "@/lib/community/limits";
import { cleanTitle, validatePost, type PostErrors, type PostInput } from "@/lib/community/posts";
import * as repo from "@/lib/community/repository";
import { rankRelated, relatedTokens } from "@/lib/community/search";
import { CATEGORIES, type Post, type PostType } from "@/lib/community/types";
import { TextEditor } from "./TextEditor";

const TYPE_HELP: Record<PostType, string> = {
  question: "Ask something you'd like answered. The best answer can be accepted.",
  discussion: "Share an explanation, a tip or something you noticed. Replies are comments.",
};

/**
 * The Ask a Question / Start a Discussion form, also used to edit a post.
 * Suggests up to 5 related posts while you write (never blocking posting).
 * `onChange` lets the Ask page keep a draft.
 */
export function PostForm({
  initial,
  editing,
  typeLocked = false,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  serverError,
  waitNotice,
}: {
  initial: PostInput;
  editing: Post | null;
  /** True when the type can't change any more (the post has responses). */
  typeLocked?: boolean;
  onChange?: (input: PostInput) => void;
  onSubmit: (input: PostInput) => void;
  onCancel?: () => void;
  submitting: boolean;
  serverError: string | null;
  waitNotice?: React.ReactNode;
}) {
  const [input, setInput] = useState<PostInput>(initial);
  const [errors, setErrors] = useState<PostErrors>({});
  const [related, setRelated] = useState<{ title: string; posts: Post[] }>({ title: "", posts: [] });
  const typeId = useId();

  function update(patch: Partial<PostInput>) {
    const next = { ...input, ...patch };
    setInput(next);
    onChange?.(next);
    if (Object.keys(errors).length) setErrors(validatePost(next));
  }

  // Related posts: a moment after the title stops changing.
  const title = cleanTitle(input.title);
  useEffect(() => {
    if (editing || relatedTokens(title).length === 0) return;
    let cancelled = false;
    const t = setTimeout(() => {
      repo
        .relatedPostCandidates(relatedTokens(title))
        .then((found) => {
          if (!cancelled) setRelated({ title, posts: rankRelated(found.filter((p) => !p.deleted), title, null) });
        })
        .catch(() => {
          // Suggestions are optional.
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [title, editing]);
  const suggestions = !editing && related.title === title ? related.posts : [];

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validatePost(input);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(input);
  }

  const titleLength = title.length;
  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold tracking-wide text-ink-700 uppercase">Type</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-describedby={`${typeId}-help`}>
          {(["question", "discussion"] as const).map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-b-4 px-3 py-2.5 text-center font-bold focus-within:ring-4 focus-within:ring-yellow-200 ${
                input.type === t ? "border-red-500 bg-red-50 text-ink-900" : "border-ink-300/50 bg-surface text-ink-500 hover:bg-yellow-50"
              } ${typeLocked && input.type !== t ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input type="radio" name="post-type" value={t} checked={input.type === t} disabled={typeLocked && input.type !== t} onChange={() => update({ type: t })} className="sr-only" />
              <span aria-hidden="true">{t === "question" ? "❓" : "💡"}</span>
              {t === "question" ? "Question" : "Discussion"}
            </label>
          ))}
        </div>
        <p id={`${typeId}-help`} className="text-sm text-ink-500">
          {typeLocked ? "The type can't change once a post has responses." : TYPE_HELP[input.type]}
        </p>
      </fieldset>

      <Select label="Category" value={input.category} onChange={(e) => update({ category: e.target.value })} error={errors.category}>
        <option value="" disabled>
          Choose a category
        </option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-1">
        <TextField
          label="Title"
          value={input.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={input.type === "question" ? "e.g. When do I use “được” after a verb?" : "e.g. A trick for remembering the six tones"}
          error={errors.title}
          maxLength={TITLE_MAX + 50}
        />
        <p className={`text-right text-xs font-semibold ${titleLength > TITLE_MAX ? "text-red-600" : "text-ink-500"}`} aria-live="polite">
          {titleLength} / {TITLE_MAX}
          {titleLength > 0 && titleLength < TITLE_MIN ? ` · at least ${TITLE_MIN}` : ""}
        </p>
      </div>

      {suggestions.length > 0 && (
        <aside aria-label="Related posts" className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-bold text-ink-900">Related posts: maybe one already answers this?</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {suggestions.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/community/post?id=${p.id}`}
                  target="_blank"
                  className="rounded text-sm font-bold text-red-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 [overflow-wrap:anywhere]"
                >
                  {p.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </Link>
                <span className="ml-1 text-xs font-semibold text-ink-500">
                  · {p.responses} {p.type === "question" ? (p.responses === 1 ? "answer" : "answers") : p.responses === 1 ? "comment" : "comments"}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <TextEditor
        label="Your post"
        value={input.body}
        onChange={(body) => update({ body })}
        min={BODY_MIN}
        max={BODY_MAX}
        rows={9}
        error={errors.body}
        placeholder={input.type === "question" ? "What have you tried? Include example sentences if you can." : "Share what you know. Examples help!"}
      />

      {waitNotice}
      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="submit" loading={submitting}>
          {editing ? "Save changes" : input.type === "question" ? "Post question" : "Post discussion"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
