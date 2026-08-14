import { eq, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import type { UserRole } from "~/types/db";

export const userRepository = {
  async findByEmail(email: string) {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return users[0] || null;
  },

  async findById(id: number) {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    // Profiles are fetched via findProfileByUserId / findByIdWithProfile as needed
    return users[0] || null;
  },

  async findProfileByUserId(userId: number) {
    const profiles = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, userId))
      .limit(1);
    return profiles[0] || null;
  },

  async createProfile(data: typeof schema.userProfiles.$inferInsert) {
    return db.insert(schema.userProfiles).values(data).returning();
  },

  async findByIdWithProfile(id: number) {
    const users = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        password: schema.users.password,
        role: schema.users.role,
        isActive: schema.users.isActive,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        profile: {
          id: schema.userProfiles.id,
          firstName: schema.userProfiles.firstName,
          lastName: schema.userProfiles.lastName,
          avatar: schema.userProfiles.avatar,
          bio: schema.userProfiles.bio,
          dateOfBirth: schema.userProfiles.dateOfBirth,
          phoneNumber: schema.userProfiles.phoneNumber,
          address: schema.userProfiles.address,
        },
      })
      .from(schema.users)
      .leftJoin(
        schema.userProfiles,
        eq(schema.users.id, schema.userProfiles.userId),
      )
      .where(eq(schema.users.id, id))
      .limit(1);
    return users[0] || null;
  },

  async create(data: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
  }) {
    const result = await db
      .insert(schema.users)
      .values({
        name: data.name,
        email: data.email,
        password: data.password || null,
        role: data.role || "user",
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  },

  async findAll(page: number, perPage: number) {
    return db.query.users.findMany({
      columns: { password: false },
      limit: perPage,
      offset: (page - 1) * perPage,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
  },

  async count() {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users);
    return result[0]?.count;
  },

  async update(id: number, data: Partial<typeof schema.users.$inferInsert>) {
    const result = await db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  },

  async updateProfile(
    userId: number,
    data: Partial<typeof schema.userProfiles.$inferInsert>,
  ) {
    const result = await db
      .update(schema.userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.userProfiles.userId, userId))
      .returning();
    return result[0];
  },
};
