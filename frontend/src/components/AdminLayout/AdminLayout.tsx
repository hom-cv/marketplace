import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Box } from "@mantine/core";
import {
  IconHome,
  IconTicket,
  IconFlag,
  IconUserOff,
  IconPackageOff,
  IconArrowLeft,
} from "@tabler/icons-react";
import styles from "./AdminLayout.module.css";

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
      <Link to="/app" className={styles.backLink}>
        <IconArrowLeft size={16} />
        Back to App
      </Link>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Admin</div>
        <NavLink to="/admin" icon={<IconHome size={20} />} label="Dashboard" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Management</div>
        <NavLink to="/admin/invites" icon={<IconTicket size={20} />} label="Invite Codes" />
        <NavLink to="/admin/reports" icon={<IconFlag size={20} />} label="Reports" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Bans</div>
        <NavLink to="/admin/bans/users" icon={<IconUserOff size={20} />} label="User Bans" />
        <NavLink to="/admin/bans/posts" icon={<IconPackageOff size={20} />} label="Post Bans" />
      </div>
    </>
  );
}

export function AdminLayout() {
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
