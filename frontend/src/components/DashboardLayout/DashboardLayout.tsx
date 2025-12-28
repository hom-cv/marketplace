import { Link, Outlet, useLocation } from "@tanstack/react-router";
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
import styles from "./DashboardLayout.module.css";

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavLink({ to, icon, label }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`${styles.navLink} ${isActive ? styles.active : ""}`}
    >
      {icon}
      {label}
    </Link>
  );
}

function SidebarContent() {
  return (
    <>
      <div className={styles.navSection}>
        <NavLink to="/app" icon={<IconHome size={20} />} label="Home" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Buying</div>
        <NavLink to="/app/explore" icon={<IconSearch size={20} />} label="Explore" />
        <NavLink to="/app/purchases" icon={<IconShoppingBag size={20} />} label="Purchase History" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Selling</div>
        <NavLink to="/app/my-listings" icon={<IconPackage size={20} />} label="My Listings" />
        <NavLink to="/app/sales" icon={<IconReceipt size={20} />} label="Sold Listings" />
      </div>

      <Stack gap="xs">
        <Link to="/app/posts/new" style={{ textDecoration: "none" }}>
          <Button fullWidth leftSection={<IconPlus size={16} />}>
            Create Listing
          </Button>
        </Link>
        <Link to="/admin" style={{ textDecoration: "none" }}>
          <Button fullWidth leftSection={<IconShield size={16} />} color="orange">
            Admin Dashboard
          </Button>
        </Link>
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

