import { expect, it, describe, beforeAll, beforeEach } from "vitest";
import { db, schema } from "../../../server/db";
import { setupTestDb, clearDb } from "../../helpers";

async function insertUser(email: string) {
  const now = new Date();
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Test User",
      email,
      password: "hashed",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!user) throw new Error("Failed to insert test user");
  return user;
}

async function insertPost(
  userId: number,
  slug: Record<string, string>,
  status: "draft" | "published" = "published",
) {
  const now = new Date();
  const [post] = await db
    .insert(schema.posts)
    .values({
      userId,
      slug,
      title: { en: "Post title", id: "Judul post" },
      content: { en: "Content", id: "Konten" },
      status,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!post) throw new Error("Failed to insert test post");
  return post;
}

describe("Post service — localized slug lookup (JSON1)", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
    setupTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("resolves a post by its slug in the requested language", async () => {
    const user = await insertUser("a@example.com");
    const post = await insertPost(user.id, {
      en: "hello-world",
      id: "halo-dunia",
    });

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    const result = await getPublicPostBySlug("halo-dunia", "id");

    expect(result?.id).toBe(post.id);
    expect(result?.slug).toBe("halo-dunia");
  });

  it("falls back to the en slug when the requested language is missing", async () => {
    const user = await insertUser("b@example.com");
    const post = await insertPost(user.id, { en: "only-en" });

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    const result = await getPublicPostBySlug("only-en", "id");

    expect(result?.id).toBe(post.id);
    expect(result?.slug).toBe("only-en");
  });

  it("falls back to the first available slug when neither the language nor en exists", async () => {
    const user = await insertUser("c@example.com");
    const post = await insertPost(user.id, { id: "no-en" });

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    const result = await getPublicPostBySlug("no-en", "fr");

    expect(result?.id).toBe(post.id);
    expect(result?.slug).toBe("no-en");
  });

  it("does not match a language slug through the en fallback when that language exists", async () => {
    const user = await insertUser("d@example.com");
    await insertPost(user.id, { en: "hello-world", id: "halo-dunia" });

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    // In the 'id' locale this post's slug is "halo-dunia", not "hello-world"
    const result = await getPublicPostBySlug("hello-world", "id");

    expect(result).toBeNull();
  });

  it("returns null for an unknown slug", async () => {
    const user = await insertUser("e@example.com");
    await insertPost(user.id, { en: "hello-world" });

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    const result = await getPublicPostBySlug("missing-slug", "en");

    expect(result).toBeNull();
  });

  it("ignores draft posts", async () => {
    const user = await insertUser("f@example.com");
    await insertPost(user.id, { en: "draft-post" }, "draft");

    const { getPublicPostBySlug } =
      await import("../../../server/utils/post/service");
    const result = await getPublicPostBySlug("draft-post", "en");

    expect(result).toBeNull();
  });

  it("filters the public listing by a localized category slug", async () => {
    const user = await insertUser("g@example.com");
    const post = await insertPost(user.id, {
      en: "cat-post",
      id: "post-kategori",
    });

    const now = new Date();
    const [category] = await db
      .insert(schema.categories)
      .values({
        name: { en: "News", id: "Berita" },
        slug: { en: "news", id: "berita" },
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!category) throw new Error("Failed to insert test category");

    await db.insert(schema.postCategories).values({
      postId: post.id,
      categoryId: category.id,
      createdAt: now,
    });

    const { getPublicPosts } =
      await import("../../../server/utils/post/service");

    const idResults = await getPublicPosts({
      language: "id",
      categorySlug: "berita",
    });
    expect(idResults.data.map((p: any) => p.id)).toEqual([post.id]);

    const enResults = await getPublicPosts({
      language: "en",
      categorySlug: "news",
    });
    expect(enResults.data.map((p: any) => p.id)).toEqual([post.id]);
  });
});
