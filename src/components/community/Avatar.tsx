import { avatarClass, initialsFor } from "@/lib/community/avatar";

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

/** Initials on the member's chosen colour. Decorative: the name is always shown next to it. */
export function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`font-heading inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${SIZES[size]} ${avatarClass(color)}`}
    >
      {initialsFor(name)}
    </span>
  );
}

/** A grey placeholder for deleted authors and profiles that haven't loaded. */
export function BlankAvatar({ size = "md" }: { size?: keyof typeof SIZES }) {
  return <span aria-hidden="true" className={`inline-flex shrink-0 rounded-full bg-ink-300/40 ${SIZES[size]}`} />;
}
