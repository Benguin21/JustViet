"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GUIDELINES } from "@/lib/community/guidelines";
import { useCommunity } from "@/lib/community/CommunityProvider";

export function GuidelinesList() {
  return (
    <ol className="flex flex-col gap-3">
      {GUIDELINES.map((g, i) => (
        <li key={g.title} className="flex gap-3">
          <span className="font-heading flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-extrabold text-yellow-600">
            {i + 1}
          </span>
          <span>
            <span className="font-bold text-ink-900">{g.title}.</span> <span className="text-ink-700">{g.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Just the guidelines, for the "Guidelines" link. */
export function GuidelinesDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Community guidelines" onClose={onClose}>
      <GuidelinesList />
      <p className="mt-4 text-sm text-ink-500">
        Reports are reviewed by the JustViet team. Content isn&apos;t removed automatically, and low scores never hide anything.
      </p>
      <div className="mt-5">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Before a member's first post, answer, comment or reply: the guidelines and
 * "I agree". Their acceptance is saved on their profile, and the rules
 * refuse contributions until it is.
 */
export function useGuidelinesGate() {
  const { profile, acceptGuidelines } = useCommunity();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepted = profile?.guidelinesAt != null;

  /** Runs `then` now if the guidelines were accepted, otherwise after the member accepts them. */
  function require(then: () => void) {
    if (accepted) then();
    else setPending(() => then);
  }

  async function agree() {
    setSaving(true);
    setError(null);
    try {
      await acceptGuidelines();
      const next = pending;
      setPending(null);
      next?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const dialog = pending ? (
    <Modal title="Before you post" onClose={() => setPending(null)}>
      <p className="mb-4 font-semibold text-ink-700">JustViet&apos;s community is a friendly place to learn. Please agree to these guidelines:</p>
      <GuidelinesList />
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={() => setPending(null)}>
          Not now
        </Button>
        <Button onClick={agree} loading={saving}>
          I agree
        </Button>
      </div>
    </Modal>
  ) : null;

  return { accepted, require, dialog };
}
