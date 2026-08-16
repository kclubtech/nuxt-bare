export default defineAuthHandler(
  async (event, { language }) => {
    try {
      const { name, color } = await readValidatedBody(
        event,
        CreateTagBodySchema.parse,
      );

      // Generate slug from name
      const slug = generateSlugFromInput(name);

      const result = await createTag({
        name: normalize(name, language),
        slug: normalize(slug, language),
        color,
      });

      return jsonResponse(result[0], "Tag created successfully");
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
