"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/community/Avatar";
import { ColorPicker } from "@/components/community/ColorPicker";
import { CommunityXp } from "@/components/community/CommunityXp";
import { PostCard } from "@/components/community/PostCard";
import { ReportDialog } from "@/components/community/ReportDialog";
import { actionClass } from "@/components/community/ResponseItem";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { RENAME_DAYS } from "@/lib/community/limits";
import { NAME_MAX, cleanName, nameProblem, renameStatus } from "@/lib/community/names";
import { formatDate } from "@/lib/community/posts";
import { useMemberProfile } from "@/lib/community/useMemberProfile";
import { COMMUNITY_XP_EXPLANATION } from "@/lib/community/votes";
import type { CommunityProfile } from "@/lib/community/types";
import { useNow } from "@/lib/useNow";
import { useToast } from "@/lib/useToast";

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const params = useSearchParams();
  const { uid: me, blocked, block, unblock } = useCommunity();
  const uid = params.get("uid") || me;
  const page = useMemberProfile(uid);
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { message: toast, showToast } = useToast();
  const { profile } = page;
  const own = uid === me;

  if (page.loading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6" aria-busy="true">
        <div className="h-40 animate-pulse rounded-3xl bg-ink-300/15" />
      </main>
    );
  }
  if (page.error && !profile) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-3 px-4 py-12 text-center sm:px-6">
        <p className="font-semibold text-ink-700">{page.error}</p>
        <Button variant="outline" fullWidth={false} onClick={page.retry}>
          Try again
        </Button>
      </main>
    );
  }
  if (!profile || !uid) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center sm:px-6">
        <p className="font-heading text-xl font-extrabold text-ink-900">This member wasn&apos;t found.</p>
      </main>
    );
  }

  async function toggleBlock() {
    setNotice(null);
    try {
      if (blocked.has(uid!)) {
        await unblock(uid!);
        showToast(`Unblocked ${profile!.name}`);
      } else {
        await block(uid!);
        showToast(`Blocked ${profile!.name}`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col gap-4 rounded-3xl border-2 border-ink-300/30 bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={profile.name} color={profile.color} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-heading truncate text-3xl font-extrabold text-ink-900">{profile.name}</h1>
          <p className="font-heading text-lg font-extrabold text-ink-700">
            <CommunityXp totals={profile} />
          </p>
          <p className="text-sm text-ink-500">{COMMUNITY_XP_EXPLANATION}</p>
          <p className="text-sm font-semibold text-ink-500">Joined {formatDate(profile.joinedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-1 sm:flex-col sm:items-end">
          {own ? (
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
              Edit profile
            </Button>
          ) : (
            <>
              <button type="button" className={actionClass} onClick={toggleBlock}>
                {blocked.has(uid) ? "Unblock" : "Block"}
              </button>
              <button type="button" className={actionClass} onClick={() => setReporting(true)}>
                Report profile
              </button>
            </>
          )}
        </div>
      </section>
      {notice && <p role="alert" className="text-sm font-semibold text-red-600">{notice}</p>}
      {!own && blocked.has(uid) && (
        <p className="rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700">
          You blocked {profile.name}. Their posts, answers and replies are collapsed for you. Blocking doesn&apos;t stop them seeing
          community content.
        </p>
      )}
      {own && editing && <EditProfile profile={profile} onDone={(msg) => { setEditing(false); if (msg) showToast(msg); }} />}

      <section aria-labelledby="posts-heading" className="flex flex-col gap-3">
        <h2 id="posts-heading" className="font-heading text-xl font-extrabold text-ink-900">
          Posts
        </h2>
        {page.posts.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-ink-300/50 bg-surface p-5 text-center font-semibold text-ink-500">
            {own ? "You haven't posted yet." : `${profile.name} hasn't posted yet.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {page.posts.map((p) => (
              <PostCard key={p.id} post={p} author={profile} blocked={false} />
            ))}
          </ul>
        )}
        {page.error && <p className="text-center text-sm font-semibold text-red-600">{page.error}</p>}
        {page.hasMore && (
          <Button variant="outline" onClick={page.loadMore} loading={page.loadingMore}>
            Load more
          </Button>
        )}
      </section>
      {reporting && <ReportDialog target={{ kind: "profile", uid }} authorUid={uid} authorName={profile.name} onClose={() => setReporting(false)} />}
      {toast && <Toast message={toast} />}
    </main>
  );
}

function EditProfile({ profile, onDone }: { profile: CommunityProfile; onDone: (message?: string) => void }) {
  const { rename, setColor } = useCommunity();
  const now = useNow();
  const [name, setName] = useState(profile.name);
  const [color, setLocalColor] = useState(profile.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = renameStatus(profile.nameChangedAt, now);
  const nameChanged = cleanName(name) !== profile.name;
  const problem = nameChanged ? nameProblem(name) : null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      if (color !== profile.color) await setColor(color);
      if (nameChanged) await rename(name);
      onDone(nameChanged || color !== profile.color ? "Profile saved" : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5 rounded-3xl border-2 border-yellow-200 bg-yellow-50 p-5" noValidate>
      <div className="flex flex-col gap-1">
        <TextField
          label="Community name"
          value={name}
          maxLength={NAME_MAX + 10}
          disabled={!status.allowed}
          onChange={(e) => setName(e.target.value)}
          error={problem ?? undefined}
        />
        <p className="text-xs font-semibold text-ink-500">
          {status.allowed
            ? `You can change your name once every ${RENAME_DAYS} days. Your old name becomes available to others.`
            : `You can change your name again on ${formatDate(status.nextAt!)}.`}
        </p>
      </div>
      <ColorPicker value={color} onChange={setLocalColor} name="edit-avatar-color" />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="submit" loading={saving}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
