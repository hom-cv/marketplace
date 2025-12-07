/**
 * Protected App Page - Main feed showing all marketplace listings
 * Desktop: Sidebar + 4-column Grid layout
 * Mobile Portrait: Instagram-style feed
 * Mobile Landscape: 2-column grid
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Container,
  SimpleGrid,
  Loader,
  Center,
  Alert,
  Button,
  Text,
  Stack,
  Box,
  Drawer,
  ActionIcon,
  Group,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconPlus, IconFilter } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { getPosts } from "@/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import { FiltersSidebar, type FiltersState } from "@/components/FiltersSidebar";
import styles from "./AppPage.module.css";

export function AppPage() {
  const navigate = useNavigate();
  const [filtersOpened, { open: openFilters, close: closeFilters }] = useDisclosure(false);
  const [filters, setFilters] = useState<FiltersState>({
    types: [],
    priceRange: [0, 1000],
  });

  const {
    data: posts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: () => getPosts(),
  });

  // Filter posts based on selected filters
  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    return posts.filter((post) => {
      if (filters.types.length > 0 && !filters.types.includes(post.type)) {
        return false;
      }
      const price = parseFloat(post.price);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false;
      }
      return true;
    });
  }, [posts, filters]);

  const hasActiveFilters = filters.types.length > 0 || filters.priceRange[0] > 0 || filters.priceRange[1] < 1000;

  if (isLoading) {
    return (
      <Center h="calc(100vh - 60px)">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error instanceof Error ? error.message : "Failed to load posts"}
        </Alert>
      </Container>
    );
  }

  const EmptyState = () => (
    <Center h={300}>
      <Stack align="center" gap="md">
        <Text c="dimmed" size="lg">
          {hasActiveFilters ? "No listings match your filters" : "No listings yet"}
        </Text>
        {!hasActiveFilters && (
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate({ to: "/app/posts/new" })}
          >
            Be the first to post
          </Button>
        )}
      </Stack>
    </Center>
  );

  return (
    <>
      {/* Mobile Filters Drawer */}
      <Drawer
        opened={filtersOpened}
        onClose={closeFilters}
        title="Filters"
        size="xs"
      >
        <FiltersSidebar filters={filters} onFiltersChange={setFilters} />
      </Drawer>

      {/* Desktop Layout */}
      <Box visibleFrom="md" className={styles.desktopLayout}>
        {/* Sidebar */}
        <Box className={styles.sidebar}>
          <FiltersSidebar filters={filters} onFiltersChange={setFilters} />
        </Box>

        {/* Main Content */}
        <Box className={styles.mainContent}>
          <Group justify="space-between" mb="lg">
            <Title order={2}>Listings</Title>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate({ to: "/app/posts/new" })}
            >
              Create Listing
            </Button>
          </Group>

          {filteredPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className={styles.dynamicGrid}>
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </Box>
      </Box>

      {/* Mobile Layout */}
      <Box hiddenFrom="md">
        {/* Floating Filter Button */}
        <ActionIcon
          className={styles.floatingButton}
          variant="light"
          size="xl"
          radius="xl"
          onClick={openFilters}
        >
          <IconFilter size={20} />
        </ActionIcon>

        {filteredPosts.length === 0 ? (
          <Container py="xl">
            <EmptyState />
          </Container>
        ) : (
          <>
            {/* Portrait: Instagram-style feed */}
            <Box className={styles.portraitOnly}>
              {filteredPosts.map((post) => (
                <PostFeedItem key={post.id} post={post} />
              ))}
            </Box>

            {/* Landscape: Grid of cards */}
            <Container py="md" className={styles.landscapeOnly}>
              <SimpleGrid cols={2} spacing="md">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </SimpleGrid>
            </Container>
          </>
        )}
      </Box>
    </>
  );
}
