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
  Skeleton,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { IconMessage, IconHeart } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "./UserMenu";
import { sellerAction, type UserInfo } from "./types";
import styles from "./AppNavigation.module.css";

interface HeaderProps {
  user: UserInfo | null;
  userLoading: boolean;
  drawerOpened: boolean;
  onToggleDrawer: () => void;
  onLogout: () => void;
}

export function Header({
  user,
  userLoading,
  drawerOpened,
  onToggleDrawer,
  onLogout,
}: HeaderProps) {
  const { t } = useTranslation("navigation");
  const seller = user ? sellerAction(user.is_seller) : null;

  return (
    <header className={styles.header}>
      <Container size="lg" className={styles.headerContent}>
        <Link to="/" className={styles.logo}>
          tallad.co
        </Link>

        <Group visibleFrom="xs">
          {user ? (
            <>
              {seller && (
                <Button
                  component={Link}
                  to={seller.to}
                  leftSection={<seller.icon size={16} />}
                >
                  {t(seller.labelKey)}
                </Button>
              )}
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
          ) : userLoading ? (
            // Profile fetch in flight — placeholders to avoid a flash of the
            // wrong seller state / login buttons.
            <>
              <Skeleton height={36} width={140} radius="sm" />
              <Skeleton circle height={36} width={36} />
              <Skeleton circle height={36} width={36} />
              <Skeleton circle height={40} width={40} />
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
