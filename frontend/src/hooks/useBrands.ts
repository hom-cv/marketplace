/**
 * Brand query + admin mutation hooks — the shared brand list
 * (autocomplete + Explore filter), plus admin add/remove.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrand, deleteBrand, getBrands } from "@/api/brands";
import { queryKeys } from "./queryKeys";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: getBrands,
    staleTime: 5 * 60 * 1000, // brands change rarely
  });
}

export function useCreateBrandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBrand(name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all }),
  });
}

export function useDeleteBrandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteBrand(slug),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all }),
  });
}
