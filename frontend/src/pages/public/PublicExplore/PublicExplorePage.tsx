/**
 * PublicExplorePage - Public-facing explore page for unauthenticated users
 * Features a persistent filter sidebar on desktop with collapsible sections
 */

import { useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader, Stack, Box, Drawer, TextInput, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconAdjustments,
  IconX,
  IconSearch,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { usePublicPosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { ExploreFiltersPanel } from "@/components/ExploreFiltersPanel";
import { FilterBadge } from "@/components/FilterBadge";
import { EmptyState } from "@/components/EmptyState";
import type { PostType, PostFilters, SizeCategory } from "@/api/types/post";
import { POST_TYPES, SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import { DEPARTMENT_GENDERS } from "@/constants/departments";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  parseSizeKey,
  toggleTypeFilter,
  toggleSizeFilter,
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
  const {
    department,
    types = [],
    sizes = [],
    search = "",
  } = useSearch({ from: "/explore" });
  const filters: FiltersState = { types, sizes };

  // Sidebar filters (types/sizes) write to the URL immediately on toggle.
  const onFiltersChange = (
    updater: FiltersState | ((prev: FiltersState) => FiltersState),
  ) => {
    const next = typeof updater === "function" ? updater(filters) : updater;
    navigate({
      to: "/explore",
      replace: true,
      search: (prev) => ({
        ...prev,
        types: next.types.length ? next.types : undefined,
        sizes: next.sizes.length ? next.sizes : undefined,
      }),
    });
  };

  // Search is separate and submit-based (Enter/clear only) — the input is local
  // and only hits the URL/server on submit, so typing costs nothing. Seed from
  // the URL and re-sync on external changes (shared link, back/forward, clear).
  const [searchInput, setSearchInput] = useState(search);
  const [prevUrlSearch, setPrevUrlSearch] = useState(search);
  if (search !== prevUrlSearch) {
    setPrevUrlSearch(search);
    setSearchInput(search);
  }
  const submitSearch = () =>
    navigate({
      to: "/explore",
      search: (prev) => ({ ...prev, search: searchInput.trim() || undefined }),
    });
  const clearSearch = () => {
    setSearchInput("");
    navigate({
      to: "/explore",
      search: (prev) => ({ ...prev, search: undefined }),
    });
  };

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

  const queryFilters: PostFilters = {};
  {
    const typesSet = new Set<PostType>(types);
    const hasExplicitTypes = types.length > 0;

    if (sizes.length > 0) {
      const rawSizes: string[] = [];
      for (const sizeKey of sizes) {
        const { category, size } = parseSizeKey(sizeKey);
        rawSizes.push(size);
        if (!hasExplicitTypes) {
          const categoryConfig = sizeCategoryMap.get(category);
          if (categoryConfig) {
            for (const postType of categoryConfig.postTypes) {
              typesSet.add(postType);
            }
          }
        }
      }
      queryFilters.sizes = [...new Set(rawSizes)];
    }

    if (typesSet.size > 0) queryFilters.types = [...typesSet];
    if (department) queryFilters.genders = DEPARTMENT_GENDERS[department];
    if (search.trim()) queryFilters.search = search.trim();
  }

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicPosts(queryFilters, ITEMS_PER_PAGE);

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
    types.length > 0 || sizes.length > 0 || search.trim() !== "";

  // Mobile filter-button badge counts only the sidebar filters (search is its
  // own top bar, not in the drawer).
  const activeFilterCount = types.length + sizes.length;

  const handleTypeToggle = (postType: PostType) =>
    onFiltersChange((prev) =>
      toggleTypeFilter(prev, postType, SIZE_CATEGORY_CONFIG),
    );

  const handleSizeToggle = (category: SizeCategory, size: string) =>
    onFiltersChange((prev) => toggleSizeFilter(prev, category, size));

  const handleClearAllFilters = () => {
    setSearchInput("");
    navigate({
      to: "/explore",
      replace: true,
      search: (prev) => ({
        ...prev,
        types: undefined,
        sizes: undefined,
        search: undefined,
      }),
    });
  };

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
                onFiltersChange={onFiltersChange}
              />
            </div>
          </Box>

          {/* Main Content */}
          <div
            className={`${styles.content} ${isAuthenticated ? styles.contentAuth : ""}`}
          >
            {/* Search bar — submit-based (Enter), separate from the filters */}
            <form
              className={styles.searchBar}
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <TextInput
                className={styles.searchField}
                placeholder={t("search.placeholder")}
                leftSection={<IconSearch size={16} />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.currentTarget.value)}
                radius="xs"
                rightSection={
                  searchInput ? (
                    <IconX
                      size={14}
                      className={styles.searchClear}
                      onClick={clearSearch}
                    />
                  ) : null
                }
              />
              <Button type="submit" radius="xs">
                {t("search.label")}
              </Button>
            </form>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className={styles.filterBadges}>
                {search.trim() && (
                  <FilterBadge
                    label={`"${search}"`}
                    onRemove={clearSearch}
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
          onFiltersChange={onFiltersChange}
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
