/**
 * Brands API client
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type { Brand } from "@/api/types/post";

/** All brands (alphabetical) for the create-form autocomplete + Explore filter. */
export async function getBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>("/brands");
}

/** Admin: create a brand from a display name (slug derived server-side). */
export async function createBrand(name: string): Promise<Brand> {
  return jsonRequest<Brand>("/brands", "POST", { name });
}

/** Admin: delete a brand by slug. */
export async function deleteBrand(slug: string): Promise<void> {
  await apiRequest<void>(`/brands/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}
