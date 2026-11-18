"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TextField } from "@/components/ui/TextField";
import { refreshUser, resendVerificationEmail, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";
import { DEFAULT_AVATAR_COLOR } from "@/lib/community/avatar";
import { useCommunity } from "@/lib/community/CommunityProvider";
import { NAME_MAX, cleanName, nameProblem, suggestName } from "@/lib/community/names";
import { Avatar } from "./Avatar";
import { ColorPicker } from "./ColorPicker";

function Card({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 rounded-3xl border-2 border-ink-300/30 bg-surface p-6 shadow-[0_6px_0_rgba(74,47,34,0.06)] sm:p-8">
        <span className="text-5xl" aria-hidden="true">
          {icon}
        </span>
        <h1 className="font-heading text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <main className="flex flex-1 items-center justify-center py-16" aria-busy="true">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500" aria-hidden="true" />
      <span className="sr-only">Loading Community…</span>
    </main>
  );
}

/**
 * Community needs, in order: a verified email, the 13+ answer, and a
 * community profile. Each step has its own screen; members see the page.
 * (The rules check the same three things on every read and write.)
 */
export function CommunityGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useCommunity();
  switch (status) {
    case "loading":
      return <Spinner />;
    case "error":
      return (
        <Card icon="😕" title="Community didn't load">
          <p className="text-ink-700">{error}</p>
          <Button onClick={retry}>Try again</Button>
        </Card>
      );
    case "unverified":
      return <VerifyFirst />;
    case "ask-age":
      return <AgeQuestion />;
    case "under13":
      return (
        <Card icon="🌱" title="Community isn't available yet">
          <p className="text-ink-700">
            The Community is for members 13 and older, so it isn&apos;t available on your account. Everything else in
            JustViet works as usual: keep studying with your flashcards, dictionary and Rồng Con!
          </p>
          <p className="text-sm text-ink-500">
            If this was a mistake, a parent or guardian can{" "}
            <Link href="/privacy#contact" className="font-bold text-red-600 underline-offset-2 hover:underline">
              contact us
            </Link>
            .
          </p>
          <ButtonLink href="/home" variant="outline" fullWidth>
            Back to Home
          </ButtonLink>
        </Card>
      );
    case "join":
      return <JoinForm />;
    case "member":
      return <>{children}</>;
  }
}

function VerifyFirst() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setMessage(null);
    try {
      await resendVerificationEmail();
      setState("sent");
    } catch (err) {
      setState("idle");
      setMessage(friendlyAuthError(err, "settings"));
    }
  }
  async function check() {
    setState("checking");
    setMessage(null);
    try {
      await refreshUser();
      setMessage("Not verified yet. Open the link in the email, then try again.");
    } catch (err) {
      setMessage(friendlyAuthError(err, "settings"));
    } finally {
      setState("idle");
    }
  }

  return (
    <Card icon="✉️" title="Verify your email to join the Community">
      <p className="text-ink-700">
        To keep the Community friendly and free of spam, members need a verified email address. Check your inbox for
        the link we sent when you signed up. Everything else in JustViet works without it.
      </p>
      {state === "sent" && (
        <p role="status" className="rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success-dark">
          We sent a new link. Check your inbox (and spam folder).
        </p>
      )}
      {message && <p role="status" className="text-sm font-semibold text-ink-700">{message}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={resend} loading={state === "sending"}>
          Resend email
        </Button>
        <Button onClick={check} loading={state === "checking"}>
          I&apos;ve verified
        </Button>
      </div>
    </Card>
  );
}

function AgeQuestion() {
  const { answerAge } = useCommunity();
  const [saving, setSaving] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(over13: boolean) {
    setSaving(over13);
    setError(null);
    try {
      await answerAge(over13);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Please try again.");
      setSaving(null);
    }
  }

  return (
    <Card icon="👋" title="Welcome to the Community">
      <p className="text-lg font-bold text-ink-900">Community is for members 13 and older.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => answer(true)} loading={saving === true} disabled={saving !== null}>
          I&apos;m 13 or older
        </Button>
        <Button variant="outline" onClick={() => answer(false)} loading={saving === false} disabled={saving !== null}>
          I&apos;m under 13
        </Button>
      </div>
      <p className="text-sm text-ink-500">Your answer is saved to your account and can&apos;t be changed in the app.</p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </Card>
  );
}

function JoinForm() {
  const { user } = useAuth();
  const { join } = useCommunity();
  const [name, setName] = useState(() => suggestName(user?.displayName));
  const [color, setColor] = useState<string>(DEFAULT_AVATAR_COLOR);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = nameProblem(name);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (problem) return;
    setSaving(true);
    setError(null);
    try {
      await join(name, color);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Please try again.");
      setSaving(false);
    }
  }

  const shown = cleanName(name) || "?";
  return (
    <Card icon="💬" title="Choose your community name">
      <p className="text-ink-700">
        This is how other members will see you. Pick something friendly; you can change it once every 30 days. Your
        email address is never shown in the Community.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
          <Avatar name={shown} color={color} size="md" />
          <span className="min-w-0 truncate font-bold text-ink-900">{shown}</span>
        </div>
        <TextField
          label="Community name"
          value={name}
          maxLength={NAME_MAX + 10}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && problem ? problem : undefined}
          {...(touched && problem ? {} : { "aria-describedby": "name-help" })}
        />
        <p id="name-help" className="-mt-3 text-xs font-semibold text-ink-500">
          3–30 characters: letters (Vietnamese accents welcome), numbers, spaces and . _ -
        </p>
        <ColorPicker value={color} onChange={setColor} />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button type="submit" loading={saving}>
          Join the Community
        </Button>
      </form>
    </Card>
  );
}
