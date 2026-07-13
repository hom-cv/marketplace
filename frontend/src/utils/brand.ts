import type { Brand } from "@/api/types/post";
import { CATCHALL_BRAND_SLUG } from "@/constants/listing";

export function displayBrand(brand: Brand | null): Brand | null {
  return brand && brand.slug !== CATCHALL_BRAND_SLUG ? brand : null;
}
