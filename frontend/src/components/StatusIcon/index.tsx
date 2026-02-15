import type { ReactNode } from "react";
import styles from "./StatusIcon.module.css";

interface StatusIconProps {
  children: ReactNode;
  variant: "success" | "error" | "pending";
  size?: number;
}

export function StatusIcon({ children, variant, size = 64 }: StatusIconProps) {
  return (
    <div
      className={`${styles.icon} ${styles[variant]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
