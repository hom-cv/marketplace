/**
 * Follows API client
 */

import { apiRequest } from "@/api/api";

/**
 * Follow a user (returns 204 No Content)
 */
export async function followUser(userId: number): Promise<void> {
  await apiRequest(`/follows/${userId}`, {
    method: "POST",
  });
}

/**
 * Unfollow a user (returns 204 No Content)
 */
export async function unfollowUser(userId: number): Promise<void> {
  await apiRequest(`/follows/${userId}`, {
    method: "DELETE",
  });
}
