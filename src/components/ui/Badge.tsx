type Tone = "gray" | "yellow" | "red" | "green" | "blue";

const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-ink-300/20 text-ink-700",
  yellow: "bg-yellow-100 text-yellow-600",
  red: "bg-red-100 text-red-600",
  green: "bg-success/15 text-success-dark",
  blue: "bg-sky-100 text-sky-700",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
