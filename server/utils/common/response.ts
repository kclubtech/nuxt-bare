import type {
  StandardSingleResponse,
  StandardListResponse,
} from "~~/shared/types/response";

/**
 * Build a standardized single-object response
 */
export function jsonResponse<T>(
  data: T,
  message = "",
): StandardSingleResponse<T> {
  return { message, data };
}

/**
 * Build a standardized list response. Use when you have pagination metadata.
 */
export function listResponse<T>(
  data: T[],
  total: number,
  page = 1,
  per_page = data.length,
  message = "",
): StandardListResponse<T> {
  return {
    message,
    data,
    meta: { page, per_page, total },
  };
}
