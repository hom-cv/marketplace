/**
 * Seller API functions for registration and status
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type {
  SellerStatusResponse,
  SellerVerificationRequest,
  SellerVerificationResponse,
} from "@/api/types/seller";

/**
 * Register as a seller by providing bank account details
 */
export async function registerSeller(
  data: SellerVerificationRequest
): Promise<SellerVerificationResponse> {
  return jsonRequest<SellerVerificationResponse>("/seller/register", "POST", data);
}

/**
 * Get the current seller status for the authenticated user
 */
export async function getSellerStatus(): Promise<SellerStatusResponse> {
  return apiRequest<SellerStatusResponse>("/seller/status");
}

/**
 * Available bank brands for seller registration
 */
export const BANK_BRANDS = [
  { value: "bbl", label: "Bangkok Bank" },
  { value: "kbank", label: "Kasikorn Bank" },
  { value: "ktb", label: "Krung Thai Bank" },
  { value: "scb", label: "Siam Commercial Bank" },
  { value: "bay", label: "Bank of Ayudhya (Krungsri)" },
  { value: "gsb", label: "Government Savings Bank" },
  { value: "cimb", label: "CIMB Thai" },
  { value: "tbank", label: "Thanachart Bank" },
  { value: "uob", label: "United Overseas Bank" },
] as const;
