import { desc, eq, and, inArray, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { db, schema } from "../../db";
import { localizeField } from "../common/localization";
import {
  createPaginationResponse,
  validatePaginationParams,
} from "../common/pagination";

export interface PostFilters {
  search?: string;
  language?: string;
}

export interface PublicPostFilters {
  search?: string;
  language?: string;
  categorySlug?: string;
  tagSlug?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Localize a translation record with the standard fallback chain. */
function localize(
  translations: Record<string, string> | null | undefined,
  language: string,
): string {
  return localizeField(translations ?? {}, language);
}

/**
 * SQL fragment matching a localized JSON slug against the requested language,
 * replicating `localizeField`'s fallback chain in SQLite (JSON1):
 * `translations[language] || translations['en'] || first value || ''`.
 *
 * Uses `json_extract` for the language/en lookups and a `json_each` scan as
 * the "first available value" fallback, so lookups no longer load every row
 * into JS. Callers must guard with `json_valid(column)` first.
 */
function localizedSlugMatches(
  column: AnySQLiteColumn,
  language: string,
  slug: string,
) {
  // Restrict to a safe path component (locale keys are plain identifiers)
  const lang = language.replace(/[^a-zA-Z0-9_-]/g, "");
  const langPath = sql.raw(`'$."${lang}"'`);

  return sql`
    (
      json_extract(${column}, ${langPath}) = ${slug}
      OR (
        (
          json_extract(${column}, ${langPath}) IS NULL
          OR json_extract(${column}, ${langPath}) = ''
        )
        AND json_extract(${column}, '$.en') = ${slug}
      )
      OR (
        (
          json_extract(${column}, ${langPath}) IS NULL
          OR json_extract(${column}, ${langPath}) = ''
        )
        AND (
          json_extract(${column}, '$.en') IS NULL
          OR json_extract(${column}, '$.en') = ''
        )
        AND EXISTS (
          SELECT 1 FROM json_each(${column}) WHERE json_each.value = ${slug}
        )
      )
    )
  `;
}

/**
 * Fetch media for post rendering without privacy checks.
 * Published posts' featured images must be visible to all readers
 * regardless of the media's privacy setting.
 */
async function getMediaForPost(mediaId: number) {
  const [media] = await db
    .select({
      id: schema.media.id,
      filename: schema.media.filename,
      full_path: schema.media.full_path,
      path: schema.media.path,
      type: schema.media.type,
      width: schema.media.width,
      height: schema.media.height,
    })
    .from(schema.media)
    .where(eq(schema.media.id, mediaId))
    .limit(1);

  if (!media) return null;

  const [thumbnail] = await db
    .select({ id: schema.media.id, full_path: schema.media.full_path })
    .from(schema.media)
    .where(eq(schema.media.parentId, mediaId))
    .limit(1);

  return { ...media, thumbnail: thumbnail ?? null };
}

/** Batch fetch featured media for many post ids (2 queries instead of 2 per post). */
async function getMediaForPosts(mediaIds: number[]) {
  if (mediaIds.length === 0)
    return new Map<number, Awaited<ReturnType<typeof getMediaForPost>>>();

  const media = await db
    .select({
      id: schema.media.id,
      filename: schema.media.filename,
      full_path: schema.media.full_path,
      path: schema.media.path,
      type: schema.media.type,
      width: schema.media.width,
      height: schema.media.height,
    })
    .from(schema.media)
    .where(inArray(schema.media.id, mediaIds));

  if (media.length === 0) return new Map();

  const thumbnails = await db
    .select({
      id: schema.media.id,
      parentId: schema.media.parentId,
      full_path: schema.media.full_path,
    })
    .from(schema.media)
    .where(inArray(schema.media.parentId, mediaIds));

  const thumbByParent = new Map(
    thumbnails
      .filter((t) => t.parentId !== null)
      .map((t) => [t.parentId as number, t]),
  );

  const byId = new Map<number, Awaited<ReturnType<typeof getMediaForPost>>>();
  for (const m of media) {
    byId.set(m.id, { ...m, thumbnail: thumbByParent.get(m.id) ?? null });
  }
  return byId;
}

/**
 * Batch fetch categories for many posts (one query, localized + grouped by post id).
 */
async function getLocalizedCategoriesForPosts(
  postIds: number[],
  language: string,
): Promise<Map<number, any[]>> {
  const result = new Map<number, any[]>();
  if (postIds.length === 0) return result;

  const rows = await db
    .select({
      postId: schema.postCategories.postId,
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      description: schema.categories.description,
      color: schema.categories.color,
    })
    .from(schema.postCategories)
    .leftJoin(
      schema.categories,
      eq(schema.postCategories.categoryId, schema.categories.id),
    )
    .where(inArray(schema.postCategories.postId, postIds));

  for (const cat of rows) {
    const localized = {
      id: cat.id,
      name: localize(cat.name, language),
      slug: localize(cat.slug, language),
      description: localize(cat.description, language),
      color: cat.color,
    };
    const list = result.get(cat.postId) ?? [];
    list.push(localized);
    result.set(cat.postId, list);
  }

  return result;
}

/**
 * Batch fetch tags for many posts (one query, localized + grouped by post id).
 */
async function getLocalizedTagsForPosts(
  postIds: number[],
  language: string,
): Promise<Map<number, any[]>> {
  const result = new Map<number, any[]>();
  if (postIds.length === 0) return result;

  const rows = await db
    .select({
      postId: schema.postTags.postId,
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
      color: schema.tags.color,
    })
    .from(schema.postTags)
    .leftJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(inArray(schema.postTags.postId, postIds));

  for (const tag of rows) {
    const localized = {
      id: tag.id,
      name: localize(tag.name, language),
      slug: localize(tag.slug, language),
      color: tag.color,
    };
    const list = result.get(tag.postId) ?? [];
    list.push(localized);
    result.set(tag.postId, list);
  }

  return result;
}

export async function getLocalizedCategories(postId: number, language: string) {
  const map = await getLocalizedCategoriesForPosts([postId], language);
  return map.get(postId) ?? [];
}

export async function getLocalizedTags(postId: number, language: string) {
  const map = await getLocalizedTagsForPosts([postId], language);
  return map.get(postId) ?? [];
}

/**
 * Add a category to a post
 */
export async function addCategoryToPost(postId: number, categoryId: number) {
  // Check if already exists to avoid duplicates
  const existing = await db
    .select()
    .from(schema.postCategories)
    .where(
      and(
        eq(schema.postCategories.postId, postId),
        eq(schema.postCategories.categoryId, categoryId),
      ),
    );

  if (existing.length === 0) {
    return db
      .insert(schema.postCategories)
      .values({
        postId,
        categoryId,
        createdAt: new Date(),
      })
      .returning();
  }
  return existing;
}

/**
 * Remove a category from a post
 */
export async function removeCategoryFromPost(
  postId: number,
  categoryId: number,
) {
  return db
    .delete(schema.postCategories)
    .where(
      and(
        eq(schema.postCategories.postId, postId),
        eq(schema.postCategories.categoryId, categoryId),
      ),
    )
    .returning();
}

/**
 * Update all categories for a post (replaces existing)
 */
export async function updatePostCategories(
  postId: number,
  categoryIds: number[],
) {
  // Delete existing categories
  await db
    .delete(schema.postCategories)
    .where(eq(schema.postCategories.postId, postId));

  // Add new categories
  if (categoryIds.length > 0) {
    return db
      .insert(schema.postCategories)
      .values(
        categoryIds.map((categoryId) => ({
          postId,
          categoryId,
          createdAt: new Date(),
        })),
      )
      .returning();
  }
}

/**
 * Add a tag to a post
 */
export async function addTagToPost(postId: number, tagId: number) {
  // Check if already exists to avoid duplicates
  const existing = await db
    .select()
    .from(schema.postTags)
    .where(
      and(eq(schema.postTags.postId, postId), eq(schema.postTags.tagId, tagId)),
    );

  if (existing.length === 0) {
    return db
      .insert(schema.postTags)
      .values({
        postId,
        tagId,
        createdAt: new Date(),
      })
      .returning();
  }
  return existing;
}

/**
 * Remove a tag from a post
 */
export async function removeTagFromPost(postId: number, tagId: number) {
  return db
    .delete(schema.postTags)
    .where(
      and(eq(schema.postTags.postId, postId), eq(schema.postTags.tagId, tagId)),
    )
    .returning();
}

/**
 * Update all tags for a post (replaces existing)
 */
export async function updatePostTags(postId: number, tagIds: number[]) {
  // Delete existing tags
  await db.delete(schema.postTags).where(eq(schema.postTags.postId, postId));

  // Add new tags
  if (tagIds.length > 0) {
    return db
      .insert(schema.postTags)
      .values(
        tagIds.map((tagId) => ({
          postId,
          tagId,
          createdAt: new Date(),
        })),
      )
      .returning();
  }
}

export async function getPosts(
  filters: PostFilters = {},
  paginationParams?: Partial<PaginationParams>,
) {
  const { page, limit } = validatePaginationParams(paginationParams || {});
  const language = filters.language || "en";

  // Fetch all posts (localization happens before filtering/paginating)
  const allPosts = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      shortDescription: schema.posts.shortDescription,
      content: schema.posts.content,
      status: schema.posts.status,
      featuredImageId: schema.posts.featuredImageId,
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
      author: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      },
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .orderBy(desc(schema.posts.createdAt));

  // Batch-load categories, tags, and featured images (2 queries instead of 2 per post)
  const postIds = allPosts.map((p) => p.id);
  const featuredImageIds = allPosts
    .map((p) => p.featuredImageId)
    .filter((id): id is number => id !== null);
  const [categoriesByPost, tagsByPost, mediaById] = await Promise.all([
    getLocalizedCategoriesForPosts(postIds, language),
    getLocalizedTagsForPosts(postIds, language),
    getMediaForPosts(featuredImageIds),
  ]);

  const localized = allPosts.map((p) => ({
    ...p,
    slug: localize(p.slug, language),
    title: localize(p.title, language),
    shortDescription: localize(p.shortDescription, language),
    content: localize(p.content, language),
    language,
    categories: categoriesByPost.get(p.id) ?? [],
    tags: tagsByPost.get(p.id) ?? [],
    featuredImage: p.featuredImageId
      ? (mediaById.get(p.featuredImageId) ?? null)
      : null,
  }));

  // Filter by language availability
  const filtered = localized.filter((p) => p.slug !== "" || p.title !== "");

  // Apply search filter
  let results = filtered;
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    results = filtered.filter((p) => {
      return (
        p.title.toLowerCase().includes(searchLower) ||
        p.slug.toLowerCase().includes(searchLower) ||
        p.shortDescription.toLowerCase().includes(searchLower)
      );
    });
  }

  // Apply pagination
  const totalCount = results.length;
  const offset = (page - 1) * limit;
  const data = results.slice(offset, offset + limit);

  return createPaginationResponse(
    data,
    totalCount,
    page,
    limit,
    "Posts retrieved",
  );
}

