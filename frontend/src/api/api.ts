/**
 * Base API client configuration
 */

import { useAuthStore } from "@/stores/authStore";
import { queryClient } from "@/api/queryClient";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    const message = errorData.detail || `HTTP ${response.status}`;

    if (response.status === 401) {
      const auth = useAuthStore.getState();
      if (auth.adminToken !== null) {
        auth.stopImpersonation();
        queryClient.clear();
      } else {
        auth.logout();
      }
    }

    throw new Error(message);
  }

  if (
    response.status === 204 ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    return undefined as T;
  }

  return response.json();
}

export function jsonRequest<T>(
  endpoint: string,
  method: string,
  body: unknown,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function formRequest<T>(
  endpoint: string,
  data: Record<string, string>,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data).toString(),
  });
}
