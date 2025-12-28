import { Link, Outlet } from "@tanstack/react-router";
import { Box } from "@mantine/core";
import {
  IconHome,
  IconTicket,
  IconFlag,
  IconUserOff,
  IconPackageOff,
  IconArrowLeft,
} from "@tabler/icons-react";
import { SidebarNavLink } from "@/components/shared/SidebarNavLink";
import styles from "./AdminLayout.module.css";

function SidebarContent() {
  return (
    <>
      <Link to="/app" className={styles.backLink}>
        <IconArrowLeft size={16} />
        Back to App
      </Link>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Admin</div>
        <SidebarNavLink
          to="/admin"
          icon={<IconHome size={20} />}
          label="Dashboard"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Management</div>
        <SidebarNavLink
          to="/admin/invites"
          icon={<IconTicket size={20} />}
          label="Invite Codes"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/admin/reports"
          icon={<IconFlag size={20} />}
          label="Reports"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Bans</div>
        <SidebarNavLink
          to="/admin/bans/users"
          icon={<IconUserOff size={20} />}
          label="User Bans"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/admin/bans/posts"
          icon={<IconPackageOff size={20} />}
          label="Post Bans"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
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
