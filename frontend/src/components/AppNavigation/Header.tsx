/**
 * Header bar component
 */

import { Container, Group, Title, Button, Burger } from "@mantine/core";
import { Link } from "@tanstack/react-router";
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

export function Header({ user, isAuthenticated, drawerOpened, onToggleDrawer, onLogout }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Container size="md" className={styles.headerContent}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Title>marketplace</Title>
        </Link>

        <Group visibleFrom="xs">
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <Button component={Link} to="/login">
                Login
              </Button>
              <Button component={Link} to="/sign-up">
                Sign up
              </Button>
            </>
          )}
        </Group>

        <Burger opened={drawerOpened} onClick={onToggleDrawer} hiddenFrom="xs" size="sm" />
      </Container>
    </header>
  );
}
