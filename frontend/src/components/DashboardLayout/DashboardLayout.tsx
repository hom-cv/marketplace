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
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { SidebarNavLink } from "@/components/shared/SidebarNavLink";
import styles from "./DashboardLayout.module.css";

function SidebarContent() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.is_admin ?? false;
  const { t } = useTranslation("navigation");

  return (
    <>
      <div className={styles.navSection}>
        <SidebarNavLink
          to="/app"
          icon={<IconHome size={20} />}
          label={t("links.home")}
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>{t("sections.buying")}</div>
        <SidebarNavLink
          to="/app/explore"
          icon={<IconSearch size={20} />}
          label={t("menu.explore")}
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/app/purchases"
          icon={<IconShoppingBag size={20} />}
          label={t("links.purchaseHistory")}
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <div className={styles.navSection}>
        <div className={styles.navHeader}>{t("sections.selling")}</div>
        <SidebarNavLink
          to="/app/my-listings"
          icon={<IconPackage size={20} />}
          label={t("menu.myListings")}
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
        <SidebarNavLink
          to="/app/sales"
          icon={<IconReceipt size={20} />}
          label={t("links.soldListings")}
          className={styles.navLink}
          activeClassName={`${styles.navLink} ${styles.active}`}
        />
      </div>

      <Stack gap="xs">
        <Link to="/app/posts/new" style={{ textDecoration: "none" }}>
          <Button fullWidth leftSection={<IconPlus size={16} />}>
            {t("menu.createListing")}
          </Button>
        </Link>
        {isAdmin && (
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <Button fullWidth leftSection={<IconShield size={16} />} color="orange">
              {t("menu.adminDashboard")}
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

