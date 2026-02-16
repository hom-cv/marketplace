/**
 * Dashboard page - Flat design
 */

import { useQuery } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import {
  IconPackage,
  IconShoppingBag,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getPosts, getMyPosts } from "@/api/posts";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  const { data: allPosts, isLoading: loadingAll } = useQuery({
    queryKey: ["posts"],
    queryFn: () => getPosts(),
  });

  const { data: myPosts, isLoading: loadingMy } = useQuery({
    queryKey: ["posts", "me"],
    queryFn: () => getMyPosts(),
  });

  if (loadingAll || loadingMy) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  const stats = [
    {
      title: t("stats.totalListings"),
      value: myPosts?.length || 0,
      icon: IconPackage,
      colorClass: styles.statIconBlue,
      link: "/app/my-listings",
    },
    {
      title: t("stats.marketplaceItems"),
      value: allPosts?.total || 0,
      icon: IconTrendingUp,
      colorClass: styles.statIconGreen,
      link: "/app/explore",
    },
    {
      title: t("stats.totalPurchases"),
      value: 0,
      icon: IconShoppingBag,
      colorClass: styles.statIconOrange,
      link: "/app/purchases",
    },
    {
      title: t("stats.earnings"),
      value: 0,
      icon: IconReceipt,
      colorClass: styles.statIconPurple,
      link: "/app/sales",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>
            {t("welcome")}! {t("welcomeMessage")}
          </p>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.link} className={styles.statCard}>
              <div className={`${styles.statIcon} ${stat.colorClass}`}>
                <stat.icon size={24} />
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>{stat.title}</p>
                <p className={styles.statValue}>{stat.value}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("sections.quickActions")}</h2>
          <p className={styles.sectionHint}>{t("sidebarHint")}</p>
        </div>
      </div>
    </div>
  );
}
