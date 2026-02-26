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
  is_admin: boolean;
  bio: string | null;
  show_full_name: boolean;
}

export interface PublicUserProfile {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  is_seller: boolean;
  total_likes: number;
  follower_count: number;
  is_followed: boolean;
}

export interface UpdateProfileRequest {
  bio?: string | null;
  show_full_name?: boolean;
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
