/**
 * Payment types
 */

export interface CreateCardPaymentRequest {
  post_id: number;
  token: string;
  return_uri: string;
}

export interface CreatePromptPayPaymentRequest {
  post_id: number;
  return_uri: string;
}

export interface PaymentResponse {
  payment_id: number;
  status: string;
  charge_id: string | null;
  authorize_uri: string | null;
  qr_code_uri: string | null;
  expires_at: string | null;
}

export interface PaymentStatusResponse {
  payment_id: number;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
}
