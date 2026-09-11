"use client";

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-red-500 border-red-700 text-white hover:bg-red-400 active:bg-red-500",
  secondary:
    "bg-yellow-400 border-yellow-600 text-ink-900 hover:bg-yellow-300 active:bg-yellow-400",
  outline:
    "bg-surface border-ink-300 text-ink-700 hover:bg-yellow-50 active:bg-yellow-50",
  ghost:
    "bg-transparent border-transparent text-ink-500 hover:bg-yellow-50 hover:text-ink-900 shadow-none",
  danger:
    "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 active:bg-red-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "rounded-2xl border-b-4 px-6 py-3 text-base active:border-b-2",
  sm: "rounded-xl border-b-2 px-3 py-1.5 text-sm active:border-b",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

/**
 * A chunky, Duolingo-style "raised" button: a solid top face with a darker
 * bottom border that flattens on press to fake a 3D click. `size="sm"`
 * keeps that language at a scale that fits inline/table contexts.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-heading inline-flex items-center justify-center gap-2 font-bold tracking-wide uppercase transition-all duration-100 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        children
      )}
    </button>
  );
}
