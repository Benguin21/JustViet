"use client";

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-red-500 border-red-700 text-white hover:bg-red-400 active:bg-red-500",
  secondary:
    "bg-yellow-400 border-yellow-600 text-ink-900 hover:bg-yellow-300 active:bg-yellow-400",
  outline:
    "bg-surface border-ink-300 text-ink-700 hover:bg-yellow-50 active:bg-yellow-50",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

/**
 * A chunky, Duolingo-style "raised" button: a solid top face with a darker
 * bottom border that flattens on press to fake a 3D click.
 */
export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-heading inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 px-6 py-3 text-base font-bold tracking-wide uppercase transition-all duration-100 active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        children
      )}
    </button>
  );
}
