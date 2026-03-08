/**
 * PostFeedItem component - Instagram-style feed item for mobile
 * Full-width image with user info and details below
 */

import { useMemo } from "react";
import { Box, Group, Text, Badge, Stack, Image } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Post, PostType } from "@/api/types/post";
import { useAuthStore } from "@/stores/authStore";
import { LikeButton } from "@/components/LikeButton";
import { LoginPromptModal } from "@/components/LoginPromptModal";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { Username } from "@/components/Username";
import styles from "./PostFeedItem.module.css";

interface PostFeedItemProps {
  post: Post;
  /** Base path for navigation (default: "/explore") */
  linkPrefix?: string;
}

const typeColors: Record<PostType, string> = {
  SHIRT: "blue",
  PANTS: "teal",
  JACKET: "grape",
  SHOES: "orange",
  ACCESSORIES: "pink",
  OTHER: "gray",
};

export function PostFeedItem({ post, linkPrefix = "/explore" }: PostFeedItemProps) {
  const navigate = useNavigate();
  const price = parseFloat(post.price);
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.id === post.user.id;
  const { t } = useTranslation("common");
  const { t: tListings } = useTranslation("listings");
  const [loginModalOpened, { open: openLoginModal, close: closeLoginModal }] =
    useDisclosure(false);

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
    navigate({ to: `${linkPrefix}/$postId`, params: { postId: String(post.id) } });
  };

  return (
    <Box mb="lg" onClick={handleClick} className={styles.container}>
      {/* Full-width Image */}
      {post.image_url ? (
        <Image
          src={post.image_url}
          alt={post.title}
          h={400}
          fit="cover"
        />
      ) : (
        <Box h={400} bg="gray.1">
          <ImagePlaceholder iconSize={64} />
        </Box>
      )}

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
            <LikeButton
              key={`${post.id}-${post.is_liked}-${post.like_count}`}
              postId={post.id}
              initialLiked={post.is_liked}
              initialCount={post.like_count}
              size="sm"
              onAuthRequired={openLoginModal}
            />
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

        <Username username={post.user.username} isBanned={post.is_user_banned} className={styles.username} />
      </Stack>

      <LoginPromptModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        action={t("likes.likeAction")}
      />
    </Box>
  );
}
