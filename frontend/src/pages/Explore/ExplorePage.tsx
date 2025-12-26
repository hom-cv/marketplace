import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import type { PostType, PostFilters } from "@/api/types/post";
import styles from "./ExplorePage.module.css";

interface FiltersState {
  types: PostType[];
  priceRange: [number, number];
  search: string;
}

const typeOptions: { value: PostType; label: string }[] = [
  { value: "SHIRT", label: "Shirts" },
  { value: "PANTS", label: "Pants" },
  { value: "JACKET", label: "Jackets" },
  { value: "SHOES", label: "Shoes" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

export function ExplorePage() {
  const [filtersOpen, { toggle: toggleFilters }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    priceRange: [0, 10000],
    search: "",
  });

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
    data: postsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", queryFilters],
    queryFn: () => getPosts(0, 50, queryFilters),
  });

  const posts = postsResponse?.items ?? [];
  const totalCount = postsResponse?.total ?? 0;

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
        {error instanceof Error ? error.message : "Failed to load posts"}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header with Search */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2}>Explore</Title>
        <Group gap="xs">
          <TextInput
            placeholder="Search listings..."
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
              Clear all
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
            Filters
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
                Category
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
                Price Range
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
        {totalCount} {totalCount === 1 ? "listing" : "listings"}
        {hasActiveFilters && " found"}
      </Text>

      {/* Desktop Grid */}
      <Box visibleFrom="sm">
        {posts.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <Text c="dimmed">{hasActiveFilters ? "No listings match your filters" : "No listings yet"}</Text>
              {hasActiveFilters && (
                <Button variant="subtle" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <div className={styles.grid}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </Box>

      {/* Mobile Feed */}
      <Box hiddenFrom="sm">
        {posts.length === 0 ? (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <Text c="dimmed">{hasActiveFilters ? "No listings match your filters" : "No listings yet"}</Text>
              {hasActiveFilters && (
                <Button variant="subtle" size="sm" onClick={handleClearFilters}>
                  Clear filters
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
    </Stack>
  );
}
