/**
 * PublicExplorePage - Public-facing explore page for unauthenticated users
 * Features a persistent filter sidebar on desktop with collapsible sections
 */

import { useState, useMemo, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader, Stack, Box, Drawer } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconAdjustments, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { ExploreFiltersPanel } from "@/components/ExploreFiltersPanel";
import { FilterBadge } from "@/components/FilterBadge";
import { EmptyState } from "@/components/EmptyState";
import type { PostType, PostFilters, SizeCategory } from "@/api/types/post";
import { POST_TYPES, SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  parseSizeKey,
  toggleTypeFilter,
  toggleSizeFilter,
  clearSearchFilter,
} from "@/utils/filterHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useIsAuthenticated } from "@/stores/authStore";
import styles from "./PublicExplorePage.module.css";

export function PublicExplorePage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    sizes: [],
    search: "",
  });

  const typeOptions = useMemo(
    () =>
      POST_TYPES.map((postType) => ({
        value: postType,
        label: tListings(`categories.${postType.toLowerCase()}`),
      })),
    [tListings],
  );

  const typeLabelsMap = useMemo(
    () => new Map(typeOptions.map((o) => [o.value, o.label])),
    [typeOptions],
  );

  const sizeCategoryMap = useMemo(
    () => new Map(SIZE_CATEGORY_CONFIG.map((c) => [c.category, c])),
    [],
  );

  const [debouncedSearch] = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo<PostFilters>(() => {
    const apiFilters: PostFilters = {};

    // Start with explicitly selected types
    const typesSet = new Set<PostType>(filters.types);
    const hasExplicitTypes = filters.types.length > 0;

    if (filters.sizes.length > 0) {
      const rawSizes: string[] = [];

      for (const sizeKey of filters.sizes) {
        const { category, size } = parseSizeKey(sizeKey);
        rawSizes.push(size);

        // Only auto-expand types if user hasn't selected any types explicitly
        if (!hasExplicitTypes) {
          const categoryConfig = sizeCategoryMap.get(category);
          if (categoryConfig) {
            for (const postType of categoryConfig.postTypes) {
              typesSet.add(postType);
            }
          }
        }
      }

      apiFilters.sizes = [...new Set(rawSizes)];
    }

    if (typesSet.size > 0) {
      apiFilters.types = [...typesSet];
    }

    if (debouncedSearch.trim()) {
      apiFilters.search = debouncedSearch.trim();
    }

    return apiFilters;
  }, [filters.types, filters.sizes, debouncedSearch, sizeCategoryMap]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["public-posts", queryFilters],
    queryFn: ({ pageParam = 0 }) =>
      getPosts(pageParam, ITEMS_PER_PAGE, queryFilters),
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

  const loadMoreRef = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.sizes.length > 0 ||
    filters.search.trim() !== "";

  const activeFilterCount =
    filters.types.length +
    filters.sizes.length +
    (filters.search.trim() ? 1 : 0);

  const handleTypeToggle = useCallback(
    (postType: PostType) => {
      setFilters((prev) =>
        toggleTypeFilter(prev, postType, SIZE_CATEGORY_CONFIG),
      );
    },
    [],
  );

  const handleSizeToggle = useCallback(
    (category: SizeCategory, size: string) => {
      setFilters((prev) => toggleSizeFilter(prev, category, size));
    },
    [],
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({ types: [], sizes: [], search: "" });
  }, []);

  const handleSearchClear = useCallback(() => {
    setFilters((prev) => clearSearchFilter(prev));
  }, []);

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <EmptyState
              icon={<IconAlertCircle size={24} color="var(--color-error)" />}
              message={
                error instanceof Error
                  ? error.message
                  : t("errors.failedToLoad")
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.layout}>
          {/* Desktop Filter Sidebar */}
          <Box visibleFrom="md" className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <IconAdjustments size={18} />
                <span className={styles.sidebarTitle}>
                  {t("filters.title")}
                </span>
              </div>
              <ExploreFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </Box>

          {/* Main Content */}
          <div
            className={`${styles.content} ${isAuthenticated ? styles.contentAuth : ""}`}
          >
            {/* Header */}
            <header className={styles.header}>
              <h1 className={styles.title}>{t("title")}</h1>
            </header>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className={styles.filterBadges}>
                {filters.search.trim() && (
                  <FilterBadge
                    label={`"${filters.search}"`}
                    onRemove={handleSearchClear}
                  />
                )}
                {filters.types.map((type) => (
                  <FilterBadge
                    key={type}
                    label={typeLabelsMap.get(type) ?? type}
                    onRemove={() => handleTypeToggle(type)}
                  />
                ))}
                {filters.sizes.map((sizeKey) => {
                  const { category, size } = parseSizeKey(sizeKey);
                  const categoryConfig = sizeCategoryMap.get(category);
                  const displayLabel = categoryConfig?.formatLabel
                    ? categoryConfig.formatLabel(size)
                    : size;
                  return (
                    <FilterBadge
                      key={sizeKey}
                      label={displayLabel}
                      onRemove={() => handleSizeToggle(category, size)}
                    />
                  );
                })}
                <button
                  className={styles.clearAllBadge}
                  onClick={handleClearAllFilters}
                >
                  <IconX size={12} />
                  <span>{tCommon("buttons.clearAll")}</span>
                </button>
              </div>
            )}

            {/* Results Count */}
            <p className={styles.resultsCount}>
              {totalCount}{" "}
              {totalCount === 1 ? t("results.listing") : t("results.listings")}
              {hasActiveFilters && ` ${t("results.found")}`}
            </p>

            {/* Loading State */}
            {isLoading ? (
              <div className={styles.loadingWrapper}>
                <Loader size="lg" />
              </div>
            ) : (
              <>
                {/* Desktop Grid */}
                <Box visibleFrom="sm">
                  {posts.length === 0 ? (
                    <EmptyState
                      message={
                        hasActiveFilters
                          ? t("results.noMatch")
                          : t("results.noListings")
                      }
                      actionLabel={
                        hasActiveFilters ? t("filters.clearFilters") : undefined
                      }
                      onAction={
                        hasActiveFilters ? handleClearAllFilters : undefined
                      }
                    />
                  ) : (
                    <div className={styles.grid}>
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          linkPrefix="/explore"
                        />
                      ))}
                    </div>
                  )}
                </Box>

                {/* Mobile Feed */}
                <Box hiddenFrom="sm">
                  {posts.length === 0 ? (
                    <EmptyState
                      message={
                        hasActiveFilters
                          ? t("results.noMatch")
                          : t("results.noListings")
                      }
                      actionLabel={
                        hasActiveFilters ? t("filters.clearFilters") : undefined
                      }
                      onAction={
                        hasActiveFilters ? handleClearAllFilters : undefined
                      }
                    />
                  ) : (
                    <Stack gap={0}>
                      {posts.map((post) => (
                        <PostFeedItem
                          key={post.id}
                          post={post}
                          linkPrefix="/explore"
                        />
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* Infinite scroll sentinel */}
                {posts.length > 0 && (
                  <>
                    <div ref={loadMoreRef} className={styles.scrollSentinel} />
                    {isFetchingNextPage && (
                      <div className={styles.loadingMore}>
                        <Loader size="sm" />
                      </div>
                    )}
                    {!hasNextPage && posts.length >= ITEMS_PER_PAGE && (
                      <p className={styles.endMessage}>{t("results.noMore")}</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={
          <div className={styles.drawerTitle}>
            <IconAdjustments size={18} />
            <span className={styles.sidebarTitle}>{t("filters.title")}</span>
          </div>
        }
        size="70%"
        position="bottom"
        radius="sm"
        hiddenFrom="md"
        className={styles.drawer}
      >
        <ExploreFiltersPanel
          filters={filters}
          onFiltersChange={setFilters}
        />
      </Drawer>

      {/* Mobile Sticky Filter Button */}
      <Box
        hiddenFrom="md"
        className={
          isAuthenticated
            ? styles.filterButtonWrapperAuth
            : styles.filterButtonWrapper
        }
      >
        <button className={styles.filterButton} onClick={openDrawer}>
          <IconAdjustments size={18} />
          <span>{t("filters.title")}</span>
          {activeFilterCount > 0 && (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          )}
        </button>
      </Box>

      {/* Mobile Sticky Bottom Bar - only show when not authenticated */}
      {!isAuthenticated && (
        <Box hiddenFrom="md" className={styles.mobileBottomBar}>
          <div className={styles.mobileBottomBarContent}>
            <button
              className={`${styles.mobileBottomButton} ${styles.mobileBottomButtonOutline}`}
              onClick={() => navigate({ to: "/login" })}
            >
              {tCommon("buttons.logIn")}
            </button>
            <button
              className={`${styles.mobileBottomButton} ${styles.mobileBottomButtonPrimary}`}
              onClick={() => navigate({ to: "/sign-up" })}
            >
              {tCommon("buttons.signUp")}
            </button>
          </div>
        </Box>
      )}
    </>
  );
}
