/* eslint-disable @typescript-eslint/no-explicit-any */

// index.ts

import axios, { AxiosResponse, AxiosError } from "axios";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ============================================================================
// REQUEST CONFIG
// ============================================================================

export const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.orki.io/api/";

export const BASE_CLIENT = axios.create({
  baseURL,
  timeout: 30000,
});

export const BASE_CLIENT_V1 = axios.create({
  baseURL: baseURL + "/v1",
  timeout: 30000,
});

export const AUTH_CLIENT = axios.create({
  baseURL: baseURL + "/auth",
  timeout: 30000,
});

// ============================================================================
// REQUEST INTERCEPTOR (attach token)
// ============================================================================

const attachTokenInterceptor = (client: any) => {
  client.interceptors.request.use((config: any) => {
    const token = ""; // READ FROM STATE
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

attachTokenInterceptor(BASE_CLIENT);
attachTokenInterceptor(BASE_CLIENT_V1);
attachTokenInterceptor(AUTH_CLIENT);

// ============================================================================
// RESPONSE INTERCEPTOR (handle 401)
// ============================================================================

const attachErrorInterceptor = (client: any) => {
  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      if (err.response?.status === 401) {
        console.warn("[AUTH] Unauthorized → Token cleared.");
      }
      return Promise.reject(err);
    },
  );
};

attachErrorInterceptor(BASE_CLIENT);
attachErrorInterceptor(BASE_CLIENT_V1);
attachErrorInterceptor(AUTH_CLIENT);
