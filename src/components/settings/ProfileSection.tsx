"use client";

import { useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { FormMessage, SettingsSection } from "@/components/settings/SettingsSection";
import { updateDisplayName, useAuth } from "@/lib/auth-context";
import { friendlyAuthError } from "@/lib/auth-errors";

const MAX_NAME = 50;

export function ProfileSection() {
  const { user } = useAuth();
  const current = user?.displayName ?? "";
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaved(false);
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name.");
    if (trimmed.length > MAX_NAME) return setError(`Use at most ${MAX_NAME} characters.`);
    setError(null);
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      setName(trimmed);
      setSaved(true);
    } catch (err) {
      setError(friendlyAuthError(err, "settings"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection title="Your name" description="Shown in the greeting at the top of JustViet.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          maxLength={MAX_NAME + 10}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          error={error ?? undefined}
        />
        {saved && <FormMessage kind="success">Name saved.</FormMessage>}
        <Button type="submit" fullWidth={false} className="self-start px-8" loading={saving} disabled={name.trim() === current}>
          Save Name
        </Button>
      </form>
    </SettingsSection>
  );
}