export async function getPostById(postId: number, language: string = "en") {
  const post = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      shortDescription: schema.posts.shortDescription,
      content: schema.posts.content,
      status: schema.posts.status,
      featuredImageId: schema.posts.featuredImageId,
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
      author: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      },
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .where(eq(schema.posts.id, postId))
    .then((rows) => rows[0]);

  if (!post) {
    return null;
  }

  const [categories, tags] = await Promise.all([
    getLocalizedCategories(post.id, language),
    getLocalizedTags(post.id, language),
  ]);

  let featuredImage = null;
  if (post.featuredImageId) {
    featuredImage = await getMediaForPost(post.featuredImageId);
  }

  return {
    ...post,
    slug: localize(post.slug, language),
    title: localize(post.title, language),
    shortDescription: localize(post.shortDescription, language),
    content: localize(post.content, language),
    language,
    categories,
    tags,
    featuredImage,
  };
}

/**
 * Fetch published posts for the public blog listing.
 * Supports filtering by language, category slug, tag slug, and search.
 *
 * The full (narrow) projection is scanned once to localize + filter + count,
 * then only the requested page is fetched with joins, and categories/tags/media
 * are loaded with batched queries (no N+1).
 */
export async function getPublicPosts(
  filters: PublicPostFilters = {},
  paginationParams?: Partial<PaginationParams>,
) {
  const { page, limit } = validatePaginationParams(paginationParams || {});
  const language = filters.language || "en";

  const scan = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      shortDescription: schema.posts.shortDescription,
      featuredImageId: schema.posts.featuredImageId,
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
    })
    .from(schema.posts)
    .where(eq(schema.posts.status, "published"))
    .orderBy(desc(schema.posts.createdAt));

  const localized = scan.map((p) => ({
    ...p,
    slug: localize(p.slug, language),
    title: localize(p.title, language),
    shortDescription: localize(p.shortDescription, language),
  }));

  let results = localized.filter((p) => p.slug !== "");

  if (filters.categorySlug) {
    const postIds = await getPostIdsForCategorySlug(
      filters.categorySlug,
      language,
    );
    results = results.filter((p) => postIds.has(p.id));
  }

  if (filters.tagSlug) {
    const postIds = await getPostIdsForTagSlug(filters.tagSlug, language);
    results = results.filter((p) => postIds.has(p.id));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q),
    );
  }

  const totalCount = results.length;
  const offset = (page - 1) * limit;
  const pageIds = results.slice(offset, offset + limit).map((p) => p.id);

  if (pageIds.length === 0) {
    return createPaginationResponse(
      [],
      totalCount,
      page,
      limit,
      "Posts retrieved",
    );
  }

  // Fetch only the requested page with the author join
  const pagePosts = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      shortDescription: schema.posts.shortDescription,
      featuredImageId: schema.posts.featuredImageId,
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
      author: {
        id: schema.users.id,
        name: schema.users.name,
      },
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .where(inArray(schema.posts.id, pageIds))
    .orderBy(desc(schema.posts.createdAt));

  const [categoriesByPost, tagsByPost, mediaById] = await Promise.all([
    getLocalizedCategoriesForPosts(pageIds, language),
    getLocalizedTagsForPosts(pageIds, language),
    getMediaForPosts(
      pagePosts
        .map((p) => p.featuredImageId)
        .filter((id): id is number => id !== null),
    ),
  ]);

  const data = pagePosts.map((p) => ({
    ...p,
    slug: localize(p.slug, language),
    title: localize(p.title, language),
    shortDescription: localize(p.shortDescription, language),
    language,
    categories: categoriesByPost.get(p.id) ?? [],
    tags: tagsByPost.get(p.id) ?? [],
    featuredImage: p.featuredImageId
      ? (mediaById.get(p.featuredImageId) ?? null)
      : null,
  }));

  return createPaginationResponse(
    data,
    totalCount,
    page,
    limit,
    "Posts retrieved",
  );
}

