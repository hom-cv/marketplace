import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePost, unlikePost } from "@/api/likes";
import { queryKeys } from "@/hooks/queryKeys";

/**
 * Optimistic like state for a post. Shared by LikeButton and the mobile feed's
 * double-tap-to-like, so both stay in sync from one instance.
 */
export function useLike(
  postId: number,
  initialLiked: boolean,
  initialCount: number,
) {
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const [synced, setSynced] = useState({ postId, initialLiked, initialCount });
  if (
    synced.postId !== postId ||
    synced.initialLiked !== initialLiked ||
    synced.initialCount !== initialCount
  ) {
    setSynced({ postId, initialLiked, initialCount });
    setIsLiked(initialLiked);
    setLikeCount(initialCount);
  }

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.liked }),
    ]);

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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  });

  const isPending = likeMutation.isPending || unlikeMutation.isPending;

  const toggle = () => {
    if (isPending) return;
    if (isLiked) unlikeMutation.mutate();
    else likeMutation.mutate();
  };

  // Instagram double-tap: always likes, never unlikes.
  const like = () => {
    if (!isLiked && !isPending) likeMutation.mutate();
  };

  return { isLiked, likeCount, isPending, toggle, like };
}
