/**
 * LikeButton component for liking/unliking posts
 * Shows heart icon with count, handles auth state
 */

import { useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePost, unlikePost } from "@/api/likes";
import { useIsAuthenticated } from "@/stores/authStore";
import styles from "./LikeButton.module.css";

interface LikeButtonProps {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "md" | "lg";
  onAuthRequired?: () => void;
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  size = "md",
  onAuthRequired,
}: LikeButtonProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  // Local optimistic state
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const likeMutation = useMutation({
    mutationFn: () => likePost(postId),
    onMutate: () => {
      // Optimistic update
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    },
    onError: () => {
      // Revert on error
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    },
    onSuccess: (data) => {
      // Sync with server response
      setIsLiked(data.liked);
      setLikeCount(data.like_count);
      // Invalidate queries to refresh data
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
    onSuccess: (data) => {
      setIsLiked(data.liked);
      setLikeCount(data.like_count);
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

  return (
    <Group gap={4} className={styles.likeButton} onClick={handleClick}>
      <Tooltip label={isLiked ? "Unlike" : "Like"}>
        <ActionIcon
          variant="subtle"
          color={isLiked ? "red" : "gray"}
          size={size}
          loading={isLoading}
          className={styles.heartIcon}
        >
          {isLiked ? (
            <IconHeartFilled size={iconSize} />
          ) : (
            <IconHeart size={iconSize} />
          )}
        </ActionIcon>
      </Tooltip>
      <Text size={size === "sm" ? "xs" : "sm"} c="dimmed">
        {likeCount}
      </Text>
    </Group>
  );
}
