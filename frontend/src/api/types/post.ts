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

/**
 * Measurement field configuration per category.
 * Maps field keys (snake_case) to i18n translation keys (camelCase).
 * Used for both form input and display.
 */
export interface MeasurementFieldConfig {
  key: string;
  translationKey: string;
}

/** Standard measurements for tops (shirts, jackets) */
const TOP_MEASUREMENT_FIELDS: readonly MeasurementFieldConfig[] = [
  { key: "shoulder", translationKey: "shoulder" },
  { key: "length", translationKey: "length" },
  { key: "bust", translationKey: "bust" },
  { key: "sleeve", translationKey: "sleeve" },
];

/**
 * Measurement fields per category.
 * - SHIRT, JACKET: Standard top measurements
 * - PANTS: Waist, inseam, etc.
 * - SHOES: Insole length
 * - OTHER: No default fields - users add custom measurements only
 * - ACCESSORIES: No measurements supported
 */
export const MEASUREMENT_FIELDS: Record<PostType, readonly MeasurementFieldConfig[]> = {
  SHIRT: TOP_MEASUREMENT_FIELDS,
  JACKET: TOP_MEASUREMENT_FIELDS,
  OTHER: [], // No default measurements - users add custom measurements as needed
  PANTS: [
    { key: "total_length", translationKey: "totalLength" },
    { key: "inseam", translationKey: "inseam" },
    { key: "rise", translationKey: "rise" },
    { key: "hip", translationKey: "hip" },
  ],
  SHOES: [
    { key: "insole_length", translationKey: "insoleLength" },
  ],
  ACCESSORIES: [],
};

/**
 * Map from snake_case measurement keys to i18n translation keys.
 * Used for displaying measurement values with translated labels.
 */
export const MEASUREMENT_KEY_TO_TRANSLATION: Record<string, string> = Object.values(
  MEASUREMENT_FIELDS
).flat().reduce((acc, field) => {
  acc[field.key] = field.translationKey;
  return acc;
}, {} as Record<string, string>);

/**
 * Size category identifiers used for filtering and display.
 */
export type SizeCategory = "letter" | "pants" | "shoes" | "one_size";

/**
 * Configuration for each size category.
 * Single source of truth for mapping between post types and size groups.
 */
export interface SizeCategoryConfig {
  /** Size category identifier */
  category: SizeCategory;
  /** Available sizes in this category */
  sizes: readonly string[];
  /** Post types that use this size category */
  postTypes: readonly PostType[];
  /** i18n key for the category label (e.g., "sizeCategories.tops") */
  labelKey: string;
  /** Optional label formatter (e.g., adding "EU" prefix for shoes) */
  formatLabel?: (size: string) => string;
}

/**
 * Unified size category configuration.
 * This is the single source of truth for:
 * - Which sizes belong to which category
 * - Which post types use which size category
 * - How to display size labels
 */
export const SIZE_CATEGORY_CONFIG: readonly SizeCategoryConfig[] = [
  {
    category: "letter",
    sizes: LETTER_SIZES,
    postTypes: ["SHIRT", "JACKET", "OTHER"],
    labelKey: "sizeCategories.tops",
  },
  {
    category: "pants",
    sizes: PANTS_SIZES,
    postTypes: ["PANTS"],
    labelKey: "sizeCategories.pants",
  },
  {
    category: "shoes",
    sizes: SHOE_SIZES,
    postTypes: ["SHOES"],
    labelKey: "sizeCategories.shoes",
    formatLabel: (size) => `EU ${size}`,
  },
  {
    category: "one_size",
    sizes: ["ONE_SIZE"],
    postTypes: ["ACCESSORIES"],
    labelKey: "sizeCategories.accessories",
  },
];

/**
 * Map from PostType to its size category for quick lookup.
 * Derived from SIZE_CATEGORY_CONFIG.
 */
export const POST_TYPE_TO_SIZE_CATEGORY: Record<PostType, SizeCategory> =
  SIZE_CATEGORY_CONFIG.reduce((acc, config) => {
    for (const postType of config.postTypes) {
      acc[postType] = config.category;
    }
    return acc;
  }, {} as Record<PostType, SizeCategory>);

/**
 * Helper to ensure exhaustive type checking at compile time.
 * If a new PostType is added but not handled, TypeScript will error.
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled post type: ${value}`);
}

/**
 * Get valid sizes for a post type category.
 * Uses SIZE_CATEGORY_CONFIG as the single source of truth.
 */
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
      // Compile-time exhaustive check - will error if a PostType case is missing
      return assertNever(type);
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
