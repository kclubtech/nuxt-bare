/** Format a date string/object for display, defaulting to "Jan 5, 2026". */
export function formatDate(
  date: string | Date,
  locale = "en",
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  return new Date(date).toLocaleDateString(locale, options);
}
