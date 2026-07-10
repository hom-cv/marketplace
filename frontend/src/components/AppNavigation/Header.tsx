/**
 * Header bar component
 */

import {
  Container,
  Group,
  Button,
  Burger,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import {
  IconPlus,
  IconBuildingStore,
  IconMessage,
  IconHeart,
} from "@tabler/icons-react";
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
      <Container size="lg" className={styles.headerContent}>
        <Link to="/" className={styles.logo}>
          tallad.co
        </Link>

        <Group visibleFrom="xs">
          {isAuthenticated ? (
            <>
              <Button
                component={Link}
                to={
                  user?.is_seller
                    ? "/account/listings/new"
                    : "/account/become-seller"
                }
                leftSection={
                  user?.is_seller ? (
                    <IconPlus size={16} />
                  ) : (
                    <IconBuildingStore size={16} />
                  )
                }
              >
                {user?.is_seller
                  ? t("menu.createListing")
                  : t("menu.becomeSeller")}
              </Button>
              <Tooltip label={t("menu.messages")}>
                <ActionIcon
                  component={Link}
                  to="/messages"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={t("menu.messages")}
                >
                  <IconMessage size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t("links.likedListings")}>
                <ActionIcon
                  component={Link}
                  to="/account/liked"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={t("links.likedListings")}
                >
                  <IconHeart size={20} />
                </ActionIcon>
              </Tooltip>
              <UserMenu user={user} onLogout={onLogout} />
            </>
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
