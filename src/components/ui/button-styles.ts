/**
 * The raised, Duolingo-style button look, shared by `Button` (a real
 * <button>) and `ButtonLink` (a link that looks like one). Kept in a plain
 * module — not a "use client" file — so server components such as the
 * marketing pages can use it too.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "md" | "sm" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-red-500 border-red-700 text-white hover:bg-red-400 active:bg-red-500",
  secondary: "bg-yellow-400 border-yellow-600 text-ink-900 hover:bg-yellow-300 active:bg-yellow-400",
  outline: "bg-surface border-ink-300 text-ink-700 hover:bg-yellow-50 active:bg-yellow-50",
  ghost: "bg-transparent border-transparent text-ink-500 hover:bg-yellow-50 hover:text-ink-900 shadow-none",
  danger: "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 active:bg-red-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: "rounded-2xl border-b-4 px-8 py-4 text-lg active:border-b-2",
  md: "rounded-2xl border-b-4 px-6 py-3 text-base active:border-b-2",
  sm: "rounded-xl border-b-2 px-3 py-1.5 text-sm active:border-b",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = true,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return `font-heading inline-flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-all duration-100 active:translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`;
}
