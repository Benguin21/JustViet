"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmailSection } from "@/components/settings/EmailSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { FormMessage, SettingsSection } from "@/components/settings/SettingsSection";
import { SignInMethodsSection } from "@/components/settings/SignInMethodsSection";
import { useReauth } from "@/components/settings/useReauth";
import { completeGoogleRedirect, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";
import { SITE } from "@/lib/site";

export default function SettingsPage() {
  const { user } = useAuth();
  const { withRecentLogin, dialog } = useReauth();
  const [redirectMessage, setRedirectMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  // If connecting Google fell back to a full-page redirect, finish it here.
  useEffect(() => {
    let cancelled = false;
    completeGoogleRedirect()
      .then((outcome) => {
        if (outcome !== "none" && !cancelled) {
          setRedirectMessage({ kind: "success", text: "Google is connected to your account." });
        }
      })
      .catch((err) => {
        if (!cancelled) setRedirectMessage({ kind: "error", text: friendlyAuthError(err, "link") });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-ink-900">Settings</h1>
        <p className="mt-1 font-semibold text-ink-500">Your JustViet account</p>
      </div>

      {redirectMessage && <FormMessage kind={redirectMessage.kind}>{redirectMessage.text}</FormMessage>}

      {/* Keyed by user so the forms reset if the account changes underneath them. */}
      <ProfileSection key={`profile-${user?.uid}`} />
      <EmailSection key={`email-${user?.uid}`} withRecentLogin={withRecentLogin} />
      <PasswordSection key={`password-${user?.uid}`} />
      <SignInMethodsSection key={`methods-${user?.uid}`} withRecentLogin={withRecentLogin} />

      {/*
        TODO(account-deletion): "Delete my account" lives here. It's built in
        Community Phase 3 (it must also remove community content, votes and
        the XP ledger), so it's only a placeholder for now. See AGENTS.md.
      */}
      <SettingsSection
        title="Delete my account"
        tone="muted"
        description={`Permanently deleting your account and data is coming soon. Until then, email ${SITE.contactEmail} from your account's address and we'll remove it.`}
      >
        <Button variant="danger" fullWidth={false} className="px-6" disabled>
          Delete Account (coming soon)
        </Button>
      </SettingsSection>

      <p className="text-center text-sm text-ink-500">
        <Link href="/privacy" className="font-semibold hover:text-red-500">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" className="font-semibold hover:text-red-500">
          Terms of Service
        </Link>
        {" · "}
        <a href={`mailto:${SITE.contactEmail}`} className="font-semibold hover:text-red-500">
          Contact us
        </a>
      </p>

      {dialog}
    </main>
  );
}
