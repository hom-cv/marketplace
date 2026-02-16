import { IconUser } from "@tabler/icons-react";
import styles from "./UserCard.module.css";

interface UserCardProps {
  username: string;
  label: string;
}

export function UserCard({ username, label }: UserCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <IconUser size={12} className={styles.labelIcon} />
        <span className={styles.labelText}>{label}</span>
      </div>
      <p className={styles.username}>@{username}</p>
    </div>
  );
}
