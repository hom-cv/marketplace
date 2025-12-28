import { Link, Outlet } from "@tanstack/react-router";
import { Box, Button, Stack } from "@mantine/core";
import {
  IconHome,
  IconSearch,
  IconShoppingBag,
  IconPackage,
  IconReceipt,
  IconPlus,
  IconShield,
} from "@tabler/icons-react";
import { useAuthStore } from "@/stores/authStore";
import { SidebarNavLink } from "@/components/shared/SidebarNavLink";
import styles from "./DashboardLayout.module.css";

function SidebarContent() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.is_admin ?? false;

  return (
    <>
      <div className={styles.navSection}>
        <SidebarNavLink
          to="/app"
          icon={<IconHome size={20} />}
          label="Home"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Buying</div>
        <SidebarNavLink
          to="/app/explore"
          icon={<IconSearch size={20} />}
          label="Explore"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/app/purchases"
          icon={<IconShoppingBag size={20} />}
          label="Purchase History"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Selling</div>
        <SidebarNavLink
          to="/app/my-listings"
          icon={<IconPackage size={20} />}
          label="My Listings"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/app/sales"
          icon={<IconReceipt size={20} />}
          label="Sold Listings"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <Stack gap="xs">
        <Link to="/app/posts/new" style={{ textDecoration: "none" }}>
          <Button fullWidth leftSection={<IconPlus size={16} />}>
            Create Listing
          </Button>
        </Link>
        {isAdmin && (
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <Button fullWidth leftSection={<IconShield size={16} />} color="orange">
              Admin Dashboard
            </Button>
          </Link>
        )}
      </Stack>
    </>
  );
}

export function DashboardLayout() {
  return (
    <div className={styles.layout}>
      {/* Desktop Sidebar */}
      <Box className={styles.sidebar} visibleFrom="md">
        <SidebarContent />
      </Box>

      {/* Main Content */}
      <Box className={styles.mainContent}>
        <Outlet />
      </Box>
    </div>
  );
}

