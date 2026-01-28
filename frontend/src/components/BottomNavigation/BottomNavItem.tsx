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
  icon: IconComponent,
  elevated = false,
  onClick,
}: BottomNavItemProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  // Check if this nav item is active (only for Link-based items)
  const isActive = !onClick && (currentPath === to || (to !== "/" && currentPath.startsWith(to)));

  // Build class names
  const className = [
    styles.navItem,
    isActive && styles.navItemActive,
    elevated && styles.navItemElevated,
  ].filter(Boolean).join(" ");

  // Common content for both variants
  const content = (
    <>
      <Box className={elevated ? styles.elevatedIconWrapper : styles.iconWrapper}>
        <IconComponent size={elevated ? 24 : 22} stroke={isActive ? 2 : 1.5} />
      </Box>
      {!elevated && (
        <Text size="xs" className={styles.label}>
          {label}
        </Text>
      )}
    </>
  );

  // Use onClick handler or Link component
  if (onClick) {
    return (
      <UnstyledButton className={className} onClick={onClick} aria-label={label}>
        {content}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton component={Link} to={to} className={className} aria-label={label}>
      {content}
    </UnstyledButton>
  );
}
