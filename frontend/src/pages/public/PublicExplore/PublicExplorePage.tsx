/**
 * PublicExplorePage - Public-facing explore page for unauthenticated users
 * Features a persistent filter sidebar on desktop with collapsible sections
 */

import { useMemo, useState, useCallback } from "react";
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
import { useBrands } from "@/hooks/useBrands";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { ExploreFiltersPanel } from "@/components/ExploreFiltersPanel";
import { FilterBadge } from "@/components/FilterBadge";
import { EmptyState } from "@/components/EmptyState";
import type {
  PostCategory,
  PostFilters,
  SizeGroup,
} from "@/api/types/post";
import { SIZE_GROUP_CONFIG } from "@/api/types/post";
import { DEPARTMENT_GENDERS, type Department } from "@/constants/departments";
import {
  categoryLabel as tCategoryLabel,
  subcategoryLabel as tSubcategoryLabel,
} from "@/constants/postTypes";
import { useCategoryTree } from "@/hooks/useCategoryTree";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  parseSizeKey,
  toggleCategoryFilter,
  toggleSubcategoryFilter,
  toggleSizeFilter,
  toggleBrandFilter,
  toggleTagFilter,
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
    categories = [],
    subcategories = [],
    sizes = [],
    brands = [],
    tags = [],
    search = "",
  } = useSearch({ from: "/explore" });
  const filters: FiltersState = {
    categories,
    subcategories,
    sizes,
    brands,
    tags,
  };

  const onFiltersChange = useCallback(
    (updater: FiltersState | ((prev: FiltersState) => FiltersState)) => {
      navigate({
        to: "/explore",
        replace: true,
        search: (prev) => {
          const current: FiltersState = {
            categories: prev.categories ?? [],
            subcategories: prev.subcategories ?? [],
            sizes: prev.sizes ?? [],
            brands: prev.brands ?? [],
            tags: prev.tags ?? [],
          };
          const next =
            typeof updater === "function" ? updater(current) : updater;
          return {
            ...prev,
            categories: next.categories.length ? next.categories : undefined,
            subcategories: next.subcategories.length
              ? next.subcategories
              : undefined,
            sizes: next.sizes.length ? next.sizes : undefined,
            brands: next.brands.length ? next.brands : undefined,
            tags: next.tags.length ? next.tags : undefined,
          };
        },
      });
    },
    [navigate],
  );

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

  const { data: taxonomy } = useCategoryTree();

  const handleDepartmentChange = useCallback(
    (dept: Department | undefined) => {
      // Switching department changes the tree, so drop the category-scoped picks
      // (categories/subcategories) and the sizes chosen under them.
      navigate({
        to: "/explore",
        replace: true,
        search: (prev) => ({
          ...prev,
          department: dept,
          categories: undefined,
          subcategories: undefined,
          sizes: undefined,
        }),
      });
    },
    [navigate],
  );
  const categoryLabel = useCallback(
    (c: PostCategory) => tCategoryLabel(tListings, taxonomy, c),
    [taxonomy, tListings],
  );

  const sizeGroupMap = useMemo(
    () => new Map(SIZE_GROUP_CONFIG.map((c) => [c.group, c])),
    [],
  );

  const { data: brandList } = useBrands();
  const brandNameBySlug = useMemo(
    () => new Map((brandList ?? []).map((b) => [b.slug, b.name])),
    [brandList],
  );

  const queryFilters: PostFilters = {};
  {
    if (categories.length > 0) queryFilters.categories = categories;
    if (subcategories.length > 0) queryFilters.subcategories = subcategories;
    if (sizes.length > 0) {
      // Group-qualified keys ("SHOE-39"); the backend applies each size only to
      // posts of its own group, so shoe-40 doesn't collide with waist-40.
      queryFilters.sizes = [...new Set(sizes)];
    }
    if (department) queryFilters.genders = DEPARTMENT_GENDERS[department];
    if (brands.length > 0) queryFilters.brands = brands;
    if (tags.length > 0) queryFilters.tags = tags;
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
    categories.length > 0 ||
    subcategories.length > 0 ||
    sizes.length > 0 ||
    brands.length > 0 ||
    tags.length > 0 ||
    search.trim() !== "";

  const activeFilterCount =
    categories.length +
    subcategories.length +
    sizes.length +
    brands.length +
    tags.length;

  const handleBrandToggle = (slug: string) =>
    onFiltersChange((prev) => toggleBrandFilter(prev, slug));

  const handleCategoryToggle = (category: PostCategory) =>
    onFiltersChange((prev) => toggleCategoryFilter(prev, category));

  const handleSubcategoryToggle = (subcategory: string) =>
    onFiltersChange((prev) => toggleSubcategoryFilter(prev, subcategory));

  const handleSizeToggle = (group: SizeGroup, size: string) =>
    onFiltersChange((prev) => toggleSizeFilter(prev, group, size));

  const handleClearAllFilters = () => {
    setSearchInput("");
    navigate({
      to: "/explore",
      replace: true,
      search: (prev) => ({
        ...prev,
        categories: undefined,
        subcategories: undefined,
        sizes: undefined,
        brands: undefined,
        tags: undefined,
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
                department={department}
                onDepartmentChange={handleDepartmentChange}
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
                  <FilterBadge label={`"${search}"`} onRemove={clearSearch} />
                )}
                {filters.categories.map((category) => (
                  <FilterBadge
                    key={category}
                    label={categoryLabel(category)}
                    onRemove={() => handleCategoryToggle(category)}
                  />
                ))}
                {filters.subcategories.map((subcategory) => (
                  <FilterBadge
                    key={subcategory}
                    label={tSubcategoryLabel(tListings, taxonomy, subcategory)}
                    onRemove={() => handleSubcategoryToggle(subcategory)}
                  />
                ))}
                {filters.sizes.map((sizeKey) => {
                  const { group, size } = parseSizeKey(sizeKey);
                  const groupConfig = sizeGroupMap.get(group);
                  const displayLabel = groupConfig?.formatLabel
                    ? groupConfig.formatLabel(size)
                    : size;
                  return (
                    <FilterBadge
                      key={sizeKey}
                      label={displayLabel}
                      onRemove={() => handleSizeToggle(group, size)}
                    />
                  );
                })}
                {brands.map((slug) => (
                  <FilterBadge
                    key={slug}
                    label={brandNameBySlug.get(slug) ?? slug}
                    onRemove={() => handleBrandToggle(slug)}
                  />
                ))}
                {tags.map((tag) => (
                  <FilterBadge
                    key={tag}
                    label={`#${tag}`}
                    onRemove={() =>
                      onFiltersChange((prev) => toggleTagFilter(prev, tag))
                    }
                  />
                ))}
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
          department={department}
          onDepartmentChange={handleDepartmentChange}
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
