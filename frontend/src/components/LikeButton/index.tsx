/**
 * LikeButton component for liking/unliking posts
 * Shows heart icon with count, handles auth state
 * Supports "floating" variant for frosted glass overlay
 */

import { useEffect, useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { likePost, unlikePost } from "@/api/likes";
import { useIsAuthenticated } from "@/stores/authStore";
import styles from "./LikeButton.module.css";

interface LikeButtonProps {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "md" | "lg";
  onAuthRequired?: () => void;
  /** Floating variant with frosted glass background */
  variant?: "default" | "floating";
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  size = "md",
  onAuthRequired,
  variant = "default",
}: LikeButtonProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  // Local optimistic state
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [justLiked, setJustLiked] = useState(false);

  useEffect(() => {
    setIsLiked(initialLiked);
    setLikeCount(initialCount);
  }, [initialLiked, initialCount]);

  const likeMutation = useMutation({
    mutationFn: () => likePost(postId),
    onMutate: () => {
      // Optimistic update
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      setJustLiked(true);
      setTimeout(() => setJustLiked(false), 400);
    },
    onError: () => {
      // Revert on error
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data (single source of truth)
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => unlikePost(postId),
    onMutate: () => {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    },
    onError: () => {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data (single source of truth)
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["likedPosts"] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation

    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (isLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const isLoading = likeMutation.isPending || unlikeMutation.isPending;
  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;

  // Floating variant with frosted glass
  if (variant === "floating") {
    return (
      <div
        className={`${styles.floatingButton} ${justLiked ? styles.heartPop : ""}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        aria-label={isLiked ? t("likes.ariaUnlike") : t("likes.ariaLike")}
      >
        <ActionIcon
          variant="transparent"
          color={isLiked ? "red" : "white"}
          size={size}
          loading={isLoading}
          className={styles.floatingIcon}
          aria-hidden="true"
        >
          {isLiked ? (
            <IconHeartFilled size={iconSize} />
          ) : (
            <IconHeart size={iconSize} stroke={2} />
          )}
        </ActionIcon>
      </div>
    );
  }

  // Default variant
  const likeCountLabel = likeCount === 1
    ? t("likes.countOne", { count: likeCount })
    : t("likes.count", { count: likeCount });

  return (
    <Group gap={4} className={styles.likeButton} onClick={handleClick}>
      <Tooltip label={isLiked ? t("likes.unlike") : t("likes.like")}>
        <ActionIcon
          variant="subtle"
          color={isLiked ? "red" : "gray"}
          size={size}
          loading={isLoading}
          className={`${styles.heartIcon} ${justLiked ? styles.heartPop : ""}`}
          aria-label={isLiked ? t("likes.ariaUnlike") : t("likes.ariaLike")}
        >
          {isLiked ? (
            <IconHeartFilled size={iconSize} />
          ) : (
            <IconHeart size={iconSize} />
          )}
        </ActionIcon>
      </Tooltip>
      <Text size={size === "sm" ? "xs" : "sm"} c="dimmed" aria-label={likeCountLabel}>
        {likeCount}
      </Text>
    </Group>
  );
}
