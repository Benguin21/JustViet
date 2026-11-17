"use client";

import { type ButtonHTMLAttributes } from "react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

/**
 * A chunky, Duolingo-style "raised" button: a solid top face with a darker
 * bottom border that flattens on press to fake a 3D click. `size="sm"`
 * keeps that language at a scale that fits inline/table contexts. For a
 * link that should look like this, use `ButtonLink`.
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
      className={buttonClassName({ variant, size, fullWidth, className })}
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
