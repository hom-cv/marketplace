import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { followUser, unfollowUser } from "@/api/follows";
import { useIsAuthenticated } from "@/stores/authStore";
import styles from "./FollowButton.module.css";

interface FollowButtonProps {
  userId: number;
  initialFollowed: boolean;
  size?: "md" | "lg";
  fullWidth?: boolean;
  onAuthRequired?: () => void;
}

export function FollowButton({
  userId,
  initialFollowed,
  size = "md",
  fullWidth = false,
  onAuthRequired,
}: FollowButtonProps) {
  const { t } = useTranslation("profile");
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();

  const [isFollowed, setIsFollowed] = useState(initialFollowed);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFollowed(initialFollowed);
  }, [userId, initialFollowed]);

  const followMutation = useMutation({
    mutationFn: () => followUser(userId),
    onMutate: () => {
      setIsFollowed(true);
    },
    onError: () => {
      setIsFollowed(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(userId),
    onMutate: () => {
      setIsFollowed(false);
    },
    onError: () => {
      setIsFollowed(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (isFollowed) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  return (
    <button
      type="button"
      className={[
        styles.button,
        styles[size],
        fullWidth && styles.fullWidth,
        isFollowed && styles.following,
        isLoading && styles.loading,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
    >
      {isFollowed
        ? isHovered
          ? t("follow.unfollow")
          : t("follow.following")
        : t("follow.follow")}
    </button>
  );
}
