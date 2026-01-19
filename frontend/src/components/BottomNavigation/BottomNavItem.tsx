/**
 * Individual navigation item for bottom navigation
 */

import { UnstyledButton, Text, Box } from "@mantine/core";
import { Link, useRouterState } from "@tanstack/react-router";
import type { Icon } from "@tabler/icons-react";
import styles from "./BottomNavigation.module.css";

interface BottomNavItemProps {
  to: string;
  label: string;
  icon: Icon;
  /** Whether this is the elevated center button (Sell) */
  elevated?: boolean;
  /** Click handler for custom actions (e.g., show login modal) */
  onClick?: () => void;
}

export function BottomNavItem({
  to,
  label,
  icon: Icon,
  elevated = false,
  onClick,
}: BottomNavItemProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  // Check if this nav item is active
  const isActive = currentPath === to ||
    (to !== "/" && currentPath.startsWith(to)) ||
    (to === "/" && currentPath === "/");

  if (onClick) {
    return (
      <UnstyledButton
        className={`${styles.navItem} ${elevated ? styles.navItemElevated : ""}`}
        onClick={onClick}
      >
        <Box className={elevated ? styles.elevatedIconWrapper : styles.iconWrapper}>
          <Icon size={elevated ? 24 : 22} stroke={1.5} />
        </Box>
        {!elevated && (
          <Text size="xs" className={styles.label}>
            {label}
          </Text>
        )}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton
      component={Link}
      to={to}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${elevated ? styles.navItemElevated : ""}`}
    >
      <Box className={elevated ? styles.elevatedIconWrapper : styles.iconWrapper}>
        <Icon size={elevated ? 24 : 22} stroke={isActive ? 2 : 1.5} />
      </Box>
      {!elevated && (
        <Text size="xs" className={styles.label}>
          {label}
        </Text>
      )}
    </UnstyledButton>
  );
}
