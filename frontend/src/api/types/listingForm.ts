/**
 * Listing create/edit form types (shared across the form hooks + components).
 */

import type { PostType } from "./post";

export interface CreatePostFormValues {
  title: string;
  description: string;
  type: PostType | null;
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
