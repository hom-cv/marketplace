/**
 * Payment types
 */

export interface CreateCardPaymentRequest {
  post_id: number;
  token: string;
  return_uri: string;
  shipping: ShippingAddress;
}

export interface CreatePromptPayPaymentRequest {
  post_id: number;
  return_uri: string;
  shipping: ShippingAddress;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postal_code: string;
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

export interface PostSummary {
  id: number;
  title: string;
  image_url: string | null;
  price: string;
  shipping_cost: string;
}

export interface UserSummary {
  id: number;
  username: string;
}

export interface PurchaseListItem {
  payment_id: number;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
  post: PostSummary;
  buyer: UserSummary | null;
  seller: UserSummary | null;
  // Fee breakdown (all in satang)
  item_price: number | null;
  shipping_cost: number | null;
  vat_amount: number | null;
  processing_fee: number | null;
  platform_fee: number | null;
  // Fulfillment tracking fields
  fulfillment_status: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_carrier: string | null;
  // Shipping address (for seller)
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_district: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
}

