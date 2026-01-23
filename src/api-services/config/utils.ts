/* eslint-disable @typescript-eslint/no-explicit-any */

//utils.ts

import { AxiosResponse } from "axios";
import { ApiError, ApiResponse } from ".";

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const handleError = (error: any, label?: string): ApiError => {
  const message =
    error?.response?.data?.msg ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "An unexpected error occurred";

  const apiError: ApiError = {
    message,
    code: error?.response?.data?.code,
    statusCode: error?.response?.status,
  };

  console.error(`[API ERROR - ${label}]`, apiError);
  return apiError;
};

// ============================================================================
// API CALL WRAPPER
// ============================================================================

export const handleApiCall = async <T>(
  fn: () => Promise<AxiosResponse<T>>,
  label: string
): Promise<ApiResponse<T>> => {
  try {
    const res = await fn();
    return { data: res.data };
  } catch (err: any) {
    return { error: handleError(err, label) };
  }
};

// ============================================================================
// QUERY UTIL
// ============================================================================

export const constructQueryParams = (payload: Record<string, any>): string => {
  const query = Object.entries(payload)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");

  return query ? `?${query}` : "";
};
