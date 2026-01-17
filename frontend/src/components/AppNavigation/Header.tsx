/**
 * Ultra-slim minimal header
 */

import { useEffect, useState } from "react";
import { Container, Group, Burger } from "@mantine/core";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={styles.header} data-scrolled={scrolled}>
      <Container size="xl" className={styles.headerContent}>
        <Link to="/" className={styles.logo}>
          marketplace
        </Link>

        <Group gap="lg" visibleFrom="xs">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <nav className={styles.navLinks}>
              <Link to="/login" className={styles.navLink}>
                {t("header.login")}
              </Link>
              <Link to="/sign-up" className={styles.navLink}>
                {t("header.signUp")}
              </Link>
            </nav>
          )}
        </Group>

        <Burger
          opened={drawerOpened}
          onClick={onToggleDrawer}
          hiddenFrom="xs"
          size="sm"
          className={styles.burger}
        />
      </Container>
    </header>
  );
}
