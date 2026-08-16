import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table with authentication fields
export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // null for OAuth users
  role: text("role").notNull().default("user"), // user, admin, moderator
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// User profiles
export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
  phoneNumber: text("phone_number"),
  address: text("address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// User tokens for email verification and password reset
export const userTokens = sqliteTable("user_tokens", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  type: text("type").notNull(), // 'email_verification', 'password_reset'
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Email verifications
export const emailVerifications = sqliteTable("email_verifications", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  verifiedAt: integer("verified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Password resets
export const passwordResets = sqliteTable("password_resets", {
  id: integer("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Media management
export const mediaFolders = sqliteTable(
  "media_folders",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userNormalizedNameIdx: uniqueIndex("media_folders_user_name_unique").on(
      table.userId,
      table.normalizedName,
    ),
  }),
);

export const media = sqliteTable("media", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references(() => mediaFolders.id, {
    onDelete: "set null",
  }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => media.id, {
    onDelete: "cascade",
  }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(), // 'image', 'document'
  privacy: text("privacy").notNull().default("private"), // 'private', 'public'
  width: integer("width"),
  height: integer("height"),
  description: text("description"),
  path: text("path"),
  full_path: text("full_path"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Media usage tracking
export const mediaUsage = sqliteTable("media_usage", {
  id: integer("id").primaryKey(),
  mediaId: integer("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'user_profile', 'post', etc.
  entityId: integer("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Posts table (updated to use JSON for multi-language)
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  title: text("title", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  shortDescription: text("short_description", { mode: "json" }).$type<
    Record<string, string>
  >(),
  content: text("content", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  featuredImageId: integer("featured_image_id").references(() => media.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Categories with localized names
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey(),
  name: text("name", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  slug: text("slug", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  description: text("description", { mode: "json" }).$type<
    Record<string, string>
  >(),
  color: text("color").default("#3b82f6"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Tags with localized names
export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey(),
  name: text("name", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  slug: text("slug", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull(),
  color: text("color").default("#06b6d4"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Junction table for posts and categories (many-to-many)
export const postCategories = sqliteTable("post_categories", {
  id: integer("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Junction table for posts and tags (many-to-many)
export const postTags = sqliteTable("post_tags", {
  id: integer("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  tokens: many(userTokens),
  posts: many(posts),
  mediaFolders: many(mediaFolders),
  media: many(media),
  permissions: many(userPermissions),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userTokensRelations = relations(userTokens, ({ one }) => ({
  user: one(users, {
    fields: [userTokens.userId],
    references: [users.id],
  }),
}));

export const emailVerificationsRelations = relations(
  emailVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [emailVerifications.userId],
      references: [users.id],
    }),
  }),
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  featuredImage: one(media, {
    fields: [posts.featuredImageId],
    references: [media.id],
  }),
  categories: many(postCategories),
  tags: many(postTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
  post: one(posts, {
    fields: [postCategories.postId],
    references: [posts.id],
  }),
  category: one(categories, {
    fields: [postCategories.categoryId],
    references: [categories.id],
  }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  owner: one(users, {
    fields: [media.userId],
    references: [users.id],
  }),
  folder: one(mediaFolders, {
    fields: [media.folderId],
    references: [mediaFolders.id],
  }),
  parent: one(media, {
    fields: [media.parentId],
    references: [media.id],
  }),
  thumbnails: many(media, { relationName: "thumbnails" }),
  usage: many(mediaUsage),
}));

export const mediaFoldersRelations = relations(
  mediaFolders,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [mediaFolders.userId],
      references: [users.id],
    }),
    media: many(media),
  }),
);

export const mediaUsageRelations = relations(mediaUsage, ({ one }) => ({
  media: one(media, {
    fields: [mediaUsage.mediaId],
    references: [media.id],
  }),
}));

// User permissions (feature-level access control)
export const userPermissions = sqliteTable("user_permissions", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(), // e.g., "users", "blog", "media", "category"
  permissions: text("permissions", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userPermissionsRelations = relations(
  userPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [userPermissions.userId],
      references: [users.id],
    }),
  }),
);
