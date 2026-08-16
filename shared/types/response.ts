// Canonical API response shapes. Every server endpoint and client composable
// should use these — don't define response types inline in composables or
// components.

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

/** `{ message, data }` — used by single-resource endpoints. */
export interface StandardSingleResponse<T> {
  message: string;
  data: T;
}

/** `{ message, data, meta }` — used by paginated list endpoints. */
export interface StandardListResponse<T> {
  message: string;
  data: T[];
  meta: PaginationMeta;
}
