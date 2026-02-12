/**
 * PublicExplorePage - Public-facing explore page for unauthenticated users
 * Features a persistent filter sidebar on desktop with collapsible sections
 */

import { useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader,
  Stack,
  Box,
  Group,
  Checkbox,
  TextInput,
  Drawer,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconAdjustments,
  IconX,
  IconSearch,
  IconCategory,
  IconRuler,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import type { PostType, PostFilters, SizeCategory } from "@/api/types/post";
import { SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  createSizeKey,
  parseSizeKey,
} from "@/utils/filterHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useIsAuthenticated } from "@/stores/authStore";
import styles from "./PublicExplorePage.module.css";

// Empty state component to avoid duplication between desktop and mobile views
function EmptyState({
  hasActiveFilters,
  onClearFilters,
  noMatchText,
  noListingsText,
  clearFiltersText,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  noMatchText: string;
  noListingsText: string;
  clearFiltersText: string;
}) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyStateText}>
        {hasActiveFilters ? noMatchText : noListingsText}
      </p>
      {hasActiveFilters && (
        <button className={styles.emptyStateClear} onClick={onClearFilters}>
          {clearFiltersText}
        </button>
      )}
    </div>
  );
}

export function PublicExplorePage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    sizes: [],
    search: "",
  });

  const typeOptions: { value: PostType; label: string }[] = useMemo(
    () => [
      { value: "SHIRT", label: tListings("categories.shirt") },
      { value: "PANTS", label: tListings("categories.pants") },
      { value: "JACKET", label: tListings("categories.jacket") },
      { value: "SHOES", label: tListings("categories.shoes") },
      { value: "ACCESSORIES", label: tListings("categories.accessories") },
      { value: "OTHER", label: tListings("categories.other") },
    ],
    [tListings]
  );

  const typeLabelsMap = useMemo(
    () => new Map(typeOptions.map((o) => [o.value, o.label])),
    [typeOptions]
  );

  const sizeCategoryMap = useMemo(
    () => new Map(SIZE_CATEGORY_CONFIG.map((c) => [c.category, c])),
    []
  );

  const visibleSizeCategories = useMemo(() => {
    const selectedTypes = filters.types;
    return SIZE_CATEGORY_CONFIG.map((config) => {
      const isVisible =
        selectedTypes.length === 0 ||
        config.postTypes.some((pt) => selectedTypes.includes(pt));
      return { ...config, isVisible };
    }).filter((c) => c.isVisible);
  }, [filters.types]);

  const [debouncedSearch] = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo<PostFilters>(() => {
    const apiFilters: PostFilters = {};

    const typesSet = new Set<PostType>(filters.types);

    if (filters.sizes.length > 0) {
      const rawSizes: string[] = [];

      for (const sizeKey of filters.sizes) {
        const { category, size } = parseSizeKey(sizeKey);
        rawSizes.push(size);

        const categoryConfig = sizeCategoryMap.get(category);
        if (categoryConfig) {
          for (const postType of categoryConfig.postTypes) {
            typesSet.add(postType);
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
    queryFn: ({ pageParam = 0 }) => getPosts(pageParam, ITEMS_PER_PAGE, queryFilters),
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
  const activeFilterCount = filters.types.length + filters.sizes.length;

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes, sizes: [] });
  };

  const handleSizeToggle = (category: SizeCategory, size: string) => {
    const sizeKey = createSizeKey(category, size);
    const newSizes = filters.sizes.includes(sizeKey)
      ? filters.sizes.filter((s) => s !== sizeKey)
      : [...filters.sizes, sizeKey];
    setFilters({ ...filters, sizes: newSizes });
  };

  const handleClearFilters = () => {
    setFilters({ types: [], sizes: [], search: "" });
  };

  // Reusable filter content for both sidebar and drawer
  const filterContent = (
    <Stack gap="lg">
      {/* Search Input */}
      <TextInput
        placeholder={t("search.placeholder")}
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
        radius="xs"
        className={styles.searchInput}
        rightSection={
          filters.search && (
            <IconX
              size={14}
              className={styles.clearIcon}
              onClick={() => setFilters({ ...filters, search: "" })}
            />
          )
        }
      />

      {/* Category Filter */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.category")}
        icon={<IconCategory size={18} />}
        badge={filters.types.length}
        defaultOpen={true}
      >
        <Stack gap="xs">
          {typeOptions.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={filters.types.includes(option.value)}
              onChange={() => handleTypeToggle(option.value)}
              radius="xs"
              className={styles.checkbox}
            />
          ))}
        </Stack>
      </CollapsibleFilterSection>

      {/* Size Filters */}
      {visibleSizeCategories.map((categoryConfig) => {
        const activeSizesInCategory = filters.sizes.filter((sizeKey) => {
          const { category } = parseSizeKey(sizeKey);
          return category === categoryConfig.category;
        }).length;

        return (
          <CollapsibleFilterSection
            key={categoryConfig.category}
            title={tListings(categoryConfig.labelKey)}
            icon={<IconRuler size={18} />}
            badge={activeSizesInCategory}
            defaultOpen={false}
          >
            <Group gap="xs" wrap="wrap">
              {categoryConfig.sizes.map((size) => {
                const sizeKey = createSizeKey(categoryConfig.category, size);
                return (
                  <Checkbox
                    key={sizeKey}
                    label={categoryConfig.formatLabel ? categoryConfig.formatLabel(size) : size}
                    size="xs"
                    checked={filters.sizes.includes(sizeKey)}
                    onChange={() => handleSizeToggle(categoryConfig.category, size)}
                    radius="xs"
                    className={styles.checkbox}
                  />
                );
              })}
            </Group>
          </CollapsibleFilterSection>
        );
      })}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button className={styles.clearButton} onClick={handleClearFilters}>
          <IconX size={14} />
          <span>{tCommon("buttons.clearAll")}</span>
        </button>
      )}
    </Stack>
  );

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <div className={styles.emptyState}>
              <IconAlertCircle size={24} color="var(--color-error)" />
              <p className={styles.emptyStateText}>
                {error instanceof Error ? error.message : t("errors.failedToLoad")}
              </p>
            </div>
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
                <span className={styles.sidebarTitle}>{t("filters.title")}</span>
              </div>
              {filterContent}
            </div>
          </Box>

          {/* Main Content */}
          <div className={`${styles.content} ${isAuthenticated ? styles.contentAuth : ''}`}>
            {/* Header */}
            <header className={styles.header}>
              <h1 className={styles.title}>{t("title")}</h1>
            </header>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className={styles.filterBadges}>
                {filters.search.trim() && (
                  <div
                    className={styles.filterBadge}
                    onClick={() => setFilters({ ...filters, search: "" })}
                  >
                    <span>{t("search.label")}: "{filters.search}"</span>
                    <span className={styles.filterBadgeRemove}>
                      <IconX size={12} />
                    </span>
                  </div>
                )}
                {filters.types.map((type) => (
                  <div
                    key={type}
                    className={styles.filterBadge}
                    onClick={() => handleTypeToggle(type)}
                  >
                    <span>{typeLabelsMap.get(type)}</span>
                    <span className={styles.filterBadgeRemove}>
                      <IconX size={12} />
                    </span>
                  </div>
                ))}
                {filters.sizes.map((sizeKey) => {
                  const { category, size } = parseSizeKey(sizeKey);
                  const categoryConfig = sizeCategoryMap.get(category);
                  const displayLabel = categoryConfig?.formatLabel
                    ? categoryConfig.formatLabel(size)
                    : size;
                  return (
                    <div
                      key={sizeKey}
                      className={styles.filterBadge}
                      onClick={() => handleSizeToggle(category, size)}
                    >
                      <span>{displayLabel}</span>
                      <span className={styles.filterBadgeRemove}>
                        <IconX size={12} />
                      </span>
                    </div>
                  );
                })}
                <button className={styles.clearAllBadge} onClick={handleClearFilters}>
                  <IconX size={12} />
                  <span>{tCommon("buttons.clearAll")}</span>
                </button>
              </div>
            )}

            {/* Results Count */}
            <p className={styles.resultsCount}>
              {totalCount} {totalCount === 1 ? t("results.listing") : t("results.listings")}
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
                      hasActiveFilters={hasActiveFilters}
                      onClearFilters={handleClearFilters}
                      noMatchText={t("results.noMatch")}
                      noListingsText={t("results.noListings")}
                      clearFiltersText={t("filters.clearFilters")}
                    />
                  ) : (
                    <div className={styles.grid}>
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} linkPrefix="/explore" />
                      ))}
                    </div>
                  )}
                </Box>

                {/* Mobile Feed */}
                <Box hiddenFrom="sm">
                  {posts.length === 0 ? (
                    <EmptyState
                      hasActiveFilters={hasActiveFilters}
                      onClearFilters={handleClearFilters}
                      noMatchText={t("results.noMatch")}
                      noListingsText={t("results.noListings")}
                      clearFiltersText={t("filters.clearFilters")}
                    />
                  ) : (
                    <Stack gap={0}>
                      {posts.map((post) => (
                        <PostFeedItem key={post.id} post={post} linkPrefix="/explore" />
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
                      <p className={styles.endMessage}>
                        {t("results.noMore")}
                      </p>
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
        {filterContent}
      </Drawer>

      {/* Mobile Sticky Filter Button */}
      <Box hiddenFrom="md" className={isAuthenticated ? styles.filterButtonWrapperAuth : styles.filterButtonWrapper}>
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
