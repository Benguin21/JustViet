export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-xl">
        <span aria-hidden="true">⭐</span>
      </span>
      <span className="font-heading text-3xl font-extrabold tracking-tight text-ink-900">
        Just<span className="text-red-500">Viet</span>
      </span>
    </div>
  );
}
