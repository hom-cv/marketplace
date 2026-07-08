/**
 * Posts API client
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
  PaginatedPostsResponse,
} from "@/api/types/post";

/**
 * Create a new post. Images must already be uploaded via presigned URLs
 * (see @/api/uploads); pass their public URLs in `image_urls`.
 */
export async function createPost(data: CreatePostRequest): Promise<Post> {
  return jsonRequest<Post>("/posts", "POST", data);
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
  if (filters?.genders && filters.genders.length > 0) {
    filters.genders.forEach((gender) => params.append("genders", gender));
  }
  if (filters?.sizes && filters.sizes.length > 0) {
    filters.sizes.forEach((size) => params.append("sizes", size));
  }
  if (filters?.brands && filters.brands.length > 0) {
    filters.brands.forEach((brand) => params.append("brands", brand));
  }
  if (filters?.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append("tags", tag));
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
 * Update an existing post. `image_urls` is the final ordered list of public CDN
 * URLs (first = cover); new images must be uploaded via presigned URLs first.
 */
export async function updatePost(
  id: number,
  data: UpdatePostRequest,
): Promise<Post> {
  return jsonRequest<Post>(`/posts/${id}`, "PUT", data);
}

/**
 * Soft delete a post. The server preserves the record for accounting.
 */
export async function deletePost(id: number): Promise<void> {
  return apiRequest<void>(`/posts/${id}`, { method: "DELETE" });
}
