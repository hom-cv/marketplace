/**
 * Seller-related query and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOnboardingLink, getSellerStatus, registerSeller } from "@/api/seller";
import type { SellerVerificationRequest } from "@/api/types/seller";
import { queryKeys } from "./queryKeys";

export function useSellerStatus() {
  return useQuery({
    queryKey: queryKeys.seller.status,
    queryFn: getSellerStatus,
  });
}

export function useRegisterSellerMutation(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof registerSeller>>) => void;
  onError?: (err: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SellerVerificationRequest) => registerSeller(data),
    onSuccess: (data) => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.seller.status }),
        queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }),
      ]);
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}

export function useOnboardingLinkMutation(options?: {
  onError?: (err: Error) => void;
}) {
  return useMutation({
    mutationFn: getOnboardingLink,
    onSuccess: (data) => {
      window.location.href = data.onboarding_url;
    },
    onError: options?.onError,
  });
}
