/**
 * Mobile navigation drawer
 */

import { Drawer, Stack, Group, Avatar, Divider, Text, NavLink, Button } from "@mantine/core";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconLogout,
  IconBuildingStore,
  IconPlus,
  IconHome,
  IconSearch,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
  IconHeart,
  IconUser,
  IconSettings,
} from "@tabler/icons-react";
import { getInitials, type UserInfo } from "./types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
    <Drawer opened={opened} onClose={onClose} size="100%">
      <Stack>
        {isAuthenticated && (
          <Group mb="md" px="md">
            <Avatar color="blue" radius="xl" size="md">
              {getInitials(user)}
            </Avatar>
            <div>
              <strong>
                {user?.first_name} {user?.last_name}
              </strong>
            </div>
          </Group>
        )}

        {/* Language Switcher */}
        <Group px="md" mb="sm">
          <LanguageSwitcher />
        </Group>

        {isAuthenticated && isInDashboard && (
          <>
            <Divider my="sm" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mb="xs">
              {t("sections.dashboard")}
            </Text>
            <NavLink
              component={Link}
              to="/app"
              label={t("links.home")}
              leftSection={<IconHome size={18} />}
              active={location.pathname === "/app"}
              onClick={onClose}
            />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mt="md" mb="xs">
              {t("sections.buying")}
            </Text>
            <NavLink
              component={Link}
              to="/app/explore"
              label={t("menu.explore")}
              leftSection={<IconSearch size={18} />}
              active={location.pathname === "/app/explore"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/liked"
              label={t("links.likedListings")}
              leftSection={<IconHeart size={18} />}
              active={location.pathname === "/app/liked"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/purchases"
              label={t("links.purchaseHistory")}
              leftSection={<IconShoppingBag size={18} />}
              active={location.pathname === "/app/purchases"}
              onClick={onClose}
            />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mt="md" mb="xs">
              {t("sections.selling")}
            </Text>
            <NavLink
              component={Link}
              to="/app/my-listings"
              label={t("menu.myListings")}
              leftSection={<IconPackage size={18} />}
              active={location.pathname === "/app/my-listings"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/sales"
              label={t("links.soldListings")}
              leftSection={<IconReceipt size={18} />}
              active={location.pathname === "/app/sales"}
              onClick={onClose}
            />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mt="md" mb="xs">
              {t("sections.account")}
            </Text>
            <NavLink
              component={Link}
              to={`/app/profile/${user?.username}`}
              label={t("menu.profile")}
              leftSection={<IconUser size={18} />}
              active={location.pathname === `/app/profile/${user?.username}`}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/settings/profile"
              label={t("menu.editProfile")}
              leftSection={<IconSettings size={18} />}
              active={location.pathname === "/app/settings/profile"}
              onClick={onClose}
            />
            <Divider my="sm" />
          </>
        )}

        {isAuthenticated ? (
          <>
            {!user?.is_seller && (
              <Button
                component={Link}
                to="/app/become-seller"
                onClick={onClose}
                fullWidth
                variant="light"
                leftSection={<IconBuildingStore size={16} />}
              >
                {t("menu.becomeSeller")}
              </Button>
            )}
            {user?.is_seller && (
              <Button
                component={Link}
                to="/app/posts/new"
                onClick={onClose}
                fullWidth
                leftSection={<IconPlus size={16} />}
              >
                {t("menu.createListing")}
              </Button>
            )}
            <Button
              fullWidth
              variant="outline"
              color="red"
              onClick={onLogout}
              leftSection={<IconLogout size={16} />}
            >
              {t("menu.logout")}
            </Button>
          </>
        ) : (
          <>
            <Button component={Link} to="/login" onClick={onClose}>
              {t("header.login")}
            </Button>
            <Button component={Link} to="/sign-up" onClick={onClose}>
              {t("header.signUp")}
            </Button>
          </>
        )}
      </Stack>
    </Drawer>
  );
}
