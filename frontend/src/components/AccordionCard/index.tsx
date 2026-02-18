import type { ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import styles from "./AccordionCard.module.css";

interface AccordionCardProps {
  /** Content to render in the clickable header area */
  header: ReactNode;
  /** Content to show when expanded */
  children: ReactNode;
  /** Whether the card is currently expanded */
  isExpanded: boolean;
  /** Called when the header is clicked */
  onToggle: () => void;
  /** Accessible label for the toggle button */
  ariaLabel?: string;
}

export function AccordionCard({
  header,
  children,
  isExpanded,
  onToggle,
  ariaLabel,
}: AccordionCardProps) {
  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={ariaLabel}
      >
        <div className={styles.headerContent}>{header}</div>
        <IconChevronDown
          size={20}
          className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ""}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && <div className={styles.content}>{children}</div>}
    </div>
  );
}
