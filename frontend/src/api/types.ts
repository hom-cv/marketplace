/**
 * API Types matching backend schemas
 */

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email_address: string;
    email_verified: boolean;
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

export interface ApiError {
    detail: string;
}

// Post types
export type PostType = "SHIRT" | "PANTS" | "JACKET" | "SHOES" | "ACCESSORIES" | "OTHER";

export interface Post {
    id: number;
    title: string;
    description: string;
    type: PostType;
    price: string; // Decimal comes as string from API
    image_url: string | null;
    image_urls: string[] | null;
    user: User;
}

export interface CreatePostRequest {
    title: string;
    description: string;
    type: PostType;
    price: number;
    images?: File[];
}
