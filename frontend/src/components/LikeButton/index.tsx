import { Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLike } from "@/hooks/useLike";
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
  const isAuthenticated = useIsAuthenticated();
  const { isLiked, likeCount, isPending, toggle } = useLike(
    postId,
    initialLiked,
    initialCount,
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    toggle();
  };

  const isLoading = isPending;
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
