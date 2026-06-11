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
import {
  MAX_LISTING_PRICE,
  MAX_SHIPPING_COST,
  MIN_LISTING_PRICE,
  MIN_SHIPPING_COST,
} from "@/constants/listing";
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
    // Poll only while showing the waived state so an open page notices when
    // a buyer's purchase consumes the seller's last fee-free credit. The API
    // sets platform_fee_waived only for the post owner, so buyers never poll.
    refetchInterval: (query) =>
      query.state.data?.platform_fee_waived ? 30_000 : false,
  });
}

export function useEarningsPreview(
  itemPrice: number | undefined,
  shippingCost = 0,
) {
  const isQueryable =
    typeof itemPrice === "number" &&
    itemPrice >= MIN_LISTING_PRICE &&
    itemPrice <= MAX_LISTING_PRICE &&
    shippingCost >= MIN_SHIPPING_COST &&
    shippingCost <= MAX_SHIPPING_COST;
  return useQuery({
    queryKey: queryKeys.payments.earningsPreview(itemPrice!, shippingCost),
    queryFn: () => getEarningsPreview(itemPrice!, shippingCost, "card"),
    enabled: isQueryable,
    // Poll only while showing the waived state (see usePriceBreakdown).
    refetchInterval: (query) =>
      query.state.data?.platform_fee_waived ? 30_000 : false,
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
