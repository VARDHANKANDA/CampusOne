import axios, { type AxiosError } from "axios";

import { tokenStore } from "@/core/api/tokenStore";
import { ApiError, type ApiErrorBody } from "@/core/api/types";

/**
 * Normalizes the API base URL configured via VITE_API_BASE_URL.
 * Strips any trailing slashes and ensures /api/v1 prefix is present
 * for absolute backend URLs if omitted.
 */
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envUrl) {
    return "/api/v1";
  }
  const cleanUrl = envUrl.replace(/\/+$/, "");
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    if (!cleanUrl.endsWith("/api/v1")) {
      return `${cleanUrl}/api/v1`;
    }
  }
  return cleanUrl;
}

/** Centralized Axios instance (docs/prompts/auth.md §7) — every API call attaches
 * the bearer token here, nothing calls axios directly.
 */
export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Dispatched when a request 401s outside the login flow itself, so AuthContext
 * can reset session state and redirect to /login without a circular import.
 */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const isAuthEndpoint = error.config?.url?.startsWith("/auth/login");

    if (status === 401 && !isAuthEndpoint) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }

    if (body?.error) {
      return Promise.reject(new ApiError(status, body.error));
    }

    if (error.response) {
      const fallbackMessages: Record<number, { code: string; message: string }> = {
        400: { code: "BAD_REQUEST", message: "Invalid request. Please verify your input." },
        401: { code: "UNAUTHORIZED", message: "Invalid email or password." },
        403: { code: "FORBIDDEN", message: "You do not have permission to perform this action." },
        404: { code: "NOT_FOUND", message: "The requested resource was not found." },
        409: { code: "RESOURCE_CONFLICT", message: "An account with this email already exists." },
        422: { code: "VALIDATION_ERROR", message: "One or more fields failed validation." },
      };

      const fallback = fallbackMessages[status] ?? {
        code: status >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR",
        message:
          status >= 500
            ? "Unable to complete request right now. Please try again later."
            : `Request failed with status code ${status}.`,
      };

      return Promise.reject(new ApiError(status, fallback));
    }

    return Promise.reject(
      new ApiError(0, {
        code: "NETWORK_ERROR",
        message: "Unable to connect to the backend server. Please check your connection.",
      }),
    );
  },
);
