/**
 * Desktop user dropdown menu
 */

import { Menu, Avatar, UnstyledButton } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconLogout,
  IconBuildingStore,
  IconPlus,
  IconHome,
  IconSearch,
  IconPackage,
} from "@tabler/icons-react";
import { getInitials, type UserInfo } from "./types";
import styles from "./AppNavigation.module.css";

interface UserMenuProps {
  user: UserInfo | null;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useTranslation("navigation");

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
        <Menu.Label>
          {user?.first_name} {user?.last_name}
        </Menu.Label>

        <Menu.Item leftSection={<IconHome size={14} />} component={Link} to="/app">
          {t("menu.dashboard")}
        </Menu.Item>
        <Menu.Item leftSection={<IconSearch size={14} />} component={Link} to="/app/explore">
          {t("menu.explore")}
        </Menu.Item>
        <Menu.Item leftSection={<IconPackage size={14} />} component={Link} to="/app/my-listings">
          {t("menu.myListings")}
        </Menu.Item>

        <Menu.Divider />

        {!user?.is_seller && (
          <Menu.Item
            leftSection={<IconBuildingStore size={14} />}
            component={Link}
            to="/app/become-seller"
          >
            {t("menu.becomeSeller")}
          </Menu.Item>
        )}

        {user?.is_seller && (
          <Menu.Item leftSection={<IconPlus size={14} />} component={Link} to="/app/posts/new">
            {t("menu.createListing")}
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
