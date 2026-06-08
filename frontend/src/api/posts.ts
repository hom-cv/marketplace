/**
 * Posts API client
 */

import { apiRequest, API_BASE_URL } from "@/api/api";
import type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
  PaginatedPostsResponse,
} from "@/api/types/post";
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
  formData.append("size", data.size);

  // Append measurements as JSON if provided
  if (data.measurements && Object.keys(data.measurements).length > 0) {
    formData.append("measurements", JSON.stringify(data.measurements));
  }

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
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all posts with optional pagination and filters
 */
export async function getPosts(
  skip = 0,
  limit = 50,
  filters?: PostFilters,
): Promise<PaginatedPostsResponse> {
  const params = new URLSearchParams();
  params.append("skip", String(skip));
  params.append("limit", String(limit));

  if (filters?.types && filters.types.length > 0) {
    filters.types.forEach((type) => params.append("types", type));
  }
  if (filters?.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((size) => params.append("sizes", size));
  }
  if (filters?.minPrice !== undefined) {
    params.append("min_price", String(filters.minPrice));
  }
  if (filters?.maxPrice !== undefined) {
    params.append("max_price", String(filters.maxPrice));
  }
  if (filters?.search) {
    params.append("search", filters.search);
  }

  return apiRequest<PaginatedPostsResponse>(`/posts?${params.toString()}`);
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

/**
 * Update an existing post. Supports reordering existing images and uploading
 * new ones via the `imageOrder` manifest (see UpdatePostRequest).
 */
export async function updatePost(
  id: number,
  data: UpdatePostRequest,
): Promise<Post> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();

  formData.append("title", data.title);
  formData.append("description", data.description);
  formData.append("type", data.type);
  formData.append("price", data.price.toString());
  formData.append("shipping_cost", (data.shipping_cost ?? 0).toString());
  formData.append("size", data.size);

  if (data.measurements && Object.keys(data.measurements).length > 0) {
    formData.append("measurements", JSON.stringify(data.measurements));
  }

  formData.append("image_order", JSON.stringify(data.imageOrder));
  data.newImages.forEach((image) => {
    formData.append("images", image);
  });

  const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Soft delete a post. The server preserves the record for accounting.
 */
export async function deletePost(id: number): Promise<void> {
  return apiRequest<void>(`/posts/${id}`, { method: "DELETE" });
}
