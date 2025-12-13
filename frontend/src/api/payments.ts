/**
 * Payments API client
 */

import { jsonRequest, apiRequest } from "@/api/api";
import type {
  CreateCardPaymentRequest,
  CreatePromptPayPaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  PurchaseListItem,
} from "@/api/types/payment";

/**
 * Create a card payment
 */
export async function createCardPayment(data: CreateCardPaymentRequest): Promise<PaymentResponse> {
  return jsonRequest<PaymentResponse>("/payments/card", "POST", data);
}

/**
 * Create a PromptPay payment
 */
export async function createPromptPayPayment(data: CreatePromptPayPaymentRequest): Promise<PaymentResponse> {
  return jsonRequest<PaymentResponse>("/payments/promptpay", "POST", data);
}

/**
 * Get payment status by ID
 */
export async function getPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
  return apiRequest<PaymentStatusResponse>(`/payments/${paymentId}`);
}

/**
 * Get current user's purchases
 */
export async function getMyPurchases(): Promise<PurchaseListItem[]> {
  return apiRequest<PurchaseListItem[]>("/payments/my-purchases");
}

/**
 * Get current user's sales
 */
export async function getMySales(): Promise<PurchaseListItem[]> {
  return apiRequest<PurchaseListItem[]>("/payments/my-sales");
}

/**
 * Add tracking number to a sale (seller action)
 */
export async function addTracking(paymentId: number, carrier: string, trackingNumber: string): Promise<void> {
  await jsonRequest("/payments/" + paymentId + "/tracking", "POST", {
    carrier: carrier,
    tracking_number: trackingNumber,
  });
}

/**
 * Confirm delivery of an item (buyer action)
 */
export async function confirmDelivery(paymentId: number): Promise<void> {
  await jsonRequest("/payments/" + paymentId + "/confirm-delivery", "POST", {});
}


