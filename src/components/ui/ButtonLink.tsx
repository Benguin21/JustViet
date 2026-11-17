import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./button-styles";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

/**
 * A link styled like `Button` — use it instead of wrapping a <button> in a
 * <Link>, which nests two interactive elements (confusing for keyboard and
 * screen-reader users). Works in server and client components.
 */
export function ButtonLink({ variant, size, fullWidth = false, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName({ variant, size, fullWidth, className })} {...props} />;
}
