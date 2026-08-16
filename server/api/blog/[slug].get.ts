export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Slug is required" });
  }

  const acceptLanguage = getRequestLanguage(event);
  const query = getQuery(event);
  const language = query.lang
    ? normalizeLanguage(query.lang as string)
    : acceptLanguage;

  const post = await getPublicPostBySlug(slug, language);
  if (!post) {
    throw createError({ statusCode: 404, statusMessage: "Post not found" });
  }

  return jsonResponse(post, "Post retrieved");
});
