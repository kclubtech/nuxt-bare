export default defineAuthHandler(
  async (event) => {
    const filters = await getValidatedQuery(event, adminUserQuerySchema.parse);

    // Get users with filters and pagination
    return await getUsers(
      {
        search: filters.search,
        role: filters.role,
        isActive: filters.isActive,
        emailVerified: filters.emailVerified,
      },
      {
        page: filters.page,
        limit: filters.limit,
      },
    );
  },
  {
    role: ["admin"],
  },
);
