/**
 * Auth API functions
 */

import { apiRequest, jsonRequest, formRequest } from "@/api/api";
import type { User, RegisterRequest, LoginResponse, EmailVerificationResponse } from "@/api/types";

export function registerUser(data: RegisterRequest): Promise<User> {
    return jsonRequest<User>("/auth/register", "POST", data);
}

export function loginUser(email: string, password: string): Promise<LoginResponse> {
    return formRequest<LoginResponse>("/auth/login", {
        username: email,
        password: password,
    });
}

export function getCurrentUser(): Promise<User> {
    return apiRequest<User>("/auth/me");
}

export function verifyEmail(token: string): Promise<EmailVerificationResponse> {
    return apiRequest<EmailVerificationResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function resendVerificationEmail(): Promise<EmailVerificationResponse> {
    return apiRequest<EmailVerificationResponse>("/auth/resend-verification", {
        method: "POST",
    });
}

