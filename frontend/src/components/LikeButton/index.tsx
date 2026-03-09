import { useState } from "react";
import { Tooltip } from "@mantine/core";
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
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  size = "md",
  onAuthRequired,
}: LikeButtonProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const likeMutation = useMutation({
    mutationFn: () => likePost(postId),
    onMutate: () => {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    },
    onError: () => {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
      ]);
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
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["likedPosts"] }),
      ]);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

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
  const iconSize = size === "sm" ? 14 : size === "md" ? 18 : 22;

  return (
    <Tooltip label={isLiked ? t("likes.unlike") : t("likes.like")}>
      <button
        type="button"
        className={[styles.button, isLiked && styles.liked, isLoading && styles.loading].filter(Boolean).join(' ')}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLiked ? (
          <IconHeartFilled size={iconSize} />
        ) : (
          <IconHeart size={iconSize} />
        )}
        <span className={styles.count}>{likeCount}</span>
      </button>
    </Tooltip>
  );
}
