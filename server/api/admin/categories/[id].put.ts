export default defineAuthHandler(
  async (event, { language }) => {
    try {
      const { id } = await getValidatedRouterParams(
        event,
        paramsIdSchema.parse,
      );

      const data = await readValidatedBody(
        event,
        UpdateCategoryBodySchema.parse,
      );

      const existing = await getCategoryByIdRaw(id);
      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: "Category not found",
        });
      }

      const merged: any = {};
      if (data.name) {
        merged.name = { ...existing.name, ...normalize(data.name, language) };
      }
      if (data.slug) {
        merged.slug = { ...existing.slug, ...normalize(data.slug, language) };
      }
      if (data.description) {
        merged.description = {
          ...existing.description,
          ...normalize(data.description, language),
        };
      }
      if (data.color !== undefined) {
        merged.color = data.color;
      }

      const result = await updateCategory(id, merged);
      return jsonResponse(result[0], "Category updated successfully");
    } catch (error) {
      if (error instanceof H3Error) {
        throw createError({
          statusCode: error.statusCode,
          statusMessage: error.statusMessage,
          data: JSON.parse(error.data.message),
        });
      }

      throw createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
        data: process.env.NODE_ENV === "development" && error instanceof Error,
      });
    }
  },
  ["admin"],
);
