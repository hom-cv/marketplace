/**
 * Seller verification types
 */

export interface SellerVerificationRequest {
  invite_code: string;
}

export interface SellerVerificationResponse {
  status: string;
  stripe_account_id: string | null;
  onboarding_url: string | null;
  message: string;
}

export interface SellerStatusResponse {
  is_seller: boolean;
  verification_status: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  verified_at: string | null;
  fee_free_sales_remaining: number;
  onboarding_url: string | null;
}

export interface OnboardingLinkResponse {
  onboarding_url: string;
}
