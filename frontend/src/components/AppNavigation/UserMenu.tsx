/**
 * Desktop user dropdown menu
 */

import { Menu, Avatar, UnstyledButton } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  IconLogout,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
  IconHeart,
  IconUser,
  IconSettings,
  IconShield,
  IconMessage,
} from "@tabler/icons-react";
import { getInitials, sellerAction, type UserInfo } from "./types";
import styles from "./AppNavigation.module.css";

interface UserMenuProps {
  user: UserInfo;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useTranslation("navigation");
  const seller = sellerAction(user.is_seller);
  const SellerIcon = seller.icon;

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
        <Menu.Label>@{user.username}</Menu.Label>

        <Menu.Item
          component={Link}
          to={`/profile/${user.username}`}
          leftSection={<IconUser size={14} />}
        >
          {t("menu.profile")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconMessage size={14} />}
          component={Link}
          to="/messages"
        >
          {t("menu.messages")}
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

        <Menu.Item
          leftSection={<SellerIcon size={14} />}
          component={Link}
          to={seller.to}
        >
          {t(seller.labelKey)}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconSettings size={14} />}
          component={Link}
          to="/account/settings"
        >
          {t("menu.editProfile")}
        </Menu.Item>

        {user.is_admin && (
          <Menu.Item
            leftSection={<IconShield size={14} />}
            component={Link}
            to="/admin"
          >
            {t("menu.adminDashboard")}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={<IconLogout size={14} />}
          onClick={onLogout}
        >
          {t("menu.logout")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
