/**
 * Minimal mobile navigation drawer
 */

import { Drawer, Stack, Group, Text, Button, UnstyledButton } from "@mantine/core";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";
import type { UserInfo } from "./types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import styles from "./MobileDrawer.module.css";

interface MobileDrawerProps {
  opened: boolean;
  onClose: () => void;
  user: UserInfo | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function MobileDrawer({ opened, onClose, user, isAuthenticated, onLogout }: MobileDrawerProps) {
  const location = useLocation();
  const isInDashboard = location.pathname.startsWith("/app");
  const { t } = useTranslation("navigation");

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="100%"
      withCloseButton={false}
      classNames={{ body: styles.drawerBody }}
    >
      <div className={styles.drawerContent}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <Link to="/" className={styles.logo} onClick={onClose}>
            marketplace
          </Link>
          <UnstyledButton onClick={onClose} className={styles.closeButton}>
            Close
          </UnstyledButton>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {isAuthenticated && isInDashboard && (
            <>
              <div className={styles.navSection}>
                <Text className={styles.sectionLabel}>{t("sections.dashboard")}</Text>
                <Link to="/app" className={styles.navLink} onClick={onClose}>
                  {t("links.home")}
                </Link>
              </div>

              <div className={styles.navSection}>
                <Text className={styles.sectionLabel}>{t("sections.buying")}</Text>
                <Link to="/app/explore" className={styles.navLink} onClick={onClose}>
                  {t("menu.explore")}
                </Link>
                <Link to="/app/liked" className={styles.navLink} onClick={onClose}>
                  {t("links.likedListings")}
                </Link>
                <Link to="/app/purchases" className={styles.navLink} onClick={onClose}>
                  {t("links.purchaseHistory")}
                </Link>
              </div>

              <div className={styles.navSection}>
                <Text className={styles.sectionLabel}>{t("sections.selling")}</Text>
                <Link to="/app/my-listings" className={styles.navLink} onClick={onClose}>
                  {t("menu.myListings")}
                </Link>
                <Link to="/app/sales" className={styles.navLink} onClick={onClose}>
                  {t("links.soldListings")}
                </Link>
              </div>

              <div className={styles.navSection}>
                <Text className={styles.sectionLabel}>{t("sections.account")}</Text>
                <Link
                  to="/app/profile/$username"
                  params={{ username: user?.username ?? "" }}
                  className={styles.navLink}
                  onClick={onClose}
                >
                  {t("menu.profile")}
                </Link>
                <Link to="/app/settings/profile" className={styles.navLink} onClick={onClose}>
                  {t("menu.editProfile")}
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Footer Actions */}
        <div className={styles.drawerFooter}>
          <Group justify="space-between" mb="lg">
            <LanguageSwitcher />
          </Group>

          {isAuthenticated ? (
            <Stack gap="xs">
              {user?.is_seller ? (
                <Button
                  component={Link}
                  to="/app/posts/new"
                  onClick={onClose}
                  variant="outline"
                  color="dark"
                  radius={0}
                  fullWidth
                  rightSection={<IconArrowRight size={14} stroke={1.5} />}
                >
                  {t("menu.createListing")}
                </Button>
              ) : (
                <Button
                  component={Link}
                  to="/app/become-seller"
                  onClick={onClose}
                  variant="outline"
                  color="dark"
                  radius={0}
                  fullWidth
                  rightSection={<IconArrowRight size={14} stroke={1.5} />}
                >
                  {t("menu.becomeSeller")}
                </Button>
              )}
              <UnstyledButton onClick={onLogout} className={styles.logoutLink}>
                {t("menu.logout")}
              </UnstyledButton>
            </Stack>
          ) : (
            <Stack gap="xs">
              <Button
                component={Link}
                to="/login"
                onClick={onClose}
                variant="outline"
                color="dark"
                radius={0}
                fullWidth
              >
                {t("header.login")}
              </Button>
              <Button
                component={Link}
                to="/sign-up"
                onClick={onClose}
                variant="filled"
                color="dark"
                radius={0}
                fullWidth
              >
                {t("header.signUp")}
              </Button>
            </Stack>
          )}
        </div>
      </div>
    </Drawer>
  );
}
