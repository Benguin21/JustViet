import type { ReactNode } from "react";

/** A card on the settings page, matching JustViet's raised-card look. */
export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "muted";
}) {
  const headingId = `settings-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-3xl border-2 p-5 shadow-[0_4px_0_rgba(74,47,34,0.06)] sm:p-6 ${
        tone === "muted" ? "border-ink-300/30 bg-paper" : "border-ink-300/30 bg-surface"
      }`}
    >
      <h2 id={headingId} className="font-heading text-xl font-extrabold text-ink-900">
        {title}
      </h2>
      {description && <div className="mt-1 text-sm text-ink-500">{description}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Inline success / error line used across the settings forms. */
export function FormMessage({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return kind === "error" ? (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
      {children}
    </p>
  ) : (
    <p role="status" className="rounded-xl bg-success/10 px-4 py-2 text-sm font-semibold text-success-dark">
      {children}
    </p>
  );
}
