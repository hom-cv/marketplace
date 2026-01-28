/**
 * PublicExplorePage - Public-facing explore page with Soft & Airy design
 * Features: Horizontal filter chips on mobile, collapsible sidebar on desktop
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Loader,
  Center,
  Alert,
  Text,
  Stack,
  Box,
  Group,
  Title,
  Button,
  TextInput,
  Badge,
  Drawer,
  Card,
  Container,
  Skeleton,
  ActionIcon,
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
import { CollapsibleFilterSection } from "@/components/CollapsibleFilterSection";
import type { PostType, PostFilters, SizeCategory } from "@/api/types/post";
import { SIZE_CATEGORY_CONFIG, POST_TYPES } from "@/api/types/post";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  createSizeKey,
  parseSizeKey,
} from "@/utils/filterHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import styles from "./PublicExplorePage.module.css";

/** Check if a string is a valid PostType */
function isValidPostType(value: string): value is PostType {
  return POST_TYPES.includes(value as PostType);
}

/** Parse comma-separated categories from URL */
function parseCategories(categoriesParam: string | undefined): PostType[] {
  if (!categoriesParam) return [];
  return categoriesParam
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(isValidPostType);
}

/** Parse comma-separated sizes from URL */
function parseSizes(sizesParam: string | undefined): string[] {
  if (!sizesParam) return [];
  return sizesParam.split(",").map((s) => s.trim()).filter(Boolean);
}

