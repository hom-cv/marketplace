/**
 * Header bar component
 */

import {
  Container,
  Group,
  Title,
  Button,
  Burger,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { IconSun, IconMoon } from "@tabler/icons-react";
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
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === "light" ? "dark" : "light");
  };

  return (
    <header className={styles.header}>
      <Container size="md" className={styles.headerContent}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Title>marketplace</Title>
        </Link>

        <Group visibleFrom="xs">
          <ActionIcon
            onClick={toggleColorScheme}
            variant="subtle"
            size="lg"
            aria-label="Toggle color scheme"
          >
            {computedColorScheme === "light" ? (
              <IconMoon size={20} />
            ) : (
              <IconSun size={20} />
            )}
          </ActionIcon>
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
          <ActionIcon
            onClick={toggleColorScheme}
            variant="subtle"
            size="lg"
            aria-label="Toggle color scheme"
          >
            {computedColorScheme === "light" ? (
              <IconMoon size={20} />
            ) : (
              <IconSun size={20} />
            )}
          </ActionIcon>
          <Burger opened={drawerOpened} onClick={onToggleDrawer} size="sm" />
        </Group>
      </Container>
    </header>
  );
}
