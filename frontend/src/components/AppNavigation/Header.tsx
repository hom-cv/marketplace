/**
 * Header bar component - Modern SaaS style
 */

import { Container, Group, Text, Button, Burger } from "@mantine/core";
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

export function Header({ user, isAuthenticated, drawerOpened, onToggleDrawer, onLogout }: HeaderProps) {
  const { t } = useTranslation("navigation");

  return (
    <header className={styles.header}>
      <Container size="lg" className={styles.headerContent}>
        <Link to="/" className={styles.logoLink}>
          <Text component="span" className={styles.logo}>
            marketplace
          </Text>
        </Link>

        <Group gap="sm" visibleFrom="xs">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <Button component={Link} to="/login" variant="subtle" color="gray" size="sm">
                {t("header.login")}
              </Button>
              <Button component={Link} to="/sign-up" size="sm">
                {t("header.signUp")}
              </Button>
            </>
          )}
        </Group>

        <Burger opened={drawerOpened} onClick={onToggleDrawer} hiddenFrom="xs" size="sm" />
      </Container>
    </header>
  );
}
