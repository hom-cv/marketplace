/**
 * Liked Listings Page - Flat design
 */

import { useMemo, useRef, useCallback, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader, Box } from "@mantine/core";
import { IconAlertCircle, IconHeart } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getLikedPosts } from "@/api/likes";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { ReportModal } from "@/components/ReportModal";
import { useReportModal } from "@/hooks/useReportModal";
import styles from "./LikedListings.module.css";

const ITEMS_PER_PAGE = 20;

export function LikedListingsPage() {
  const { t } = useTranslation("common");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const reportModal = useReportModal();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["likedPosts"],
    queryFn: ({ pageParam = 0 }) => getLikedPosts(pageParam, ITEMS_PER_PAGE),
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.limit;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    initialPageParam: 0,
  });

  const posts = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const totalCount = data?.pages[0]?.total ?? 0;

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

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
              {error instanceof Error ? error.message : t("errors.failedToLoad")}
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
          <h1 className={styles.title}>{t("likes.title")}</h1>
          <p className={styles.resultsCount}>
            {totalCount} {totalCount === 1 ? t("likes.oneItem") : t("likes.multipleItems")}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <IconHeart size={32} />
            </div>
            <p className={styles.emptyTitle}>{t("likes.noLikes")}</p>
            <p className={styles.emptyHint}>{t("likes.noLikesHint")}</p>
          </div>
        ) : (
          <>
            {/* Desktop Grid */}
            <Box visibleFrom="sm">
              <div className={styles.grid}>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onReportClick={reportModal.openReport} />
                ))}
              </div>
            </Box>

            {/* Mobile Feed */}
            <Box hiddenFrom="sm">
              <div>
                {posts.map((post) => (
                  <PostFeedItem key={post.id} post={post} />
                ))}
              </div>
            </Box>

            {/* Infinite scroll sentinel and loading */}
            <div ref={loadMoreRef} className={styles.scrollSentinel} />
            {isFetchingNextPage && (
              <div className={styles.loadingMore}>
                <Loader size="sm" />
              </div>
            )}
            {!hasNextPage && posts.length >= ITEMS_PER_PAGE && (
              <p className={styles.endMessage}>{t("likes.noMore")}</p>
            )}
          </>
        )}
      </div>

      {/* Report Modal */}
      {reportModal.target && (
        <ReportModal
          opened={reportModal.opened}
          onClose={reportModal.close}
          reportType={reportModal.target.reportType}
          entityId={reportModal.target.entityId}
          entityName={reportModal.target.entityName}
        />
      )}
    </div>
  );
}
