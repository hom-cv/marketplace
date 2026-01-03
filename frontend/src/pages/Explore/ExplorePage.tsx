import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Loader,
  Center,
  Alert,
  Text,
  Stack,
  Box,
  Group,
  Title,
  Chip,
  RangeSlider,
  Collapse,
  Button,
  Paper,
  Badge,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconAdjustments, IconX, IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { ReportModal } from "@/components/ReportModal";
import { useReportModal } from "@/hooks/useReportModal";
import type { PostType, PostFilters } from "@/api/types/post";
import styles from "./ExplorePage.module.css";

interface FiltersState {
  types: PostType[];
  priceRange: [number, number];
  search: string;
}

const ITEMS_PER_PAGE = 20;

export function ExplorePage() {
  const { t } = useTranslation("explore");
  const { t: tCommon } = useTranslation("common");
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    priceRange: [0, 10000],
    search: "",
  });

  // Category options with translations
  const typeOptions: { value: PostType; label: string }[] = useMemo(() => [
    { value: "SHIRT", label: t("categories.shirts") },
    { value: "PANTS", label: t("categories.pants") },
    { value: "JACKET", label: t("categories.jackets") },
    { value: "SHOES", label: t("categories.shoes") },
    { value: "ACCESSORIES", label: t("categories.accessories") },
    { value: "OTHER", label: t("categories.other") },
  ], [t]);

  // Report modal state (lifted from PostCard)
  const reportModal = useReportModal();

  // Ref for intersection observer sentinel element
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search and price range to avoid too many API calls
  const [debouncedSearch] = useDebouncedValue(filters.search, 300);
  const [debouncedPriceRange] = useDebouncedValue(filters.priceRange, 300);

  // Build query filters for API
  const queryFilters = useMemo<PostFilters>(() => {
    const apiFilters: PostFilters = {};

    if (filters.types.length > 0) {
      apiFilters.types = filters.types;
    }
    if (debouncedPriceRange[0] > 0) {
      apiFilters.minPrice = debouncedPriceRange[0];
    }
    if (debouncedPriceRange[1] < 10000) {
      apiFilters.maxPrice = debouncedPriceRange[1];
    }
    if (debouncedSearch.trim()) {
      apiFilters.search = debouncedSearch.trim();
    }

    return apiFilters;
  }, [filters.types, debouncedPriceRange, debouncedSearch]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", queryFilters],
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
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 10000 ||
    filters.search.trim() !== "";
  const activeFilterCount =
    filters.types.length +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? 1 : 0) +
    (filters.search.trim() ? 1 : 0);

  const handleTypeToggle = (type: PostType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes });
  };

  const handleClearFilters = () => {
    setFilters({ types: [], priceRange: [0, 10000], search: "" });
  };

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error instanceof Error ? error.message : t("errors.failedToLoad")}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header with Search */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2}>{t("title")}</Title>
        <Group gap="xs">
          <TextInput
            placeholder={t("search.placeholder")}
            leftSection={<IconSearch size={16} />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.currentTarget.value })}
            style={{ minWidth: 200 }}
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
          {hasActiveFilters && (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={handleClearFilters}
            >
              {tCommon("buttons.clearAll")}
            </Button>
          )}
          <Button
            variant={filtersOpen ? "filled" : "light"}
            size="sm"
            leftSection={<IconAdjustments size={16} />}
            rightSection={
              activeFilterCount > 0 && (
                <Badge size="xs" circle variant="filled" color="white" c="blue">
                  {activeFilterCount}
                </Badge>
              )
            }
            onClick={toggleFilters}
          >
            {t("filters.title")}
          </Button>
        </Group>
      </Group>

      {/* Collapsible Filter Panel */}
      <Collapse in={filtersOpen}>
        <Paper p="md" radius="md" withBorder className={styles.filterPanel}>
          <Stack gap="md">
            {/* Category Chips */}
            <div>
              <Text size="sm" fw={500} mb="xs" c="dimmed">
                {t("filters.category")}
              </Text>
              <Group gap="xs">
                {typeOptions.map((option) => (
                  <Chip
                    key={option.value}
                    checked={filters.types.includes(option.value)}
                    onChange={() => handleTypeToggle(option.value)}
                    variant="outline"
                    radius="xl"
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>
            </div>

            {/* Price Range */}
            <div>
              <Text size="sm" fw={500} mb="xs" c="dimmed">
                {t("filters.priceRange")}
              </Text>
              <Group gap="md" align="flex-end">
                <Box style={{ flex: 1, maxWidth: 400 }}>
                  <RangeSlider
                    min={0}
                    max={10000}
                    step={100}
                    value={filters.priceRange}
                    onChange={(value) => setFilters({ ...filters, priceRange: value })}
                    labelAlwaysOn={false}
                    label={(value) => `฿${value.toLocaleString()}`}
                  />
                </Box>
                <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  ฿{filters.priceRange[0].toLocaleString()} - ฿{filters.priceRange[1].toLocaleString()}
                </Text>
              </Group>
            </div>
          </Stack>
        </Paper>
      </Collapse>

      {/* Active Filters Display */}
      {hasActiveFilters && !filtersOpen && (
        <Group gap="xs">
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
              Search: "{filters.search}"
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
          {(filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) && (
            <Badge
              variant="light"
              size="lg"
              rightSection={
                <IconX
                  size={12}
                  style={{ cursor: "pointer" }}
                  onClick={() => setFilters({ ...filters, priceRange: [0, 10000] })}
                />
              }
              style={{ cursor: "pointer" }}
            >
              ฿{filters.priceRange[0].toLocaleString()} - ฿{filters.priceRange[1].toLocaleString()}
            </Badge>
          )}
        </Group>
      )}

      {/* Results Count */}
      <Text size="sm" c="dimmed">
        {totalCount} {totalCount === 1 ? t("results.listing") : t("results.listings")}
        {hasActiveFilters && ` ${t("results.found")}`}
      </Text>

      {/* Desktop Grid */}
      <Box visibleFrom="sm">
        {posts.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <Text c="dimmed">{hasActiveFilters ? t("results.noMatch") : t("results.noListings")}</Text>
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
              <PostCard key={post.id} post={post} onReportClick={reportModal.openReport} />
            ))}
          </div>
        )}
      </Box>

      {/* Mobile Feed */}
      <Box hiddenFrom="sm">
        {posts.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <Text c="dimmed">{hasActiveFilters ? t("results.noMatch") : t("results.noListings")}</Text>
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
              <PostFeedItem key={post.id} post={post} />
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

      {/* Single shared ReportModal for all cards */}
      {reportModal.target && (
        <ReportModal
          opened={reportModal.opened}
          onClose={reportModal.close}
          reportType={reportModal.target.reportType}
          entityId={reportModal.target.entityId}
          entityName={reportModal.target.entityName}
        />
      )}
    </Stack>
  );
}
