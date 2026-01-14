/**
 * Post/listing types
 */

import type { User } from "./user";

export type PostType = "SHIRT" | "PANTS" | "JACKET" | "SHOES" | "ACCESSORIES" | "OTHER";

// Letter-based sizes for shirts, jackets, tops
export const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
export type LetterSize = (typeof LETTER_SIZES)[number] | "ONE_SIZE";

// Pants waist sizes (even numbers 26-44)
export const PANTS_SIZES = ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44"] as const;
export type PantsSize = (typeof PANTS_SIZES)[number];

// Italian (EU) shoe sizes 35-48
export const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"] as const;
export type ShoeSize = (typeof SHOE_SIZES)[number];

// Measurement interfaces per category
export interface TopMeasurements {
  shoulder?: number;
  length?: number;
  bust?: number;
  sleeve?: number;
  [key: string]: number | undefined;
}

export interface PantsMeasurements {
  total_length?: number;
  inseam?: number;
  rise?: number;
  hip?: number;
  [key: string]: number | undefined;
}

export interface ShoesMeasurements {
  insole_length?: number;
  [key: string]: number | undefined;
}

export type Measurements = TopMeasurements | PantsMeasurements | ShoesMeasurements;

// Helper to get valid sizes for a category
export function getSizesForType(type: PostType): readonly string[] {
  switch (type) {
    case "SHIRT":
    case "JACKET":
    case "OTHER":
      return LETTER_SIZES;
    case "PANTS":
      return PANTS_SIZES;
    case "SHOES":
      return SHOE_SIZES;
    case "ACCESSORIES":
      return ["ONE_SIZE"];
    default:
      return [];
  }
}

export interface Post {
  id: number;
  title: string;
  description: string;
  type: PostType;
  price: string; // Decimal comes as string from API
  shipping_cost: string; // Decimal comes as string from API
  image_url: string | null;
  image_urls: string[] | null;
  size: string | null;
  measurements: Measurements | null;
  user: User;
  is_sold: boolean;
  is_banned?: boolean;
  is_user_banned?: boolean;
}

export interface CreatePostRequest {
  title: string;
  description: string;
  type: PostType;
  price: number;
  shipping_cost?: number;
  size: string;
  measurements?: Measurements;
  images?: File[];
}

export interface PostFilters {
  types?: PostType[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface PaginatedPostsResponse {
  items: Post[];
  total: number;
  skip: number;
  limit: number;
}
