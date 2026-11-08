"use client";

import { GoalsForm } from "@/components/goals/GoalsForm";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useGoalSettings } from "@/lib/companion/useGoalSettings";

/** Goals: each daily goal's switch and target, saved to the learner's account. */
export default function GoalsPage() {
  const { user } = useAuth();
  const { data, error, retry, save } = useGoalSettings();

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
        <span className="sr-only">Loading your goals…</span>
      </main>
    );
  }

  return <GoalsForm key={user.uid} saved={data.saved} locked={data.locked} onSave={save} />;
}
