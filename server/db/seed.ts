import { db, schema } from "./index";
import { faker } from "@faker-js/faker";
import { Hash } from "@adonisjs/hash";
import { Scrypt } from "@adonisjs/hash/drivers/scrypt";
import {
  AllPermissions,
  type FeatureName,
} from "../../shared/utils/permissions";

const scrypt = new Scrypt({
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  saltSize: 16,
  keyLength: 64,
  maxMemory: 33554432,
});
const hash = new Hash(scrypt);

async function hashPassword(password: string) {
  return await hash.make(password);
}

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data (order matters due to foreign keys)
    await db.delete(schema.postTags);
    await db.delete(schema.postCategories);
    await db.delete(schema.posts);
    await db.delete(schema.categories);
    await db.delete(schema.tags);
    await db.delete(schema.userPermissions);
    await db.delete(schema.userProfiles);
    await db.delete(schema.users);

    // Generate 10 fake users
    const usersData = await Promise.all(
      Array.from({ length: 10 }).map(async () => ({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: await hashPassword("password"),
        role: faker.helpers.arrayElement(["user", "admin", "moderator"]),
        emailVerified: faker.datatype.boolean(),
        isActive: faker.datatype.boolean(),
        createdAt: faker.date.past(),
        updatedAt: new Date(),
      })),
    );

    // Add a consistent super admin user
    usersData.push({
      name: "Super Admin",
      email: "superadmin@gmail.com",
      password: await hashPassword("password"),
      role: "admin",
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert users
    const sampleUsers = await db
      .insert(schema.users)
      .values(usersData)
      .returning();

    console.log(`✅ Inserted ${sampleUsers.length} users`);

    // Insert user profiles
    const profilesData = sampleUsers.map((user) => {
      const nameParts = user.name.split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "User";

      return {
        userId: user.id,
        firstName,
        lastName,
        bio: faker.person.bio(),
        avatar: faker.image.avatar(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    await db.insert(schema.userProfiles).values(profilesData);
    console.log(`✅ Inserted ${profilesData.length} profiles`);

    // Insert sample categories
    const categoriesData = Array.from({ length: 10 }).map(() => ({
      name: { en: faker.lorem.word() },
      slug: { en: faker.lorem.slug() },
      description: { en: faker.lorem.sentence() },
      color: faker.helpers.arrayElement([
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
      ]),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertedCats = await db
      .insert(schema.categories)
      .values(categoriesData)
      .returning();
    console.log(`✅ Inserted ${insertedCats.length} categories`);

    // Insert sample tags
    const tagsData = Array.from({ length: 15 }).map(() => ({
      name: { en: faker.lorem.word() },
      slug: { en: faker.lorem.slug() },
      color: faker.helpers.arrayElement([
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
      ]),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertedTags = await db
      .insert(schema.tags)
      .values(tagsData)
      .returning();
    console.log(`✅ Inserted ${insertedTags.length} tags`);

    // Insert sample posts
    const postsData = Array.from({ length: 20 }).map(() => {
      const now = new Date();
      return {
        slug: { en: faker.lorem.slug() },
        title: { en: faker.lorem.sentence() },
        shortDescription: { en: faker.lorem.sentences(2) },
        content: { en: faker.lorem.paragraphs() },
        userId: faker.helpers.arrayElement(sampleUsers).id,
        status: faker.helpers.arrayElement(["draft", "published", "archived"]),
        createdAt: now,
        updatedAt: now,
      };
    });

    const insertedPosts = await db
      .insert(schema.posts)
      .values(postsData)
      .returning();
    console.log(`✅ Inserted ${insertedPosts.length} posts`);

    // randomly associate categories/tags with posts
    for (const post of insertedPosts) {
      const catCount = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < catCount; i++) {
        // pick random category from insertedCats
        const category = faker.helpers.arrayElement(insertedCats);
        await db.insert(schema.postCategories).values({
          postId: post.id,
          categoryId: category.id,
          createdAt: new Date(),
        });
      }
      const tagCount = faker.number.int({ min: 0, max: 5 });
      for (let i = 0; i < tagCount; i++) {
        const tag = faker.helpers.arrayElement(insertedTags);
        await db
          .insert(schema.postTags)
          .values({ postId: post.id, tagId: tag.id, createdAt: new Date() });
      }
    }
    console.log(`✅ Associated categories/tags with posts`);

    // Seed permissions:
    // - superadmin gets all features
    // - all other users get all features except "users"
    const superAdmin = sampleUsers.find(
      (u) => u.email === "superadmin@gmail.com",
    )!;
    const otherUsers = sampleUsers.filter(
      (u) => u.email !== "superadmin@gmail.com",
    );
    const now = new Date();

    const allPermissions = AllPermissions();
    const allFeatures = Object.keys(allPermissions) as FeatureName[];
    const nonUserFeatures = allFeatures.filter(
      (feature) => feature !== "users",
    );
    const permissionsData: (typeof schema.userPermissions.$inferInsert)[] = [
      ...allFeatures.map((feature) => ({
        userId: superAdmin.id,
        feature,
        permissions: allPermissions[feature],
        createdAt: now,
        updatedAt: now,
      })),
      ...otherUsers.flatMap((user) =>
        nonUserFeatures.map((feature) => ({
          userId: user.id,
          feature,
          permissions: allPermissions[feature],
          createdAt: now,
          updatedAt: now,
        })),
      ),
    ];

    await db.insert(schema.userPermissions).values(permissionsData);
    console.log(
      `✅ Inserted permissions (superadmin: all features | others: all except users)`,
    );

    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error);
}

export default seed;
