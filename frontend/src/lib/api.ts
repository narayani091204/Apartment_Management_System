import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorBody, RefreshResponse } from '@/types/api';
import { tokenStore } from './tokenStore';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* Attach the access token to every request. */
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---- Auto-refresh on 401 ----------------------------------------------- *
 * When a request fails with 401, try once to exchange the refresh token for
 * a new access token, then replay the original request. Concurrent 401s
 * share a single in-flight refresh so we never hammer /auth/refresh.        */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string> | null = null;

/** Invoked when refresh fails — set by the auth layer to force a logout. */
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(fn: () => void): void {
  onAuthFailure = fn;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('No refresh token');

  // Bare client (no interceptors) to avoid a refresh→401→refresh loop.
  const { data } = await axios.post<RefreshResponse>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  tokenStore.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/refresh');
    if (status === 401 && original && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        tokenStore.clear();
        onAuthFailure?.();
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable message from an unknown error (Axios or not). */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

// ─── Typed helper wrappers ────────────────────────────────────────────────────
export const apiGet = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((r) => r.data);
 
export const apiPost = <T>(url: string, body?: unknown) =>
  api.post<T>(url, body).then((r) => r.data);
 
export const apiPatch = <T>(url: string, body?: unknown) =>
  api.patch<T>(url, body).then((r) => r.data);
 
export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((r) => r.data);
 