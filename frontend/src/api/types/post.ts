/**
 * Post/listing types
 */

import type { User } from "./user";

export type PostType = "SHIRT" | "PANTS" | "JACKET" | "SHOES" | "ACCESSORIES" | "OTHER";

export interface Post {
  id: number;
  title: string;
  description: string;
  type: PostType;
  price: string; // Decimal comes as string from API
  image_url: string | null;
  image_urls: string[] | null;
  user: User;
}

export interface CreatePostRequest {
  title: string;
  description: string;
  type: PostType;
  price: number;
  images?: File[];
}
