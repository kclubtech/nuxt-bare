import type { SitemapUrlInput } from "#sitemap/types";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "../../db";

const LOCALES = ["en", "id"] as const;

/**
 * Dynamic sitemap URL source consumed by @nuxtjs/sitemap.
 * Returns published blog posts, categories, and tags with hreflang alternates.
 *
 * Pattern: https://nuxtseo.com/docs/sitemap/guides/dynamic-urls
 */
export default defineSitemapEventHandler(async () => {
  // ── Posts (published only) ─────────────────────────────────────────────────
  const posts = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      updatedAt: schema.posts.updatedAt,
    })
    .from(schema.posts)
    .where(eq(schema.posts.status, "published"))
    .orderBy(desc(schema.posts.updatedAt));

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await db
    .select({ id: schema.categories.id, slug: schema.categories.slug })
    .from(schema.categories);

  // ── Tags ───────────────────────────────────────────────────────────────────
  const tags = await db
    .select({ id: schema.tags.id, slug: schema.tags.slug })
    .from(schema.tags);

  const urls: SitemapUrlInput[] = [];

  // Blog posts — one canonical URL per primary (en) slug
  for (const post of posts) {
    const slugEn =
      (post.slug as Record<string, string>)?.en ||
      Object.values(post.slug as Record<string, string>)[0];

    if (!slugEn) continue;

    const alternates = LOCALES.flatMap((locale) => {
      const localizedSlug =
        (post.slug as Record<string, string>)?.[locale] || slugEn;
      return [{ hreflang: locale, href: `/blog/${localizedSlug}` }];
    });

    urls.push({
      loc: `/blog/${slugEn}`,
      lastmod: post.updatedAt,
      changefreq: "weekly",
      priority: 0.8,
      alternatives: alternates,
    });
  }

  // Category filter pages
  for (const cat of categories) {
    const slugEn =
      (cat.slug as Record<string, string>)?.en ||
      Object.values(cat.slug as Record<string, string>)[0];

    if (!slugEn) continue;

    urls.push({
      loc: `/blog?category=${slugEn}`,
      changefreq: "weekly",
      priority: 0.5,
    });
  }

  // Tag filter pages
  for (const tag of tags) {
    const slugEn =
      (tag.slug as Record<string, string>)?.en ||
      Object.values(tag.slug as Record<string, string>)[0];

    if (!slugEn) continue;

    urls.push({
      loc: `/blog?tag=${slugEn}`,
      changefreq: "weekly",
      priority: 0.4,
    });
  }

  return urls;
});
