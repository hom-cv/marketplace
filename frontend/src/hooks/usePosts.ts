/**
 * Post-related query hooks
 */

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getPosts, getPost, getMyPosts, deletePost } from "@/api/posts";
import { getLikedPosts } from "@/api/likes";
import type { PostFilters } from "@/api/types/post";
import { queryKeys } from "./queryKeys";

export function useGuestPreviewPosts(limit = 12) {
  return useQuery({
    queryKey: queryKeys.posts.guestPreview,
    queryFn: () => getPosts(0, limit),
  });
}

export function usePublicPosts(filters: PostFilters, itemsPerPage: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.public(filters),
    queryFn: ({ pageParam = 0 }) => getPosts(pageParam, itemsPerPage, filters),
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.limit;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    initialPageParam: 0,
  });
}

export function usePost(postId: number | string | null) {
  const numericId = typeof postId === "string" ? parseInt(postId, 10) : postId;
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => (numericId ? getPost(numericId) : null),
    enabled: !!numericId,
    retry: false,
  });
}

export function useMyPosts() {
  return useQuery({
    queryKey: queryKeys.posts.my,
    queryFn: () => getMyPosts(),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => deletePost(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(postId) });
    },
  });
}

export function useLikedPosts(itemsPerPage = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.liked,
    queryFn: ({ pageParam = 0 }) => getLikedPosts(pageParam, itemsPerPage),
    getNextPageParam: (lastPage) => {
      const nextSkip = lastPage.skip + lastPage.limit;
      return nextSkip < lastPage.total ? nextSkip : undefined;
    },
    initialPageParam: 0,
  });
}
