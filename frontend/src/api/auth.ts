/**
 * Auth API functions
 */

import { apiRequest, jsonRequest, formRequest } from "./api";
import type { User, RegisterRequest, LoginResponse } from "./types";

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
