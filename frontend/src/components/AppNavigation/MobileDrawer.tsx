/**
 * Mobile navigation drawer
 */

import {
  Drawer,
  Stack,
  Group,
  Avatar,
  Divider,
  Text,
  NavLink,
  Button,
  Skeleton,
} from "@mantine/core";
import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconLogout,
  IconBuildingStore,
  IconPlus,
  IconSearch,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
  IconHeart,
  IconUser,
  IconSettings,
  IconShield,
  IconMessage,
} from "@tabler/icons-react";
import { getInitials, type UserInfo } from "./types";

interface MobileDrawerProps {
  opened: boolean;
  onClose: () => void;
  user: UserInfo | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function MobileDrawer({
  opened,
  onClose,
  user,
  isAuthenticated,
  onLogout,
}: MobileDrawerProps) {
  const location = useLocation();
  const { t } = useTranslation("navigation");

  return (
    <Drawer opened={opened} onClose={onClose} size="100%">
      <Stack>
        {user && (
          <Group mb="md" px="md">
            <Avatar color="blue" radius="xl" size="md">
              {getInitials(user)}
            </Avatar>
            <div>
              <strong>
                {[user.first_name, user.last_name].filter(Boolean).join(" ")}
              </strong>
              <Text size="sm" c="dimmed">
                @{user.username}
              </Text>
            </div>
          </Group>
        )}

        {user && (
          <Button
            component={Link}
            to={
              user.is_seller
                ? "/account/listings/new"
                : "/account/become-seller"
            }
            onClick={onClose}
            fullWidth
            variant={user.is_seller ? "filled" : "light"}
            leftSection={
              user.is_seller ? (
                <IconPlus size={16} />
              ) : (
                <IconBuildingStore size={16} />
              )
            }
          >
            {user.is_seller
              ? t("menu.createListing")
              : t("menu.becomeSeller")}
          </Button>
        )}

        {user && (
          <>
            <Divider my="sm" />

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mb="xs">
              {t("sections.buying")}
            </Text>
            <NavLink
              component={Link}
              to="/explore"
              label={t("menu.explore")}
              leftSection={<IconSearch size={18} />}
              active={location.pathname === "/explore"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/messages"
              label={t("menu.messages")}
              leftSection={<IconMessage size={18} />}
              active={location.pathname.startsWith("/messages")}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/account/liked"
              label={t("links.likedListings")}
              leftSection={<IconHeart size={18} />}
              active={location.pathname === "/account/liked"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/account/purchases"
              label={t("links.purchaseHistory")}
              leftSection={<IconShoppingBag size={18} />}
              active={location.pathname === "/account/purchases"}
              onClick={onClose}
            />

            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={600}
              px="md"
              mt="md"
              mb="xs"
            >
              {t("sections.selling")}
            </Text>
            <NavLink
              component={Link}
              to="/account/listings"
              label={t("menu.myListings")}
              leftSection={<IconPackage size={18} />}
              active={location.pathname === "/account/listings"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/account/sales"
              label={t("links.soldListings")}
              leftSection={<IconReceipt size={18} />}
              active={location.pathname === "/account/sales"}
              onClick={onClose}
            />

            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={600}
              px="md"
              mt="md"
              mb="xs"
            >
              {t("sections.account")}
            </Text>
            <NavLink
              component={Link}
              to={`/profile/${user.username ?? ""}`}
              label={t("menu.profile")}
              leftSection={<IconUser size={18} />}
              active={location.pathname === `/profile/${user.username ?? ""}`}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/account/settings"
              label={t("menu.editProfile")}
              leftSection={<IconSettings size={18} />}
              active={location.pathname === "/account/settings"}
              onClick={onClose}
            />

            {user.is_admin && (
              <NavLink
                component={Link}
                to="/admin"
                label={t("menu.adminDashboard")}
                leftSection={<IconShield size={18} />}
                active={location.pathname.startsWith("/admin")}
                onClick={onClose}
              />
            )}

            <Divider my="sm" />
          </>
        )}

        {user ? (
          <Button
            fullWidth
            variant="outline"
            color="red"
            onClick={onLogout}
            leftSection={<IconLogout size={16} />}
          >
            {t("menu.logout")}
          </Button>
        ) : isAuthenticated ? (
          // Signed in but profile still loading — placeholders (the user-guarded
          // sections above render nothing until it arrives).
          <Stack px="md" mt="md" gap="sm">
            <Skeleton height={44} radius="sm" />
            <Skeleton height={36} radius="sm" />
            <Skeleton height={36} radius="sm" />
            <Skeleton height={36} radius="sm" />
          </Stack>
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
