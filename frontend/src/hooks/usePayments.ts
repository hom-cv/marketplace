/**
 * Payment-related query and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPriceBreakdown,
  getEarningsPreview,
  getPaymentStatus,
  getMyPurchases,
  getMySales,
  confirmDelivery,
  addTracking,
} from "@/api/payments";
import type { PaymentStatusResponse } from "@/api/types/payment";
import { queryKeys } from "./queryKeys";

export function usePriceBreakdown(
  postId: number | string | null,
  method?: "card" | "promptpay",
) {
  const numericId = typeof postId === "string" ? parseInt(postId, 10) : postId;
  return useQuery({
    queryKey: method
      ? queryKeys.payments.priceBreakdown(postId!, method)
      : queryKeys.payments.priceBreakdown(postId!),
    queryFn: () => getPriceBreakdown(numericId!, method || "card"),
    enabled: !!numericId,
  });
}

export function useEarningsPreview(
  itemPrice: number | undefined,
  shippingCost = 0,
) {
  const isQueryable = typeof itemPrice === "number" && itemPrice >= 50;
  return useQuery({
    queryKey: queryKeys.payments.earningsPreview(itemPrice!, shippingCost),
    queryFn: () => getEarningsPreview(itemPrice!, shippingCost, "card"),
    enabled: isQueryable,
  });
}

export function usePaymentStatus(
  paymentId: number | null,
  options?: {
    enabled?: boolean;
    refetchInterval?:
      | number
      | false
      | ((query: {
          state: { data: PaymentStatusResponse | undefined };
        }) => number | false);
  },
) {
  return useQuery({
    queryKey: queryKeys.payments.status(paymentId),
    queryFn: () => getPaymentStatus(paymentId!),
    enabled: (options?.enabled ?? true) && !!paymentId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useMyPurchases() {
  return useQuery({
    queryKey: queryKeys.payments.myPurchases,
    queryFn: getMyPurchases,
  });
}

export function useMySales() {
  return useQuery({
    queryKey: queryKeys.payments.mySales,
    queryFn: getMySales,
  });
}

export function useConfirmDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => confirmDelivery(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.myPurchases,
      });
    },
  });
}

export function useAddTrackingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      carrier,
      trackingNumber,
    }: {
      paymentId: number;
      carrier: string;
      trackingNumber: string;
    }) => addTracking(paymentId, carrier, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.mySales });
    },
  });
}
