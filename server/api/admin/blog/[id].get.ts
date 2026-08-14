export default defineAuthHandler(
  async (event) => {
    const { id } = await getValidatedRouterParams(event, paramsIdSchema.parse);

    // Get raw post data with translation objects for editing
    const post = await postRepository.findById(id);
    if (!post) {
      throw createError({ statusCode: 404, statusMessage: "Post not found" });
    }

    // Add categories and tags
    const categories = await getLocalizedCategories(id, "en");
    const tags = await getLocalizedTags(id, "en");

    // Return full post with multi-language translation objects for editing
    return jsonResponse({ ...post, categories, tags }, "Post retrieved");
  },
  ["admin"],
);
