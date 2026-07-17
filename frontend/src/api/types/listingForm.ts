/**
 * Listing create/edit form types (shared across the form hooks + components).
 */

import type { Gender, PostCategory } from "./post";

export interface CreatePostFormValues {
  title: string;
  description: string;
  category: PostCategory | null;
  subcategory: string | null;
  gender: Gender | null;
  brand: string;
  tags: string[];
  price: number | "";
  shippingCost: number | "";
  size: string | null;
}

export interface MeasurementField {
  key: string;
  label: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ExtraMeasurement {
  id: string;
  label: string;
  value: string;
}
