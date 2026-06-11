/**
 * My Listings page - Flat design
 */

import { Loader } from "@mantine/core";
import { IconPlus, IconPackage } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMyPosts } from "@/hooks/usePosts";
import { useSellerStatus } from "@/hooks/useSeller";
import { Alert } from "@/components/Alert";
import { PostCard } from "@/components/PostCard";
import styles from "./MyListingsPage.module.css";

export function MyListingsPage() {
  const { t } = useTranslation("listings");
  const { t: tNav } = useTranslation("navigation");
  const { t: tCommon } = useTranslation("common");

  const { data: posts, isLoading, error } = useMyPosts();
  const { data: sellerStatus } = useSellerStatus();
  const feeFreeSalesRemaining = sellerStatus?.fee_free_sales_remaining ?? 0;

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
          <Alert variant="error" title={tCommon("status.error")}>
            {error instanceof Error ? error.message : t("myListings.failedToLoad")}
          </Alert>
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
          {feeFreeSalesRemaining > 0 && (
            <p className={styles.promoNote}>
              {tCommon("seller.feeFreeSalesRemaining", {
                count: feeFreeSalesRemaining,
              })}
            </p>
          )}
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
