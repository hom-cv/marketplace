/**
 * EmptyState - Reusable component for displaying empty/no-results states
 */

import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  /** Primary message to display */
  message: string;
  /** Optional icon to display above the message */
  icon?: ReactNode;
  /** Optional action button text */
  actionLabel?: string;
  /** Optional callback when action button is clicked */
  onAction?: () => void;
}

export function EmptyState({
  message,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <p className={styles.message}>{message}</p>
      {actionLabel && onAction && (
        <button className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
