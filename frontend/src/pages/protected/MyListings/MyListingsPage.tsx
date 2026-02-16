/**
 * My Listings page - Flat design
 */

import { useQuery } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import { IconAlertCircle, IconPlus, IconPackage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getMyPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import styles from "./MyListingsPage.module.css";

export function MyListingsPage() {
  const { t } = useTranslation("listings");
  const { t: tNav } = useTranslation("navigation");

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts", "me"],
    queryFn: () => getMyPosts(),
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <IconAlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>
              {error instanceof Error ? error.message : t("myListings.failedToLoad")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("myListings.title")}</h1>
          <p className={styles.subtitle}>{t("myListings.subtitle")}</p>
        </div>

        {!posts || posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyCard}>
              <div className={styles.emptyIcon}>
                <IconPackage size={28} />
              </div>
              <p className={styles.emptyTitle}>{t("myListings.noListings")}</p>
              <p className={styles.emptyText}>{t("myListings.createFirst")}</p>
              <Link to="/account/listings/new" className={styles.emptyButton}>
                <IconPlus size={18} />
                {tNav("menu.createListing")}
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
