import { Link, Outlet } from "@tanstack/react-router";
import { Box } from "@mantine/core";
import {
  IconTicket,
  IconFlag,
  IconMessageReport,
  IconUsers,
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
        <div className={styles.navHeader}>Management</div>
        <SidebarNavLink
          to="/admin/users"
          icon={<IconUsers size={18} />}
          label="Users"
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
        <SidebarNavLink
          to="/admin/flagged-messages"
          icon={<IconMessageReport size={18} />}
          label="Flagged Messages"
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/admin/invites"
          icon={<IconTicket size={18} />}
          label="Invite Codes"
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

const MOBILE_NAV_LINKS = [
  { to: "/admin/users" as const, icon: IconUsers, label: "Users" },
  { to: "/admin/reports" as const, icon: IconFlag, label: "Reports" },
  { to: "/admin/flagged-messages" as const, icon: IconMessageReport, label: "Flags" },
  { to: "/admin/invites" as const, icon: IconTicket, label: "Invites" },
  { to: "/admin/bans/users" as const, icon: IconUserOff, label: "Bans" },
  { to: "/admin/bans/posts" as const, icon: IconPackageOff, label: "Posts" },
];

function MobileNav() {
  return (
    <nav className={styles.mobileNav}>
      {MOBILE_NAV_LINKS.map((link) => (
        <SidebarNavLink
          key={link.to}
          to={link.to}
          icon={<link.icon size={20} />}
          label={link.label}
          className={styles.mobileNavLink}
          activeClassName={`${styles.mobileNavLink} ${styles.active}`}
        />
      ))}
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
