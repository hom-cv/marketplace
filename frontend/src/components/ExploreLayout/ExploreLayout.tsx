/**
 * ExploreLayout - Shared layout component for explore pages
 * Provides consistent structure for authenticated and public explore views
 */

import { useMemo, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Container,
  Center,
  Alert,
  Text,
  Stack,
  Button,
  Drawer,
  Group,
  Skeleton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconAdjustments } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPosts } from "@/api/posts";
import { PostCard, type ReportTarget } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { PostFiltersBar } from "@/components/PostFiltersBar";
import { usePostFilters } from "@/hooks/usePostFilters";
import styles from "./ExploreLayout.module.css";

const ITEMS_PER_PAGE = 12;
const SKELETON_COUNT = 12;

export interface ExploreLayoutProps {
  /** Whether this is the public (unauthenticated) version */
  isPublic?: boolean;
  /** Query key prefix for caching */
  queryKeyPrefix?: string[];
  /** Subtitle to display (public page only) */
  subtitle?: string;
  /** Callback when report button is clicked on a post */
  onReportClick?: (target: ReportTarget) => void;
  /** Additional content to render after the main content */
  children?: ReactNode;
}

function PostCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <Skeleton height={0} className={styles.skeletonAspect} radius="md" />
      <div className={styles.skeletonContent}>
        <Skeleton height={12} width="50%" radius="sm" />
        <Skeleton height={16} width="80%" radius="sm" mt={8} />
        <Group justify="space-between" mt={8}>
          <Skeleton height={16} width="30%" radius="sm" />
          <Skeleton height={12} width="25%" radius="sm" />
        </Group>
      </div>
    </div>
  );
}

export function ExploreLayout({
  isPublic = false,
  queryKeyPrefix = [],
  subtitle,
  onReportClick,
  children,
}: ExploreLayoutProps) {
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  const {
    filters,
    queryFilters,
    hasActiveFilters,
    activeFilterCount,
    handleTypeToggle,
    handleSizeToggle,
    handleClearFilters,
    handleSearchChange,
  } = usePostFilters();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryKey = useMemo(
    () => ["posts", ...queryKeyPrefix, queryFilters],
    [queryKeyPrefix, queryFilters]
  );

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) => getPosts(pageParam, ITEMS_PER_PAGE, queryFilters),
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.limit;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    initialPageParam: 0,
  });

  const posts = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
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

  const renderContent = () => (
    <>
      {/* Header */}
      <header className={`${styles.header} ${isPublic ? styles.large : ""}`}>
        <h1 className={`${styles.title} ${isPublic ? styles.large : ""}`}>{t("title")}</h1>
        {isPublic && subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {!isLoading && totalCount > 0 && (
          <Text size="sm" c="dimmed" mt={isPublic ? "xs" : undefined}>
            {totalCount} {totalCount === 1 ? t("results.listing") : t("results.listings")}
          </Text>
        )}
      </header>

      {/* Layout */}
      <div className={styles.layout}>
        {/* Sidebar - positioned before main for public, after for authenticated */}
        {isPublic && (
          <PostFiltersBar
            filters={filters}
            onTypeToggle={handleTypeToggle}
            onSizeToggle={handleSizeToggle}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            variant="sidebar"
          />
        )}

        {/* Main */}
        <main className={styles.main}>
          {isLoading && (
            <div className={`${styles.grid} ${isPublic ? styles.large : ""}`}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && posts.length === 0 && (
            <Center h={300}>
              <Stack align="center" gap="md">
                <Text c="dimmed">{hasActiveFilters ? t("results.noMatch") : t("results.noListings")}</Text>
                {hasActiveFilters && (
                  <Button variant="light" size="sm" onClick={handleClearFilters}>
                    {t("filters.clearFilters")}
                  </Button>
                )}
              </Stack>
            </Center>
          )}

          {!isLoading && posts.length > 0 && (
            <>
              <div className={`${styles.grid} ${isPublic ? styles.large : ""}`}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showLikeButton={!isPublic}
                    linkTo={isPublic ? "public" : undefined}
                    onReportClick={!isPublic ? onReportClick : undefined}
                  />
                ))}
              </div>
              <div className={styles.mobileFeed}>
                {posts.map((post) => (
                  <PostFeedItem
                    key={post.id}
                    post={post}
                    showLikeButton={!isPublic}
                    linkTo={isPublic ? "public" : undefined}
                  />
                ))}
              </div>
            </>
          )}

          {posts.length > 0 && (
            <>
              <div ref={loadMoreRef} className={styles.loadMoreTrigger} />
              {isFetchingNextPage && (
                <div className={`${styles.loadingMore} ${isPublic ? styles.large : ""}`}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PostCardSkeleton key={`loading-${i}`} />
                  ))}
                </div>
              )}
              {!hasNextPage && posts.length >= ITEMS_PER_PAGE && (
                <Text ta="center" c="dimmed" size="sm" py="xl">
                  {t("results.noMore")}
                </Text>
              )}
            </>
          )}
        </main>

        {/* Sidebar - positioned after main for authenticated */}
        {!isPublic && (
          <PostFiltersBar
            filters={filters}
            onTypeToggle={handleTypeToggle}
            onSizeToggle={handleSizeToggle}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            variant="sidebar"
          />
        )}
      </div>

      {children}
    </>
  );

  if (error) {
    const errorContent = (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : t("errors.failedToLoad")}
      </Alert>
    );

    return isPublic ? (
      <div className={`${styles.page} ${styles.withPadding}`}>
        <Container size="xl">{errorContent}</Container>
      </div>
    ) : (
      errorContent
    );
  }

  return (
    <div className={`${styles.page} ${isPublic ? styles.withPadding : ""}`}>
      {isPublic ? <Container size="xl">{renderContent()}</Container> : renderContent()}

      {/* Mobile Filter Button */}
      <button className={styles.filterBtn} onClick={openDrawer}>
        <IconAdjustments size={18} />
        <span>{tCommon("filters")}</span>
        {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
      </button>

      {/* Mobile Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="bottom"
        size="80%"
        title={
          <div className={styles.drawerTitle}>
            <span>{tCommon("filters")}</span>
            {hasActiveFilters && (
              <button className={styles.drawerClear} onClick={handleClearFilters}>
                {tCommon("buttons.clearAll")}
              </button>
            )}
          </div>
        }
        classNames={{
          content: styles.drawerContent,
          header: styles.drawerHeader,
          body: styles.drawerBody,
        }}
      >
        <PostFiltersBar
          filters={filters}
          onTypeToggle={handleTypeToggle}
          onSizeToggle={handleSizeToggle}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          variant="drawer"
        />
        <div className={styles.drawerFooter}>
          <Button fullWidth onClick={closeDrawer}>
            {t("filters.showResults", { count: totalCount })}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
