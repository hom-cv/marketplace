/**
 * Brand query hook — the shared brand list (autocomplete + Explore filter).
 */

import { useQuery } from "@tanstack/react-query";
import { getBrands } from "@/api/brands";
import { queryKeys } from "./queryKeys";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: getBrands,
    staleTime: 5 * 60 * 1000, // brands change rarely
  });
}
