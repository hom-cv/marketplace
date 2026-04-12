/**
 * Payment types
 */

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postal_code: string;
}

export interface CreateCardPaymentRequest {
  post_id: number;
  shipping: ShippingAddress;
}

export interface CreatePromptPayPaymentRequest {
  post_id: number;
  shipping: ShippingAddress;
}

export interface PaymentResponse {
  payment_id: number;
  status: string;
  client_secret: string;
  payment_intent_id: string;
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
  platform_fee: number | null;
  processing_fee: number | null;
  total_fees: number | null;
  total_vat: number | null;
  seller_payout: number | null;
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

export interface PriceBreakdownResponse {
  item_price: string;
  shipping_cost: string;
  platform_fee: string;
  processing_fee: string;
  total_fees: string;
  total_vat: string;
  total: string;
  seller_payout: string;
}

export interface PromptPayQr {
  image_url_png: string;
  image_url_svg?: string;
  data?: string;
}
