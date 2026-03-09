/**
 * Likes API client
 */

import { apiRequest } from "@/api/api";
import type { PaginatedPostsResponse } from "@/api/types/post";

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
): Promise<PaginatedPostsResponse> {
  return apiRequest<PaginatedPostsResponse>(`/likes/me?skip=${skip}&limit=${limit}`);
}
