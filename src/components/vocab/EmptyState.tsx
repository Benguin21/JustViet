import { Button } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink-300/40 px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">
        📇
      </span>
      <h3 className="font-heading text-xl font-extrabold text-ink-900">{title}</h3>
      <p className="max-w-sm font-semibold text-ink-500">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} fullWidth={false} className="mt-2 px-8">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
