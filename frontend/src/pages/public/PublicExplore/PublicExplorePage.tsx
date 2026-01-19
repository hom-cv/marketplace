/**
 * PublicExplorePage - Public-facing explore page with Soft & Airy design
 * Features: Horizontal filter chips on mobile, collapsible sidebar on desktop
 */

import { useState, useMemo, useEffect } from "react";
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
import { SIZE_CATEGORY_CONFIG } from "@/api/types/post";
import {
  type FiltersState,
  ITEMS_PER_PAGE,
  createSizeKey,
  parseSizeKey,
} from "@/utils/filterHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import styles from "./PublicExplorePage.module.css";

export function PublicExplorePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/explore" });
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>(() => {
    // Initialize filters from URL params
    const initialTypes: PostType[] = [];
    const category = searchParams?.category;
    if (category && ["SHIRT", "PANTS", "JACKET", "SHOES", "ACCESSORIES", "OTHER"].includes(category.toUpperCase())) {
      initialTypes.push(category.toUpperCase() as PostType);
    }
    return {
      types: initialTypes,
      sizes: [],
      search: searchParams?.q || "",
    };
  });

  // Sync URL changes to filters (e.g., when navigating from home page)
  useEffect(() => {
    const category = searchParams?.category;
    const q = searchParams?.q;
    const newTypes: PostType[] = [];
    if (category && ["SHIRT", "PANTS", "JACKET", "SHOES", "ACCESSORIES", "OTHER"].includes(category.toUpperCase())) {
      newTypes.push(category.toUpperCase() as PostType);
    }
    setFilters(prev => ({
      ...prev,
      types: newTypes.length > 0 ? newTypes : prev.types,
      search: q || prev.search,
    }));
  }, [searchParams?.category, searchParams?.q]);

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

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes, sizes: [] });
    scrollToTop();
  };

  const handleSizeToggle = (category: SizeCategory, size: string) => {
    const sizeKey = createSizeKey(category, size);
    const newSizes = filters.sizes.includes(sizeKey)
      ? filters.sizes.filter((s) => s !== sizeKey)
      : [...filters.sizes, sizeKey];
    setFilters({ ...filters, sizes: newSizes });
    scrollToTop();
  };

  const handleClearFilters = () => {
    setFilters({ types: [], sizes: [], search: "" });
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
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
          radius="lg"
          size="sm"
          classNames={{ input: styles.searchInput }}
          rightSection={
            filters.search && (
              <IconX
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setFilters({ ...filters, search: "" })}
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
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
            radius="lg"
            size="sm"
            classNames={{ input: styles.mobileSearchInput }}
            rightSection={
              filters.search && (
                <IconX
                  size={12}
                  style={{ cursor: "pointer" }}
                  onClick={() => setFilters({ ...filters, search: "" })}
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
                  {filters.search.trim() && (
                    <Badge
                      variant="light"
                      size="md"
                      radius="md"
                      rightSection={
                        <IconX
                          size={12}
                          style={{ cursor: "pointer" }}
                          onClick={() => setFilters({ ...filters, search: "" })}
                        />
                      }
                      className={styles.activeBadge}
                    >
                      {t("search.label")}: "{filters.search}"
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
