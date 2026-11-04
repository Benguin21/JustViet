"use client";

import { useCallback } from "react";
import { HomeCompanion } from "@/components/companion/HomeCompanion";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { useCompanionData } from "@/lib/companion/useCompanionData";
import { useToast } from "@/lib/useToast";

/** Home: today's goals, Rồng Con the dragon companion, and the way into every section. */
export default function HomePage() {
  const { user } = useAuth();
  const { message, showToast } = useToast(5000);
  const onSaveError = useCallback(
    (msg: string) => showToast(`Couldn’t save Rồng Con’s progress. ${msg}`),
    [showToast],
  );
  const { data, error, retry, saveLedger, markProfile } = useCompanionData(onSaveError);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="max-w-sm text-center text-sm font-semibold text-red-600">{error}</p>
        <Button fullWidth={false} onClick={retry}>
          Try again
        </Button>
      </main>
    );
  }

  if (!data || !user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
          aria-hidden="true"
        />
        <span className="sr-only">Loading Rồng Con…</span>
      </main>
    );
  }

  return (
    <>
      <HomeCompanion
        key={user.uid}
        userId={user.uid}
        settings={data.goalSettings}
        progress={data.progress}
        progressDay={data.progressDay}
        savedLedger={data.savedLedger}
        profile={data.profile}
        onSaveLedger={saveLedger}
        onMarkProfile={markProfile}
      />
      {message && <Toast message={message} />}
    </>
  );
}
