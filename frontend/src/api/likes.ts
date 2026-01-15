/**
 * Likes API client
 */

import { apiRequest } from "@/api/api";
import type { Post } from "@/api/types/post";

export interface LikeStatusResponse {
  liked: boolean;
  like_count: number;
}

export interface LikedPostsResponse {
  items: Post[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Like a post
 */
export async function likePost(postId: number): Promise<LikeStatusResponse> {
  return apiRequest<LikeStatusResponse>(`/likes/${postId}`, {
    method: "POST",
  });
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: number): Promise<LikeStatusResponse> {
  return apiRequest<LikeStatusResponse>(`/likes/${postId}`, {
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
