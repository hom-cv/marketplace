/**
 * Liked Listings Page - View all posts the user has liked
 */

import { useMemo, useRef, useCallback, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Loader,
  Center,
  Alert,
  Text,
  Stack,
  Box,
  Title,
  Container,
} from "@mantine/core";
import { IconAlertCircle, IconHeart } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { getLikedPosts } from "@/api/likes";
import { PostCard } from "@/components/PostCard";
import { PostFeedItem } from "@/components/PostFeedItem";
import styles from "./LikedListings.module.css";

const ITEMS_PER_PAGE = 20;

export function LikedListingsPage() {
  const { t } = useTranslation("common");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["likedPosts"],
    queryFn: ({ pageParam = 0 }) => getLikedPosts(pageParam, ITEMS_PER_PAGE),
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

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error instanceof Error ? error.message : t("errors.failedToLoad")}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Title order={2}>
          <IconHeart size={24} style={{ marginRight: 8, verticalAlign: "middle" }} />
          {t("likes.title")}
        </Title>

        <Text size="sm" c="dimmed">
          {totalCount} {totalCount === 1 ? "listing" : "listings"}
        </Text>

        {/* Desktop Grid */}
        <Box visibleFrom="sm">
          {posts.length === 0 ? (
            <Center h={200}>
              <Stack align="center" gap="xs">
                <IconHeart size={48} color="gray" />
                <Text c="dimmed">{t("likes.noLikes")}</Text>
                <Text size="sm" c="dimmed">{t("likes.noLikesHint")}</Text>
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
                <IconHeart size={48} color="gray" />
                <Text c="dimmed">{t("likes.noLikes")}</Text>
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

        {/* Infinite scroll sentinel */}
        {posts.length > 0 && (
          <>
            <div ref={loadMoreRef} style={{ height: 1 }} />
            {isFetchingNextPage && (
              <Center py="xl">
                <Loader size="sm" />
              </Center>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
