import { Link, Outlet, useLocation, Navigate } from "@tanstack/react-router";
import { Box } from "@mantine/core";
import {
  IconDashboard,
  IconTicket,
  IconFlag,
  IconUserOff,
  IconBan,
} from "@tabler/icons-react";
import { useAuthStore } from "@/stores/authStore";
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
      <div className={styles.navSection}>
        <div className={styles.navHeader}>
          Admin Panel <span className={styles.adminBadge}>Admin</span>
        </div>
        <NavLink to="/admin" icon={<IconDashboard size={20} />} label="Dashboard" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Seller Access</div>
        <NavLink to="/admin/invites" icon={<IconTicket size={20} />} label="Invite Codes" />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Moderation</div>
        <NavLink to="/admin/reports" icon={<IconFlag size={20} />} label="Reports" />
        <NavLink to="/admin/bans/users" icon={<IconUserOff size={20} />} label="User Bans" />
        <NavLink to="/admin/bans/posts" icon={<IconBan size={20} />} label="Listing Bans" />
      </div>

      <div className={styles.navSection} style={{ marginTop: "auto" }}>
        <Link to="/app" className={styles.navLink}>
          ← Back to App
        </Link>
      </div>
    </>
  );
}

export function AdminLayout() {
  const user = useAuthStore((state) => state.user);

  // Server-side is the real protection, but this prevents the UI flicker
  if (!user?.is_admin) {
    return <Navigate to="/app" />;
  }

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
