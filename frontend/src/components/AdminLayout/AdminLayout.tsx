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
      <Link to="/explore" className={styles.backLink}>
        <IconArrowLeft size={14} />
        Back to site
      </Link>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Overview</div>
        <SidebarNavLink
          to="/admin"
          icon={<IconHome size={18} />}
          label="Dashboard"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Management</div>
        <SidebarNavLink
          to="/admin/invites"
          icon={<IconTicket size={18} />}
          label="Invite Codes"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/admin/reports"
          icon={<IconFlag size={18} />}
          label="Reports"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>Moderation</div>
        <SidebarNavLink
          to="/admin/bans/users"
          icon={<IconUserOff size={18} />}
          label="User Bans"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/admin/bans/posts"
          icon={<IconPackageOff size={18} />}
          label="Post Bans"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>
    </>
  );
}

function MobileNav() {
  return (
    <nav className={styles.mobileNav}>
      <SidebarNavLink
        to="/admin"
        icon={<IconHome size={20} />}
        label="Home"
        className={styles.mobileNavLink}
        activeClassName={`${styles.mobileNavLink} ${styles.active}`}
      />
      <SidebarNavLink
        to="/admin/invites"
        icon={<IconTicket size={20} />}
        label="Invites"
        className={styles.mobileNavLink}
        activeClassName={`${styles.mobileNavLink} ${styles.active}`}
      />
      <SidebarNavLink
        to="/admin/reports"
        icon={<IconFlag size={20} />}
        label="Reports"
        className={styles.mobileNavLink}
        activeClassName={`${styles.mobileNavLink} ${styles.active}`}
      />
      <SidebarNavLink
        to="/admin/bans/users"
        icon={<IconUserOff size={20} />}
        label="Users"
        className={styles.mobileNavLink}
        activeClassName={`${styles.mobileNavLink} ${styles.active}`}
      />
      <SidebarNavLink
        to="/admin/bans/posts"
        icon={<IconPackageOff size={20} />}
        label="Posts"
        className={styles.mobileNavLink}
        activeClassName={`${styles.mobileNavLink} ${styles.active}`}
      />
    </nav>
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

      {/* Mobile Bottom Nav */}
      <Box hiddenFrom="md">
        <MobileNav />
      </Box>
    </div>
  );
}
