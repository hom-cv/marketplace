/**
 * User and authentication types
 */

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email_address: string;
  email_verified: boolean;
  is_seller: boolean;
  seller_status: string | null;
}

export interface RegisterRequest {
  username: string;
  first_name: string;
  last_name: string;
  email_address: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface EmailVerificationResponse {
  message: string;
}
