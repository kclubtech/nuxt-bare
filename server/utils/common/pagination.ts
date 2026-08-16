import { count, SQL } from "drizzle-orm";
import { PAGINATION_CONFIG } from "../../../shared/config/pagination";
import type { StandardListResponse } from "~~/shared/types/response";

export function validatePaginationParams(query: Record<string, any>): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const defaultLimit = PAGINATION_CONFIG.defaultPerPage || 20;
  const maxLimit = PAGINATION_CONFIG.maxPerPage || 100;

  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit as string) || defaultLimit),
  );

  return { page, limit };
}

export function calculatePagination(
  totalCount: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  const offset = (page - 1) * limit;

  return {
    totalCount,
    totalPages,
    currentPage: page,
    limit,
    offset,
    hasNextPage,
    hasPreviousPage,
  };
}

export function createPaginationResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number,
  message = "",
): StandardListResponse<T> {
  // reuse calculatePagination to compute numbers
  const pagination = calculatePagination(totalCount, page, limit);

  return {
    message,
    data,
    meta: {
      page: pagination.currentPage,
      per_page: pagination.limit,
      total: pagination.totalCount,
    },
  };
}

export async function getPaginatedResults<T>(
  query: any, // Drizzle query builder
  countQuery: any, // Count query
  page: number,
  limit: number,
): Promise<{ data: T[]; totalCount: number }> {
  const offset = (page - 1) * limit;

  // Execute both queries in parallel
  const [data, countResult] = await Promise.all([
    query.limit(limit).offset(offset),
    countQuery,
  ]);

  // Extract count value from the result
  const totalCount =
    Array.isArray(countResult) && countResult.length > 0
      ? countResult[0].count
      : 0;

  return { data, totalCount };
}

export function buildCountQuery(db: any, table: any, whereClause?: SQL) {
  let query = db.select({ count: count() }).from(table);

  if (whereClause) {
    query = query.where(whereClause);
  }

  return query;
}
