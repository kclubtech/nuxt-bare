// Default page sizes for paginated endpoints.
//
// The validation/response helpers live in server/utils/common/pagination.ts —
// keep the implementation there, this file is just shared config.
export const PAGINATION_CONFIG = {
  defaultPerPage: 25,
  maxPerPage: 100,
  allowedPerPage: [10, 25, 50, 100],
} as const;
