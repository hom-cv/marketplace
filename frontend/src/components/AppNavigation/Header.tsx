/**
 * Header bar component
 */

import { Container, Group, Title, Button, Burger } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserMenu } from "./UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Title>tallad.co</Title>
        </Link>

        <Group visibleFrom="xs">
          <LanguageSwitcher />
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
