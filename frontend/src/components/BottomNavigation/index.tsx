/**
 * Bottom Navigation Component
 * Mobile-only navigation bar with frosted glass effect
 * Shows: Home, Explore, Sell (elevated center), Likes, Profile
 */

import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { IconHome2, IconSearch, IconPlus, IconHeart, IconUser } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { BottomNavItem } from "./BottomNavItem";
import styles from "./BottomNavigation.module.css";

export function BottomNavigation() {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);

  const isAuthenticated = !!token;

  // Determine links based on auth state
  const profileLink = isAuthenticated && user
    ? `/app/profile/${user.username}`
    : "/login";

  const likesLink = isAuthenticated ? "/app/likes" : "/login";

  // Handle sell button click - requires auth
  const handleSellClick = () => {
    if (isAuthenticated) {
      navigate({ to: "/app/posts/new" });
    } else {
      openLoginModal();
    }
  };

  return (
    <>
      <Box component="nav" className={styles.bottomNav} aria-label={t("bottomNav.ariaLabel")}>
        <div className={styles.navContainer}>
          <BottomNavItem
            to="/"
            label={t("bottomNav.home")}
            icon={IconHome2}
          />
          <BottomNavItem
            to="/explore"
            label={t("bottomNav.explore")}
            icon={IconSearch}
          />
          <BottomNavItem
            to="/app/posts/new"
            label={t("bottomNav.sell")}
            icon={IconPlus}
            elevated
            onClick={handleSellClick}
          />
          <BottomNavItem
            to={likesLink}
            label={t("bottomNav.likes")}
            icon={IconHeart}
          />
          <BottomNavItem
            to={profileLink}
            label={t("bottomNav.profile")}
            icon={IconUser}
          />
        </div>
      </Box>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("bottomNav.sellAction")}
      />
    </>
  );
}
