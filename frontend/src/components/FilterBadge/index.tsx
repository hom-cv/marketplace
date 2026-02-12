import { IconX } from "@tabler/icons-react";
import styles from "./FilterBadge.module.css";

interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

export function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <button className={styles.badge} onClick={onRemove}>
      <span>{label}</span>
      <span className={styles.removeIcon}>
        <IconX size={12} />
      </span>
    </button>
  );
}
