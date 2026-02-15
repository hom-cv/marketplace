import type { HTMLAttributes, ReactNode } from "react";
import { IconAlertCircle, IconCheck, IconX, IconInfoCircle } from "@tabler/icons-react";
import styles from "./Alert.module.css";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: "error" | "success" | "warning" | "info";
  title?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const defaultIcons: Record<AlertProps["variant"], ReactNode> = {
  error: <IconX size={18} />,
  success: <IconCheck size={18} />,
  warning: <IconAlertCircle size={18} />,
  info: <IconInfoCircle size={18} />,
};

export function Alert({
  variant,
  title,
  icon,
  fullWidth = false,
  children,
  className,
  ...props
}: AlertProps) {
  const isInline = !title && children;
  const displayIcon = icon ?? defaultIcons[variant];

  const classNames = [
    styles.alert,
    styles[variant],
    fullWidth && styles.fullWidth,
    isInline && !title && styles.inline,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...props}>
      <span className={styles.icon}>{displayIcon}</span>
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <p className={styles.message}>{children}</p>}
      </div>
    </div>
  );
}
