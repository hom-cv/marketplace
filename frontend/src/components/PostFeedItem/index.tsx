/**
 * PostFeedItem component - Instagram-style feed item for mobile
 * Full-width image with user info and details below
 */

import { useMemo } from "react";
import { Box, Group, Text, Badge, Stack, Image } from "@mantine/core";
import { IconHeart } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/api/types/post";
import { useAuthStore } from "@/stores/authStore";
import { LikeButton } from "@/components/LikeButton";

interface PostFeedItemProps {
  post: Post;
  showLikeButton?: boolean;
  linkTo?: "public" | "app";
}

const typeColors: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

export function PostFeedItem({ post, showLikeButton = true, linkTo = "app" }: PostFeedItemProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");

  // Type labels with translations
  const typeLabels: Record<PostType, string> = useMemo(
    () => ({
      SHIRT: tListings("categories.shirt"),
      PANTS: tListings("categories.pants"),
      JACKET: tListings("categories.jacket"),
      SHOES: tListings("categories.shoes"),
      ACCESSORIES: tListings("categories.accessories"),
      OTHER: tListings("categories.other"),
    }),
    [tListings],
  );

  const handleClick = () => {
    if (linkTo === "public") {
      navigate({ to: "/posts/$postId", params: { postId: String(post.id) } });
    } else {
      navigate({ to: "/app/posts/$postId", params: { postId: String(post.id) } });
    }
  };

  return (
    <Box mb="lg" onClick={handleClick} style={{ cursor: "pointer" }}>
      {/* Full-width Image */}
      <Image
        src={post.image_url || "https://placehold.co/600x600?text=No+Image"}
        alt={post.title}
        fallbackSrc="https://placehold.co/600x600?text=No+Image"
        h={400}
        fit="cover"
      />

      {/* Content below image */}
      <Stack gap="xs" px="md" py="sm">
        <Group justify="space-between">
          <Group gap="md">
            <Text fw={700} size="lg">
              ฿
              {price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            {showLikeButton ? (
              <LikeButton
                postId={post.id}
                initialLiked={post.is_liked}
                initialCount={post.like_count}
                size="sm"
              />
            ) : (
              <Group gap={4}>
                <IconHeart size={16} color="var(--mantine-color-gray-5)" />
                <Text size="xs" c="dimmed">{post.like_count}</Text>
              </Group>
            )}
          </Group>
          <Group gap="xs">
            {post.is_sold && (
              <Badge color="red" variant="filled">
                {t("badges.sold")}
              </Badge>
            )}
            <Badge color={typeColors[post.type]} variant="light">
              {typeLabels[post.type]}
            </Badge>
            {isOwner && (
              <Badge variant="light" color="gray">
                {t("badges.yourListing")}
              </Badge>
            )}
          </Group>
        </Group>

        <Text fw={500} lineClamp={1}>
          {post.title}
        </Text>

        <Text size="sm" c="dimmed" lineClamp={2}>
          {post.description}
        </Text>

        <Text size="xs" c="dimmed">
          @{post.user.username}
        </Text>
      </Stack>
    </Box>
  );
}
