/**
 * Mobile navigation drawer
 */

import { Drawer, Stack, Group, Avatar, Divider, Text, NavLink, Button } from "@mantine/core";
import { Link, useLocation } from "@tanstack/react-router";
import {
  IconLogout,
  IconBuildingStore,
  IconPlus,
  IconHome,
  IconSearch,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
} from "@tabler/icons-react";
import { getInitials, type UserInfo } from "./types";

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

        {isAuthenticated && isInDashboard && (
          <>
            <Divider my="sm" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mb="xs">
              Dashboard
            </Text>
            <NavLink
              component={Link}
              to="/app"
              label="Home"
              leftSection={<IconHome size={18} />}
              active={location.pathname === "/app"}
              onClick={onClose}
            />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mt="md" mb="xs">
              Buying
            </Text>
            <NavLink
              component={Link}
              to="/app/explore"
              label="Explore"
              leftSection={<IconSearch size={18} />}
              active={location.pathname === "/app/explore"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/purchases"
              label="Purchase History"
              leftSection={<IconShoppingBag size={18} />}
              active={location.pathname === "/app/purchases"}
              onClick={onClose}
            />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" mt="md" mb="xs">
              Selling
            </Text>
            <NavLink
              component={Link}
              to="/app/my-listings"
              label="My Listings"
              leftSection={<IconPackage size={18} />}
              active={location.pathname === "/app/my-listings"}
              onClick={onClose}
            />
            <NavLink
              component={Link}
              to="/app/sales"
              label="Sold Listings"
              leftSection={<IconReceipt size={18} />}
              active={location.pathname === "/app/sales"}
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
                Become a Seller
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
                Create Listing
              </Button>
            )}
            <Button
              fullWidth
              variant="outline"
              color="red"
              onClick={onLogout}
              leftSection={<IconLogout size={16} />}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button component={Link} to="/login" onClick={onClose}>
              Log in
            </Button>
            <Button component={Link} to="/sign-up" onClick={onClose}>
              Sign up
            </Button>
          </>
        )}
      </Stack>
    </Drawer>
  );
}
