/**
 * Payment API functions
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type {
  CreateCardPaymentRequest,
  CreatePromptPayPaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
} from "@/api/types/payment";

/**
 * Create a card payment for a post
 */
export async function createCardPayment(
  data: CreateCardPaymentRequest
): Promise<PaymentResponse> {
  return jsonRequest<PaymentResponse>("/payments/card", "POST", data);
}

/**
 * Create a PromptPay payment for a post
 */
export async function createPromptPayPayment(
  data: CreatePromptPayPaymentRequest
): Promise<PaymentResponse> {
  return jsonRequest<PaymentResponse>("/payments/promptpay", "POST", data);
}

/**
 * Get the status of a payment
 */
export async function getPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
  return apiRequest<PaymentStatusResponse>(`/payments/${paymentId}`);
}
