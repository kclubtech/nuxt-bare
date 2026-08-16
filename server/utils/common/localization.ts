import type { H3Event } from "h3";

/**
 * Accept either a plain string (interpreted as the current language's value)
 * or a full translation record, and return a translation record.
 * Used for create/update payloads that may target one or many languages.
 */
export function normalize(
  value: unknown,
  language: string,
): Record<string, string> {
  if (typeof value === "string") {
    return { [language]: value };
  }
  return (value as Record<string, string>) || {};
}

/**
 * Merge a new value into an existing translation record so other languages
 * are preserved on partial updates.
 */
export function mergeTranslations(
  existing: Record<string, string>,
  newValue: unknown,
  language: string,
): Record<string, string> {
  return {
    ...existing,
    ...normalize(newValue, language),
  };
}

/**
 * Pick a value from a translation record with the standard fallback chain:
 * requested language → `en` → first available value → `""`.
 */
export function localizeField(
  translations: Record<string, string>,
  language: string,
): string {
  return (
    translations?.[language] ||
    translations?.["en"] ||
    Object.values(translations || {})[0] ||
    ""
  );
}

/** Normalize a raw language code to a supported app language (`en`/`id`). */
export function normalizeLanguage(lang: string): string {
  switch (lang.trim().toLowerCase()) {
    case "en":
    case "en-us":
    case "en-gb":
      return "en";
    case "id":
    case "id-id":
      return "id";
    default:
      return "en";
  }
}

/**
 * Read the preferred language from the `Accept-Language` header.
 * Falls back to `en` when the header is missing (e.g. internal SSR calls).
 */
export function getRequestLanguage(event: H3Event): string {
  try {
    const header = event?.headers?.get?.("accept-language");
    if (typeof header === "string" && header.trim()) {
      const lang = header.split(",")[0]?.trim() || "en";
      return normalizeLanguage(lang);
    }
  } catch {
    // Header not available (internal call during SSR/prefetch)
  }
  return "en";
}
