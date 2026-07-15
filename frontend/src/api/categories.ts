/**
 * Category taxonomy API client.
 */

import { apiRequest } from "@/api/api";
import type { CategoryTaxonomy } from "@/api/types/post";

/** Fetch the gendered category tree + per-subcategory size groups. Static. */
export async function getCategories(): Promise<CategoryTaxonomy> {
  return apiRequest<CategoryTaxonomy>("/categories");
}
