/**
 * PublicExplorePage - Public-facing explore page for unauthenticated users
 * Features a persistent filter sidebar on desktop with collapsible sections
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader,
  Center,
  Alert,
  Text,
  Stack,
  Box,
  Group,
  Title,
  Checkbox,
  Button,
  TextInput,
  Badge,
  Drawer,
  Card,
  Container,
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
import styles from "./PublicExplorePage.module.css";

export function PublicExplorePage() {
  const navigate = useNavigate();
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    sizes: [],
    search: "",
  });

  // Category options with translations
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

  // Determine which size categories to show based on selected post types
  const visibleSizeCategories = useMemo(() => {
    const selectedTypes = filters.types;
    return SIZE_CATEGORY_CONFIG.map((config) => {
      const isVisible =
        selectedTypes.length === 0 ||
        config.postTypes.some((pt) => selectedTypes.includes(pt));
      return { ...config, isVisible };
    }).filter((c) => c.isVisible);
  }, [filters.types]);

  // Ref for intersection observer sentinel element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search to avoid too many API calls
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);

  // Build query filters for API
  const queryFilters = useMemo<PostFilters>(() => {
    const apiFilters: PostFilters = {};

    // Start with manually selected types
    const typesSet = new Set<PostType>(filters.types);

    // Process prefixed sizes: extract raw sizes and auto-add corresponding types
    if (filters.sizes.length > 0) {
      const rawSizes: string[] = [];

      for (const sizeKey of filters.sizes) {
        const { category, size } = parseSizeKey(sizeKey);
        rawSizes.push(size);

        // Find the size category config and add its post types
        const categoryConfig = SIZE_CATEGORY_CONFIG.find((c) => c.category === category);
        if (categoryConfig) {
          for (const postType of categoryConfig.postTypes) {
            typesSet.add(postType);
          }
        }
      }

      // Remove duplicates from raw sizes
      apiFilters.sizes = [...new Set(rawSizes)];
    }

    // Only include types filter if we have types to filter by
    if (typesSet.size > 0) {
      apiFilters.types = [...typesSet];
    }

    if (debouncedSearch.trim()) {
      apiFilters.search = debouncedSearch.trim();
    }

    return apiFilters;
  }, [filters.types, filters.sizes, debouncedSearch]);

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

  // Intersection Observer for infinite scroll
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

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.sizes.length > 0 ||
    filters.search.trim() !== "";
  const activeFilterCount = filters.types.length + filters.sizes.length;

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    // Clear sizes when category changes to avoid confusion
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
        rightSection={
          filters.search && (
            <IconX
              size={14}
              style={{ cursor: "pointer" }}
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
            />
          ))}
        </Stack>
      </CollapsibleFilterSection>

      {/* Size Filters - Separate dropdown per category */}
      {visibleSizeCategories.map((categoryConfig) => {
        // Count active sizes in this category using prefixed keys
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
                  />
                );
              })}
            </Group>
          </CollapsibleFilterSection>
        );
      })}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconX size={14} />}
          onClick={handleClearFilters}
          fullWidth
        >
          {tCommon("buttons.clearAll")}
        </Button>
      )}
    </Stack>
  );

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error instanceof Error ? error.message : t("errors.failedToLoad")}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container size="xl" py="lg">
        <div className={styles.layout}>
          {/* Desktop Filter Sidebar - Always visible */}
          <Box visibleFrom="md" className={styles.sidebar}>
            <Card radius="lg" withBorder p="md" className={styles.sidebarCard}>
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconAdjustments size={20} />
                  <Text fw={600}>{t("filters.title")}</Text>
                </Group>
              </Group>
              {filterContent}
            </Card>
          </Box>

          {/* Main Content */}
          <Box className={styles.content}>
            {/* Header */}
            <Title order={2} mb="lg">{t("title")}</Title>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <Group gap="xs" mb="md">
                {filters.search.trim() && (
                  <Badge
                    variant="light"
                    size="lg"
                    rightSection={
                      <IconX
                        size={12}
                        style={{ cursor: "pointer" }}
                        onClick={() => setFilters({ ...filters, search: "" })}
                      />
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {t("search.label")}: "{filters.search}"
                  </Badge>
                )}
                {filters.types.map((type) => (
                  <Badge
                    key={type}
                    variant="light"
                    size="lg"
                    rightSection={
                      <IconX
                        size={12}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleTypeToggle(type)}
                      />
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {typeOptions.find((o) => o.value === type)?.label}
                  </Badge>
                ))}
                {filters.sizes.map((sizeKey) => {
                  const { category, size } = parseSizeKey(sizeKey);
                  const categoryConfig = SIZE_CATEGORY_CONFIG.find((c) => c.category === category);
                  const displayLabel = categoryConfig?.formatLabel
                    ? categoryConfig.formatLabel(size)
                    : size;
                  return (
                    <Badge
                      key={sizeKey}
                      variant="light"
                      size="lg"
                      rightSection={
                        <IconX
                          size={12}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSizeToggle(category, size)}
                        />
                      }
                      style={{ cursor: "pointer" }}
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
            )}

            {/* Results Count */}
            <Text size="sm" c="dimmed" mb="md">
              {totalCount} {totalCount === 1 ? t("results.listing") : t("results.listings")}
              {hasActiveFilters && ` ${t("results.found")}`}
            </Text>

            {/* Loading State */}
            {isLoading ? (
              <Center h={300}>
                <Loader size="lg" />
              </Center>
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
                          <Button variant="subtle" size="sm" onClick={handleClearFilters}>
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
                          <Button variant="subtle" size="sm" onClick={handleClearFilters}>
                            {t("filters.clearFilters")}
                          </Button>
                        )}
                      </Stack>
                    </Center>
                  ) : (
                    <Stack gap={0}>
                      {posts.map((post) => (
                        <PostFeedItem key={post.id} post={post} linkPrefix="/explore" />
                      ))}
                    </Stack>
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

        {/* Mobile Filter Drawer - Opens from bottom */}
        <Drawer
          opened={drawerOpened}
          onClose={closeDrawer}
          title={
            <Group gap="xs">
              <IconAdjustments size={20} />
              <Text fw={600}>{t("filters.title")}</Text>
            </Group>
          }
          size="70%"
          position="bottom"
          radius="lg"
          hiddenFrom="md"
        >
          {filterContent}
        </Drawer>
      </Container>

      {/* Mobile Sticky Filter Button - Outside Container for proper fixed positioning */}
      <Box hiddenFrom="md" className={styles.filterButtonWrapper}>
        <Button
          variant="default"
          leftSection={<IconAdjustments size={18} />}
          rightSection={
            activeFilterCount > 0 && (
              <Badge size="sm" circle variant="filled">
                {activeFilterCount}
              </Badge>
            )
          }
          onClick={openDrawer}
          radius="xl"
          className={styles.filterButton}
        >
          {t("filters.title")}
        </Button>
      </Box>

      {/* Mobile Sticky Bottom Bar - Outside Container for proper fixed positioning */}
      <Box hiddenFrom="md" className={styles.mobileBottomBar}>
        <div className={styles.mobileBottomBarContent}>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate({ to: "/login" })}
          >
            {tCommon("buttons.logIn")}
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/sign-up" })}
          >
            {tCommon("buttons.signUp")}
          </Button>
        </div>
      </Box>
    </>
  );
}
