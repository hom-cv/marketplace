import styles from "./StatusBadge.module.css";

type BadgeColor = "green" | "red" | "orange" | "blue" | "gray" | "violet";

interface StatusBadgeProps {
  label: string;
  color: BadgeColor;
}

export function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[color]}`}>
      {label}
    </span>
  );
}
