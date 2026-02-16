/**
 * Desktop user dropdown menu
 */

import { Menu, Avatar, UnstyledButton } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconLogout,
  IconBuildingStore,
  IconPlus,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
  IconHeart,
  IconUser,
  IconSettings,
  IconShield,
} from "@tabler/icons-react";
import { getInitials, type UserInfo } from "./types";
import styles from "./AppNavigation.module.css";

interface UserMenuProps {
  user: UserInfo | null;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Avatar color="blue" radius="xl" size="md" className={styles.avatar}>
            {getInitials(user)}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>@{user?.username}</Menu.Label>

        <Menu.Item
          leftSection={<IconUser size={14} />}
          onClick={() => navigate({ to: "/$username", params: { username: user?.username ?? "" } })}
        >
          {t("menu.profile")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShoppingBag size={14} />}
          component={Link}
          to="/account/purchases"
        >
          {t("links.purchaseHistory")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconHeart size={14} />}
          component={Link}
          to="/account/liked"
        >
          {t("links.likedListings")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconPackage size={14} />}
          component={Link}
          to="/account/listings"
        >
          {t("menu.myListings")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconReceipt size={14} />}
          component={Link}
          to="/account/sales"
        >
          {t("links.soldListings")}
        </Menu.Item>

        {user?.is_seller && (
          <Menu.Item
            leftSection={<IconPlus size={14} />}
            component={Link}
            to="/account/listings/new"
          >
            {t("menu.createListing")}
          </Menu.Item>
        )}

        {!user?.is_seller && (
          <Menu.Item
            leftSection={<IconBuildingStore size={14} />}
            component={Link}
            to="/account/become-seller"
          >
            {t("menu.becomeSeller")}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconSettings size={14} />}
          component={Link}
          to="/account/settings"
        >
          {t("menu.editProfile")}
        </Menu.Item>

        {user?.is_admin && (
          <Menu.Item
            leftSection={<IconShield size={14} />}
            component={Link}
            to="/admin"
          >
            {t("menu.adminDashboard")}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={onLogout}>
          {t("menu.logout")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