export function PublicExplorePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/explore" });
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  // Derive filter state from URL (URL is the single source of truth for types/sizes)
  const urlFilters = useMemo(() => ({
    types: parseCategories(searchParams?.categories),
    sizes: parseSizes(searchParams?.sizes),
    search: searchParams?.q || "",
  }), [searchParams?.categories, searchParams?.sizes, searchParams?.q]);

  // Local search state for responsive typing (syncs to URL on debounce)
  const [localSearch, setLocalSearch] = useState(urlFilters.search);

  // Sync local search when URL changes (e.g., navigation from another page)
  useEffect(() => {
    setLocalSearch(urlFilters.search);
  }, [urlFilters.search]);

  // Debounce the local search value
  const [debouncedLocalSearch] = useDebouncedValue(localSearch, 300);

  // Sync debounced search to URL
  // Note: urlFilters.search is intentionally excluded from deps to prevent infinite loops:
  // localSearch -> debounce -> updateUrl -> urlFilters.search changes -> repeat
  useEffect(() => {
    if (debouncedLocalSearch !== urlFilters.search) {
      updateUrlFilters({ search: debouncedLocalSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocalSearch]);

  // Update URL with new filters
  const updateUrlFilters = useCallback((updates: Partial<FiltersState>) => {
    const newFilters = {
      types: updates.types ?? urlFilters.types,
      sizes: updates.sizes ?? urlFilters.sizes,
      search: updates.search ?? urlFilters.search,
    };

    const search: { q?: string; categories?: string; sizes?: string } = {};

    if (newFilters.search.trim()) {
      search.q = newFilters.search.trim();
    }
    if (newFilters.types.length > 0) {
      search.categories = newFilters.types.join(",");
    }
    if (newFilters.sizes.length > 0) {
      search.sizes = newFilters.sizes.join(",");
    }

    navigate({ to: "/explore", search, replace: true });
  }, [navigate, urlFilters]);

  // Combined filters state (URL filters + local search for display)
  const filters: FiltersState = useMemo(() => ({
    types: urlFilters.types,
    sizes: urlFilters.sizes,
    search: localSearch,
  }), [urlFilters.types, urlFilters.sizes, localSearch]);

  const typeOptions: { value: PostType; label: string }[] = useMemo(
    () => POST_TYPES.map((type) => ({
      value: type,
      label: tListings(`categories.${type.toLowerCase()}`),
    })),
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

    if (debouncedLocalSearch.trim()) {
      apiFilters.search = debouncedLocalSearch.trim();
    }

    return apiFilters;
  }, [filters.types, filters.sizes, debouncedLocalSearch, sizeCategoryMap]);

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
    localSearch.trim() !== "";
  const activeFilterCount = filters.types.length + filters.sizes.length;

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    updateUrlFilters({ types: newTypes, sizes: [] });
    scrollToTop();
  };

  const handleSizeToggle = (category: SizeCategory, size: string) => {
    const sizeKey = createSizeKey(category, size);
    const newSizes = filters.sizes.includes(sizeKey)
      ? filters.sizes.filter((s) => s !== sizeKey)
      : [...filters.sizes, sizeKey];
    updateUrlFilters({ sizes: newSizes });
    scrollToTop();
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    updateUrlFilters({ types: [], sizes: [], search: "" });
    scrollToTop();
  };

  // Loading skeleton for cards - matches PostCard aspect-ratio 4:5
  const LoadingSkeleton = () => (
    <div className={styles.grid}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} padding={0} radius="lg" withBorder className={styles.skeletonCard}>
          <Box className={styles.skeletonImage}>
            <Skeleton height="100%" radius={0} />
          </Box>
          <Box p="sm">
            <Skeleton height={14} width="40%" mb={6} />
            <Skeleton height={12} width="70%" />
          </Box>
        </Card>
      ))}
    </div>
  );

  // Loading skeleton for mobile - matches PostCard aspect-ratio 4:5
  const MobileLoadingSkeleton = () => (
    <div className={styles.mobileGrid}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} padding={0} radius={0} className={styles.skeletonCard}>
          <Box className={styles.skeletonImage}>
            <Skeleton height="100%" radius={0} />
          </Box>
          <Box p="sm">
            <Skeleton height={14} width="40%" mb={6} />
            <Skeleton height={12} width="70%" />
          </Box>
        </Card>
      ))}
    </div>
  );

  // Reusable filter content for both sidebar and drawer
  const filterContent = (
    <Stack gap="md">
      {/* Search Input */}
      <div className={styles.searchSection}>
        <TextInput
          placeholder={t("search.placeholder")}
          leftSection={<IconSearch size={16} />}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.currentTarget.value)}
          radius="lg"
          size="sm"
          classNames={{ input: styles.searchInput }}
          rightSection={
            localSearch && (
              <IconX
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setLocalSearch("")}
              />
            )
          }
        />
      </div>

      {/* Category Filter - Collapsible with Pill Style */}
      <CollapsibleFilterSection
        title={tCommon("filtersSidebar.category")}
        icon={<IconCategory size={16} />}
        badge={filters.types.length}
        defaultOpen={true}
      >
        <Group gap={6} wrap="wrap" className={styles.filterPillGroup}>
          {typeOptions.map((option) => (
            <Badge
              key={option.value}
              size="sm"
              variant={filters.types.includes(option.value) ? "filled" : "light"}
              color={filters.types.includes(option.value) ? "blue" : "gray"}
              className={styles.filterPill}
              onClick={() => handleTypeToggle(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </Group>
      </CollapsibleFilterSection>

      {/* Size Filters - Collapsible with Pill Style */}
      {visibleSizeCategories.map((categoryConfig) => {
        const activeSizesInCategory = filters.sizes.filter((sizeKey) => {
          const { category } = parseSizeKey(sizeKey);
          return category === categoryConfig.category;
        }).length;

        return (
          <CollapsibleFilterSection
            key={categoryConfig.category}
            title={tListings(categoryConfig.labelKey)}
            icon={<IconRuler size={16} />}
            badge={activeSizesInCategory}
            defaultOpen={filters.types.length > 0}
          >
            <Group gap={6} wrap="wrap" className={styles.filterPillGroup}>
              {categoryConfig.sizes.map((size) => {
                const sizeKey = createSizeKey(categoryConfig.category, size);
                const isSelected = filters.sizes.includes(sizeKey);
                return (
                  <Badge
                    key={sizeKey}
                    size="sm"
                    variant={isSelected ? "filled" : "light"}
                    color={isSelected ? "blue" : "gray"}
                    className={styles.filterPill}
                    onClick={() => handleSizeToggle(categoryConfig.category, size)}
                  >
                    {categoryConfig.formatLabel ? categoryConfig.formatLabel(size) : size}
                  </Badge>
                );
              })}
            </Group>
          </CollapsibleFilterSection>
        );
      })}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="light"
          color="gray"
          size="sm"
          leftSection={<IconX size={14} />}
          onClick={handleClearFilters}
          fullWidth
          radius="md"
          className={styles.clearButton}
        >
          {tCommon("buttons.clearAll")}
        </Button>
      )}
    </Stack>
  );

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title={tCommon("status.error")} color="red" radius="lg">
          {error instanceof Error ? error.message : t("errors.failedToLoad")}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container size="xl" py="md" className={styles.container}>
        {/* Mobile Search Bar */}
        <Box hiddenFrom="md" mb="sm">
          <TextInput
            placeholder={t("search.placeholder")}
            leftSection={<IconSearch size={16} />}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.currentTarget.value)}
            radius="lg"
            size="sm"
            classNames={{ input: styles.mobileSearchInput }}
            rightSection={
              localSearch && (
                <IconX
                  size={12}
                  style={{ cursor: "pointer" }}
                  onClick={() => setLocalSearch("")}
                />
              )
            }
          />
        </Box>

        {/* Mobile Floating Filter Button */}
        <Box hiddenFrom="md" className={styles.floatingFilterButton}>
          <ActionIcon
            size="xl"
            radius="xl"
            variant="filled"
            color="blue"
            onClick={openDrawer}
            className={styles.filterFab}
          >
            <IconAdjustments size={22} />
            {activeFilterCount > 0 && (
              <Badge
                size="xs"
                circle
                color="red"
                className={styles.filterBadge}
              >
                {activeFilterCount}
              </Badge>
            )}
          </ActionIcon>
        </Box>

        <div className={styles.layout}>
          {/* Desktop Filter Sidebar */}
          <Box visibleFrom="md" className={styles.sidebar}>
            <Card radius="lg" withBorder p={0} className={styles.sidebarCard}>
              <div className={styles.sidebarHeader}>
                <Group gap="xs">
                  <IconAdjustments size={16} />
                  <Text size="sm" fw={500}>{t("filters.title")}</Text>
                </Group>
              </div>
              <div className={styles.sidebarContent}>
                {filterContent}
              </div>
            </Card>
          </Box>

          {/* Main Content */}
          <Box className={styles.content}>
            {/* Header */}
            <Group justify="space-between" align="center" mb="md" visibleFrom="md">
              <Title order={3}>{t("title")}</Title>
            </Group>

            {/* Active Filters Display - Desktop */}
            {hasActiveFilters && (
              <Box visibleFrom="md" mb="md">
                <Group gap="xs">
                  {localSearch.trim() && (
                    <Badge
                      variant="light"
                      size="md"
                      radius="md"
                      rightSection={
                        <IconX
                          size={12}
                          style={{ cursor: "pointer" }}
                          onClick={() => setLocalSearch("")}
                        />
                      }
                      className={styles.activeBadge}
                    >
                      {t("search.label")}: "{localSearch}"
                    </Badge>
                  )}
                  {filters.types.map((type) => (
                    <Badge
                      key={type}
                      variant="light"
                      size="md"
                      radius="md"
                      rightSection={
                        <IconX
                          size={12}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleTypeToggle(type)}
                        />
                      }
                      className={styles.activeBadge}
                    >
                      {typeLabelsMap.get(type)}
                    </Badge>
                  ))}
                  {filters.sizes.map((sizeKey) => {
                    const { category, size } = parseSizeKey(sizeKey);
                    const categoryConfig = sizeCategoryMap.get(category);
                    const displayLabel = categoryConfig?.formatLabel
                      ? categoryConfig.formatLabel(size)
                      : size;
                    return (
                      <Badge
                        key={sizeKey}
                        variant="light"
                        size="md"
                        radius="md"
                        rightSection={
                          <IconX
                            size={12}
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSizeToggle(category, size)}
                          />
                        }
                        className={styles.activeBadge}
                      >
                        {displayLabel}
                      </Badge>
                    );
                  })}
                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    leftSection={<IconX size={14} />}
                    onClick={handleClearFilters}
                  >
                    {tCommon("buttons.clearAll")}
                  </Button>
                </Group>
              </Box>
            )}

            {/* Results Count */}
            <Text size="sm" c="dimmed" mb="md">
              {totalCount} {totalCount === 1 ? t("results.listing") : t("results.listings")}
              {hasActiveFilters && ` ${t("results.found")}`}
            </Text>

            {/* Loading State */}
            {isLoading ? (
              <>
                <Box visibleFrom="sm">
                  <LoadingSkeleton />
                </Box>
                <Box hiddenFrom="sm">
                  <MobileLoadingSkeleton />
                </Box>
              </>
            ) : (
              <>
                {/* Desktop Grid */}
                <Box visibleFrom="sm">
                  {posts.length === 0 ? (
                    <Center h={200}>
                      <Stack align="center" gap="xs">
                        <Text c="dimmed">
                          {hasActiveFilters ? t("results.noMatch") : t("results.noListings")}
                        </Text>
                        {hasActiveFilters && (
                          <Button variant="subtle" size="sm" onClick={handleClearFilters} radius="md">
                            {t("filters.clearFilters")}
                          </Button>
                        )}
                      </Stack>
                    </Center>
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
                    <Center h={200}>
                      <Stack align="center" gap="xs">
                        <Text c="dimmed">
                          {hasActiveFilters ? t("results.noMatch") : t("results.noListings")}
                        </Text>
                        {hasActiveFilters && (
                          <Button variant="subtle" size="sm" onClick={handleClearFilters} radius="md">
                            {t("filters.clearFilters")}
                          </Button>
                        )}
                      </Stack>
                    </Center>
                  ) : (
                    <div className={styles.mobileGrid}>
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} linkPrefix="/explore" />
                      ))}
                    </div>
                  )}
                </Box>

                {/* Infinite scroll sentinel and loading indicator */}
                {posts.length > 0 && (
                  <>
                    <div ref={loadMoreRef} style={{ height: 1 }} />
                    {isFetchingNextPage && (
                      <Center py="xl">
                        <Loader size="sm" />
                      </Center>
                    )}
                    {!hasNextPage && posts.length >= ITEMS_PER_PAGE && (
                      <Text ta="center" c="dimmed" size="sm" py="md">
                        {t("results.noMore")}
                      </Text>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </div>

        {/* Mobile Filter Drawer */}
        <Drawer
          opened={drawerOpened}
          onClose={closeDrawer}
          title={
            <Group gap="xs">
              <IconAdjustments size={16} />
              <Text size="sm" fw={500}>{t("filters.title")}</Text>
            </Group>
          }
          size="85%"
          position="bottom"
          radius="lg"
          hiddenFrom="md"
          classNames={{ body: styles.drawerBody, content: styles.drawerContent }}
        >
          {filterContent}
        </Drawer>
      </Container>

      {/* Mobile Sticky Bottom Bar */}
      <Box hiddenFrom="md" className={styles.mobileBottomBar}>
        <div className={styles.mobileBottomBarContent}>
          <Button
            variant="default"
            size="sm"
            radius="lg"
            onClick={() => navigate({ to: "/login" })}
          >
            {tCommon("buttons.logIn")}
          </Button>
          <Button
            size="sm"
            radius="lg"
            onClick={() => navigate({ to: "/sign-up" })}
          >
            {tCommon("buttons.signUp")}
          </Button>
        </div>
      </Box>
    </>
  );
}
