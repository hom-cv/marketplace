/**
 * Seller API functions for Stripe Connect onboarding and status
 */

import { apiRequest, jsonRequest } from "@/api/api";
import type {
  OnboardingLinkResponse,
  SellerStatusResponse,
  SellerVerificationRequest,
  SellerVerificationResponse,
} from "@/api/types/seller";

/**
 * Register as a seller by creating a Stripe Connect Standard account.
 * Returns an onboarding URL the frontend should redirect to.
 */
export async function registerSeller(
  data: SellerVerificationRequest
): Promise<SellerVerificationResponse> {
  return jsonRequest<SellerVerificationResponse>("/seller/register", "POST", data);
}

/**
 * Get the current seller status for the authenticated user.
 */
export async function getSellerStatus(): Promise<SellerStatusResponse> {
  return apiRequest<SellerStatusResponse>("/seller/status");
}

/**
 * Get a fresh Stripe Connect onboarding URL (used when a prior link expired
 * or the user needs to resume onboarding).
 */
export async function getOnboardingLink(): Promise<OnboardingLinkResponse> {
  return apiRequest<OnboardingLinkResponse>("/seller/onboarding-link");
}
