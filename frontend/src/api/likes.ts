/**
 * Likes API client
 */

import { apiRequest } from "@/api/api";
import type { Post } from "@/api/types/post";

export interface LikedPostsResponse {
  items: Post[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Like a post (returns 204 No Content)
 * Frontend should refetch post data for updated like info.
 */
export async function likePost(postId: number): Promise<void> {
  await apiRequest(`/likes/${postId}`, {
    method: "POST",
  });
}

/**
 * Unlike a post (returns 204 No Content)
 * Frontend should refetch post data for updated like info.
 */
export async function unlikePost(postId: number): Promise<void> {
  await apiRequest(`/likes/${postId}`, {
    method: "DELETE",
  });
}

/**
 * Get current user's liked posts
 */
export async function getLikedPosts(
  skip = 0,
  limit = 50
): Promise<LikedPostsResponse> {
  return apiRequest<LikedPostsResponse>(`/likes/me?skip=${skip}&limit=${limit}`);
}
