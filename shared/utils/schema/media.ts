import { z } from "zod";

const optionalFolderNameSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(120).optional());

const optionalDescriptionSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(2).max(255).optional());

export const uploadSchema = z.object({
  type: z.enum(["image", "document"]),
  alt: z.string().optional(),
  privacy: z.enum(["private", "public"]).optional().default("public"),
  description: optionalDescriptionSchema,
  folderName: optionalFolderNameSchema,
  // Crop the uploaded image to an aspect ratio ("original" = no crop)
  aspectRatio: z.enum(["16:9", "9:16"]).optional(),
});

export const MediaQuerySchema = z.object({
  type: z.enum(["image", "document"]).optional(),
  privacy: z.enum(["private", "public"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  folderName: optionalFolderNameSchema,
});

export type UploadMedia = z.infer<typeof uploadSchema>;
export type MediaQuery = z.infer<typeof MediaQuerySchema>;
