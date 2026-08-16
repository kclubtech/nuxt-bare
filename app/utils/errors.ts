/**
 * Extract a user-facing message from a fetch error, falling back to a default.
 * ofetch/h3 errors expose the API error body on `.data`, e.g. `{ message }`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return (error as { data?: { message?: string } })?.data?.message || fallback;
}
