/**
 * Brands API client
 */

import { apiRequest } from "@/api/api";
import type { Brand } from "@/api/types/post";

/** All brands (alphabetical) for the create-form autocomplete + Explore filter. */
export async function getBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>("/brands");
}
