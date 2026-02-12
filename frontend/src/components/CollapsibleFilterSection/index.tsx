/**
 * CollapsibleFilterSection - Reusable collapsible section for filter groups
 * Features animated expand/collapse with rotating chevron indicator
 */

import type { ReactNode } from "react";
import { Box, Collapse, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import styles from "./CollapsibleFilterSection.module.css";

interface CollapsibleFilterSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
  children: ReactNode;
}

export function CollapsibleFilterSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: CollapsibleFilterSectionProps) {
  const [opened, { toggle }] = useDisclosure(defaultOpen);

  return (
    <Box className={styles.section}>
      <UnstyledButton
        onClick={toggle}
        className={styles.header}
        aria-expanded={opened}
      >
        <div className={styles.headerLeft}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.title}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className={styles.badge}>{badge}</span>
          )}
        </div>
        <IconChevronDown
          size={16}
          className={`${styles.chevron} ${opened ? styles.chevronOpen : ""}`}
        />
      </UnstyledButton>
      <Collapse in={opened}>
        <Box className={styles.content}>{children}</Box>
      </Collapse>
    </Box>
  );
}
