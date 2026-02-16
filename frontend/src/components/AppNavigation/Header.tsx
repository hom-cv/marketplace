/**
 * Header bar component
 */

import { Container, Group, Button, Burger } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserMenu } from "./UserMenu";
import type { UserInfo } from "./types";
import styles from "./AppNavigation.module.css";

interface HeaderProps {
  user: UserInfo | null;
  isAuthenticated: boolean;
  drawerOpened: boolean;
  onToggleDrawer: () => void;
  onLogout: () => void;
}

export function Header({
  user,
  isAuthenticated,
  drawerOpened,
  onToggleDrawer,
  onLogout,
}: HeaderProps) {
  const { t } = useTranslation("navigation");

  return (
    <header className={styles.header}>
      <Container size="md" className={styles.headerContent}>
        <Link to="/" className={styles.logo}>
          tallad.co
        </Link>

        <Group visibleFrom="xs">
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <Button component={Link} to="/login">
                {t("header.login")}
              </Button>
              <Button component={Link} to="/sign-up">
                {t("header.signUp")}
              </Button>
            </>
          )}
        </Group>

        <Group hiddenFrom="xs" gap="xs">
          <Burger opened={drawerOpened} onClick={onToggleDrawer} size="sm" />
        </Group>
      </Container>
    </header>
  );
}
