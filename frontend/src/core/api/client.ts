import axios, { type AxiosError } from "axios";

import { tokenStore } from "@/core/api/tokenStore";
import { ApiError, type ApiErrorBody } from "@/core/api/types";

/** Centralized Axios instance (docs/prompts/auth.md §7) — every API call attaches
 * the bearer token here, nothing calls axios directly.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
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
    return Promise.reject(error);
  },
);
