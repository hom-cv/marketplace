/**
 * Posts API client
 */

import { apiRequest, API_BASE_URL } from "@/api/api";
import type { Post, CreatePostRequest } from "@/api/types/post";
import { useAuthStore } from "@/stores/authStore";

/**
 * Create a new post with optional multiple image uploads
 */
export async function createPost(data: CreatePostRequest): Promise<Post> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("description", data.description);
  formData.append("type", data.type);
  formData.append("price", data.price.toString());
  formData.append("shipping_cost", (data.shipping_cost ?? 0).toString());

  // Append multiple images
  if (data.images && data.images.length > 0) {
    data.images.forEach((image) => {
      formData.append("images", image);
    });
  }

  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all posts with optional pagination
 */
export async function getPosts(skip = 0, limit = 50): Promise<Post[]> {
  return apiRequest<Post[]>(`/posts?skip=${skip}&limit=${limit}`);
}

/**
 * Get a single post by ID
 */
export async function getPost(id: number): Promise<Post> {
  return apiRequest<Post>(`/posts/${id}`);
}

/**
 * Get current user's posts
 */
export async function getMyPosts(skip = 0, limit = 50): Promise<Post[]> {
  return apiRequest<Post[]>(`/posts/me?skip=${skip}&limit=${limit}`);
}
