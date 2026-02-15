import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
  title?: string;
  centered?: boolean;
  children: ReactNode;
}

export function Card({
  padding = "md",
  title,
  centered = false,
  children,
  className,
  ...props
}: CardProps) {
  const classNames = [
    styles.card,
    styles[padding],
    centered && styles.centered,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...props}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </div>
  );
}
