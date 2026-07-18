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
  Loader,
} from "@mantine/core";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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
  IconArrowRight,
} from "@tabler/icons-react";
import { BAR_DEPARTMENTS } from "@/constants/departments";
import { SellerButton } from "./SellerButton";
import { getInitials, type UserInfo } from "./types";

interface MobileDrawerProps {
  opened: boolean;
  onClose: () => void;
  user: UserInfo | null;
  userLoading: boolean;
  onLogout: () => void;
}

export function MobileDrawer({
  opened,
  onClose,
  user,
  userLoading,
  onLogout,
}: MobileDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("navigation");
  const { t: tListings } = useTranslation("listings");
  const { t: tExplore } = useTranslation("explore");

  // Department bar is desktop-only; on mobile it lives here in the drawer.
  const departments = [
    { value: undefined, label: tExplore("departments.all") },
    ...BAR_DEPARTMENTS.map((value) => ({ value, label: tListings(`genders.${value}`) })),
  ];
  const shopLinks = departments.map((d) => (
    <NavLink
      key={d.value ?? "all"}
      label={d.label}
      rightSection={<IconArrowRight size={16} stroke={1.5} />}
      onClick={() => {
        navigate({
          to: "/explore",
          search: (prev) => ({ ...prev, department: d.value || undefined }),
        });
        onClose();
      }}
    />
  ));

  return (
    <Drawer opened={opened} onClose={onClose} size="100%">
      <Stack>
        {user ? (
          <>
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

            <SellerButton
              user={user}
              fullWidth
              variant={user.is_seller ? "filled" : "light"}
              onClick={onClose}
            />

            {shopLinks}

            <Divider my="sm" />

            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mb="xs">
              {t("sections.buying")}
            </Text>
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
              to={`/profile/${user.username}`}
              label={t("menu.profile")}
              leftSection={<IconUser size={18} />}
              active={location.pathname === `/profile/${user.username}`}
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
        ) : userLoading ? (
          // Profile fetch in flight — spinner rather than a faked layout.
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <>
            <Button component={Link} to="/login" onClick={onClose}>
              {t("header.login")}
            </Button>
            <Button component={Link} to="/sign-up" onClick={onClose}>
              {t("header.signUp")}
            </Button>

            <Divider my="sm" />

            {shopLinks}


          </>
        )}
      </Stack>
    </Drawer>
  );
}
