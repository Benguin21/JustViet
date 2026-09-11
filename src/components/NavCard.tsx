import Link from "next/link";

type NavCardProps = {
  href: string;
  icon: string;
  label: string;
  description: string;
  tone: "red" | "yellow";
};

const TONE_CLASSES = {
  red: "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100",
  yellow: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-100",
} as const;

export function NavCard({ href, icon, label, description, tone }: NavCardProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-start gap-3 rounded-3xl border-2 p-6 shadow-[0_4px_0_rgba(74,47,34,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(74,47,34,0.08)] ${TONE_CLASSES[tone]}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <span className="font-heading text-xl font-extrabold text-ink-900">
        {label}
      </span>
      <span className="text-sm font-semibold text-ink-500">{description}</span>
    </Link>
  );
}
