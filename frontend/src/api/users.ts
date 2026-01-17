/**
 * Users API client
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type { PublicUserProfile, UpdateProfileRequest, User } from "@/api/types/user";
import type { Post } from "@/api/types/post";

/**
 * Get a user's public profile by username
 */
export async function getUserProfile(username: string): Promise<PublicUserProfile> {
  return apiRequest<PublicUserProfile>(`/users/${encodeURIComponent(username)}`);
}

/**
 * Get a user's posts by username
 */
export async function getUserPosts(
  username: string,
  skip = 0,
  limit = 50
): Promise<Post[]> {
  return apiRequest<Post[]>(
    `/users/${encodeURIComponent(username)}/posts?skip=${skip}&limit=${limit}`
  );
}

/**
 * Update the current user's profile
 */
export async function updateMyProfile(data: UpdateProfileRequest): Promise<User> {
  return jsonRequest<User>("/users/me/profile", "PATCH", data);
}
