/**
 * Username display with banned visual treatment
 */

import { Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
import styles from "./Username.module.css";

interface UsernameProps {
  username: string;
  isBanned?: boolean;
  className?: string;
}

export function Username({ username, isBanned, className }: UsernameProps) {
  const { t } = useTranslation("common");

  if (isBanned) {
    return (
      <Tooltip label={t("user.banned")}>
        <span
          className={[styles.banned, className].filter(Boolean).join(" ")}
        >
          @{username}
        </span>
      </Tooltip>
    );
  }

  return <span className={className}>@{username}</span>;
}
