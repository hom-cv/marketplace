import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** subtle = borderless icon trigger, outline = bordered icon action */
  variant?: "subtle" | "outline";
  /** The icon. An aria-label is required since there's no text. */
  children: ReactNode;
}

/**
 * Square icon-only button. forwardRef so it can back a Mantine `Menu.Target`.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "subtle", children, className, type = "button", ...props },
    ref,
  ) {
    const classNames = [styles.button, styles[variant], className]
      .filter(Boolean)
      .join(" ");
    return (
      <button ref={ref} type={type} className={classNames} {...props}>
        {children}
      </button>
    );
  },
);