/** Resolve published post ids for a category slug in the requested language. */
async function getPostIdsForCategorySlug(
  categorySlug: string,
  language: string,
): Promise<Set<number>> {
  const [match] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(
      and(
        sql`json_valid(${schema.categories.slug})`,
        localizedSlugMatches(schema.categories.slug, language, categorySlug),
      ),
    )
    .limit(1);

  if (!match) return new Set();

  const rows = await db
    .select({ postId: schema.postCategories.postId })
    .from(schema.postCategories)
    .where(eq(schema.postCategories.categoryId, match.id));

  return new Set(rows.map((r) => r.postId));
}

/** Resolve published post ids for a tag slug in the requested language. */
async function getPostIdsForTagSlug(
  tagSlug: string,
  language: string,
): Promise<Set<number>> {
  const [match] = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(
      and(
        sql`json_valid(${schema.tags.slug})`,
        localizedSlugMatches(schema.tags.slug, language, tagSlug),
      ),
    )
    .limit(1);

  if (!match) return new Set();

  const rows = await db
    .select({ postId: schema.postTags.postId })
    .from(schema.postTags)
    .where(eq(schema.postTags.tagId, match.id));

  return new Set(rows.map((r) => r.postId));
}

/**
 * Fetch a single published post by its localized slug.
 *
 * Resolves the slug directly in SQLite via JSON1 (`json_extract` / `json_each`)
 * instead of loading every published post into JS and scanning it.
 */
export async function getPublicPostBySlug(
  slug: string,
  language: string = "en",
) {
  const [match] = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "published"),
        sql`json_valid(${schema.posts.slug})`,
        localizedSlugMatches(schema.posts.slug, language, slug),
      ),
    )
    .limit(1);

  if (!match) return null;

  return getPostById(match.id, language);
}
