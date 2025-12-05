/**
 * API Types matching backend schemas
 */

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email_address: string;
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

export interface ApiError {
    detail: string;
}
