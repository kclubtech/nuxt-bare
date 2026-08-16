import type { schema } from "../../server/db";

export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;
export type UserRole = "admin" | "user" | "moderator";

export type UserProfile = typeof schema.userProfiles.$inferSelect;
export type NewUserProfile = typeof schema.userProfiles.$inferInsert;

export type UserWithProfile = User & {
  profile?: UserProfile | null;
};

export type Post = typeof schema.posts.$inferSelect;
export type NewPost = typeof schema.posts.$inferInsert;

export type MediaFolder = typeof schema.mediaFolders.$inferSelect;
export type NewMediaFolder = typeof schema.mediaFolders.$inferInsert;

export type Media = typeof schema.media.$inferSelect & {
  thumbnail?: typeof schema.media.$inferSelect | null;
  folder?: MediaFolder | null;
  folderName?: string | null;
};
export type NewMedia = typeof schema.media.$inferInsert;

export type MediaUsage = typeof schema.mediaUsage.$inferSelect;
export type NewMediaUsage = typeof schema.mediaUsage.$inferInsert;

export type EmailVerification = typeof schema.emailVerifications.$inferSelect;
export type NewEmailVerification =
  typeof schema.emailVerifications.$inferInsert;

export type PasswordReset = typeof schema.passwordResets.$inferSelect;
export type NewPasswordReset = typeof schema.passwordResets.$inferInsert;

// Auth types
export type UserTokenType = "email_verification" | "password_reset";

// Media types
export type MediaType = "image" | "document";
export type MediaPrivacy = "public" | "private";

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}
