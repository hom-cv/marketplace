/**
 * Seller verification types
 */

export interface SellerVerificationRequest {
  bank_brand: string;
  bank_account_number: string;
  bank_account_name: string;
}

export interface SellerVerificationResponse {
  status: string;
  recipient_id: string | null;
  message: string;
}

export interface SellerStatusResponse {
  is_seller: boolean;
  verification_status: string | null;
  bank_brand: string | null;
  bank_last_digits: string | null;
  verified_at: string | null;
}
