/**
 * Helpers for SEO: absolute URLs (needed by canonical, og:image and JSON-LD)
 * and the standard structured-data builders used across public pages.
 */
export function useSeo() {
  const config = useRuntimeConfig();

  const siteName = computed(() => config.public.appName);
  const siteUrl = computed(() =>
    String(config.public.appUrl).trim().replace(/\/$/, ""),
  );

  const defaultDescription =
    "A Nuxt CMS and blog platform with localized content, media management, and a full admin panel.";

  /** Absolute URL for a site path, e.g. absoluteUrl("/blog/hello") */
  function absoluteUrl(path = "/") {
    return new URL(
      path.startsWith("/") ? path : `/${path}`,
      `${siteUrl.value}/`,
    ).toString();
  }

  /** Absolute URL for the default social share image (og:image / twitter:image). */
  function defaultOgImage() {
    return absoluteUrl(config.public.defaultOgImage);
  }

  /**
   * Absolute URL for a media asset. Accepts a full URL, a `/assets/...` path,
   * or a raw media id (fallback to the /api/media/:id/file endpoint).
   */
  function mediaUrl(image?: string | null) {
    if (!image) return undefined;
    if (image.startsWith("http")) return image;
    if (image.startsWith("/assets/")) return absoluteUrl(image);
    return absoluteUrl(`/api/media/${image}/file`);
  }

  function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
    return {
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    };
  }

  function itemListSchema(
    items: Array<{ name: string; path: string }>,
    options?: { name?: string },
  ) {
    return {
      "@type": "ItemList",
      name: options?.name,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(item.path),
        name: item.name,
      })),
    };
  }

  return {
    siteName,
    siteUrl,
    defaultDescription,
    absoluteUrl,
    defaultOgImage,
    mediaUrl,
    breadcrumbSchema,
    itemListSchema,
  };
}
