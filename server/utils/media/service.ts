import { randomBytes } from "crypto";
import sharp from "sharp";
import { and, asc, count, desc, eq, inArray, isNull, like } from "drizzle-orm";
import { db, schema } from "../../db";
import type { MediaType, MediaPrivacy } from "~/types/db";

export interface UploadConfig {
  maxSize: number; // in bytes
  allowedTypes: readonly string[];
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/** Aspect ratios users can pick on upload ("original" = no crop). */
export type AspectRatio = "16:9" | "9:16";

export const MEDIA_CONFIG = {
  IMAGE: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    quality: 85,
    maxWidth: 2048,
    maxHeight: 2048,
    thumbnail: {
      maxWidth: 300,
      maxHeight: 300,
      quality: 100, // keep thumbnails crisp (was 70 → blurry)
    },
  },
  DOCUMENT: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  ASPECT_RATIOS: {
    "16:9": { width: 1920, height: 1080 },
    "9:16": { width: 1080, height: 1920 },
  },
} as const;

/**
 * Detect the real file type from its content (magic bytes).
 * Never trust the MIME type supplied by the client.
 */
export async function detectUploadType(
  buffer: Buffer,
  declaredType: MediaType,
  declaredMime: string,
): Promise<{ mime: string; extension: string }> {
  if (declaredType === "image") {
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format;
    const imageMimes: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    if (!format || !imageMimes[format]) {
      throw createError({
        statusCode: 400,
        statusMessage: "File is not a valid image",
      });
    }
    return { mime: imageMimes[format], extension: format };
  }

  // Documents — match by magic bytes against the allowed list
  const isZip = (b: Buffer) =>
    b.length >= 4 &&
    b[0] === 0x50 &&
    b[1] === 0x4b &&
    (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) &&
    (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08);
  const isOle2 = (b: Buffer) =>
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));

  const documentTypes = [
    {
      mime: "application/pdf",
      extension: "pdf",
      match: (b: Buffer) => b.subarray(0, 4).toString("latin1") === "%PDF",
    },
    {
      mime: "application/msword",
      extension: "doc",
      match: isOle2,
    },
    {
      mime: "application/vnd.ms-excel",
      extension: "xls",
      match: isOle2,
    },
    {
      mime: "application/vnd.ms-powerpoint",
      extension: "ppt",
      match: isOle2,
    },
    {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
      match: isZip,
    },
    {
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
      match: isZip,
    },
    {
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      extension: "pptx",
      match: isZip,
    },
  ];

  const matched = documentTypes.find((t) => t.match(buffer));
  if (matched) {
    return { mime: matched.mime, extension: matched.extension };
  }

  // Plain text has no reliable magic bytes — only accept it when declared as such
  if (
    declaredMime === "text/plain" &&
    buffer.length > 0 &&
    !buffer.includes(0)
  ) {
    return { mime: "text/plain", extension: "txt" };
  }

  throw createError({
    statusCode: 400,
    statusMessage: "File type could not be verified",
  });
}

export function generateFilename(
  originalName: string,
  userId: number,
  extension?: string,
): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  const safeExtension = (extension || originalName.split(".").pop() || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return `${userId}_${timestamp}_${random}${safeExtension ? `.${safeExtension}` : ""}`;
}

export async function processImage(
  buffer: Buffer,
  config: UploadConfig,
  aspectRatio?: AspectRatio,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let image = sharp(buffer);

  const metadata = await image.metadata();
  const { width = 0, height = 0 } = metadata;

  if (aspectRatio) {
    // Center-crop to the requested aspect ratio, derived from the source
    // dimensions so the ratio is always applied (no upscaling needed).
    // The configured max size is folded into the target box so a single
    // resize pass is used (chaining resizes in sharp cancels the first).
    const ratio = MEDIA_CONFIG.ASPECT_RATIOS[aspectRatio];
    let target = fitToAspectRatio(width, height, ratio.width, ratio.height);

    const maxW = config.maxWidth || target.width;
    const maxH = config.maxHeight || target.height;
    const scale = Math.min(maxW / target.width, maxH / target.height, 1);
    target = {
      width: Math.max(1, Math.round(target.width * scale)),
      height: Math.max(1, Math.round(target.height * scale)),
    };

    image = image.resize({
      width: target.width,
      height: target.height,
      fit: "cover",
      position: "center",
      withoutEnlargement: true,
    });
  } else if (config.maxWidth || config.maxHeight) {
    // Resize if needed (only when no aspect ratio crop)
    image = image.resize({
      width: config.maxWidth,
      height: config.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to WebP for better compression
  const processedBuffer = await image
    .webp({ quality: config.quality || 85 })
    .toBuffer();

  const finalMetadata = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    width: finalMetadata.width || width,
    height: finalMetadata.height || height,
  };
}

/**
 * Compute the largest target rectangle with the requested aspect ratio that
 * fits inside the source image (in other words: what to keep after a center
 * crop). Returns the source size untouched if the ratio is already matched.
 */
function fitToAspectRatio(
  sourceW: number,
  sourceH: number,
  ratioW: number,
  ratioH: number,
): { width: number; height: number } {
  if (!sourceW || !sourceH || ratioW <= 0 || ratioH <= 0) {
    return { width: sourceW, height: sourceH };
  }

  const sourceRatio = sourceW / sourceH;
  const targetRatio = ratioW / ratioH;

  if (sourceRatio > targetRatio) {
    // Too wide → crop the sides
    return { width: Math.round(sourceH * targetRatio), height: sourceH };
  }
  // Too tall → crop the top/bottom
  return { width: sourceW, height: Math.round(sourceW / targetRatio) };
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const storage = useStorage("file");
  // Use raw methods to avoid UTF-8 text encoding (which corrupts binary data)
  await storage.setItemRaw(filename, buffer);
  return filename;
}

export async function deleteFile(filename: string): Promise<void> {
  const storage = useStorage("file");
  await storage.removeItem(filename);
}

export async function createMediaRecord(data: {
  userId: number;
  folderId?: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: MediaType;
  privacy: MediaPrivacy;
  width?: number;
  height?: number;
  description?: string;
  parentId?: number;
}) {
  const path = `/assets/${data.filename}`;
  const result = await db
    .insert(schema.media)
    .values({
      ...data,
      path,
      full_path: path,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const first = result[0];
  if (!first) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create media record",
    });
  }

  return first;
}

export function normalizeMediaFolderName(folderName: string): string {
  return folderName.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function resolveMediaFolder(userId: number, folderName?: string) {
  const trimmedFolderName = folderName?.trim();
  if (!trimmedFolderName) {
    return null;
  }

  const normalizedName = normalizeMediaFolderName(trimmedFolderName);
  const existingFolder = (
    await db
      .select()
      .from(schema.mediaFolders)
      .where(
        and(
          eq(schema.mediaFolders.userId, userId),
          eq(schema.mediaFolders.normalizedName, normalizedName),
        ),
      )
      .limit(1)
  )[0];

  if (existingFolder) {
    const updates = {
      name: trimmedFolderName,
      updatedAt: new Date(),
    };

    await db
      .update(schema.mediaFolders)
      .set(updates)
      .where(eq(schema.mediaFolders.id, existingFolder.id));

    return {
      ...existingFolder,
      ...updates,
    };
  }

  const [createdFolder] = await db
    .insert(schema.mediaFolders)
    .values({
      userId,
      name: trimmedFolderName,
      normalizedName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return createdFolder;
}

export async function uploadFile(
  file: File,
  userId: number,
  type: MediaType,
  privacy: MediaPrivacy = "private",
  description?: string,
  folderName?: string,
  aspectRatio?: AspectRatio,
) {
  const config = type === "image" ? MEDIA_CONFIG.IMAGE : MEDIA_CONFIG.DOCUMENT;

  // Reject early on size (before reading the whole file into memory)
  if (file.size > config.maxSize) {
    throw createError({
      statusCode: 400,
      statusMessage: `File size exceeds maximum allowed size of ${config.maxSize / 1024 / 1024}MB`,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Verify the actual content, never trust the client-declared MIME type
  let detected: { mime: string; extension: string };
  try {
    detected = await detectUploadType(buffer, type, file.type);
  } catch (err: any) {
    if (err?.statusCode) throw err;
    throw createError({
      statusCode: 400,
      statusMessage: "File type could not be verified",
    });
  }

  if (!(config.allowedTypes as readonly string[]).includes(detected.mime)) {
    throw createError({
      statusCode: 400,
      statusMessage: `File type ${detected.mime} is not allowed`,
    });
  }

  // Generate filename with the verified extension
  const filename = generateFilename(file.name, userId, detected.extension);

  let processedBuffer = buffer;
  let width: number | undefined;
  let height: number | undefined;
  let finalFilename = filename;

  // Process images
  if (type === "image") {
    const processed = await processImage(buffer, config, aspectRatio);
    processedBuffer = Buffer.from(processed.buffer);
    width = processed.width;
    height = processed.height;

    // Update filename extension to .webp
    finalFilename = filename.replace(/\.[^.]+$/, ".webp");
  }

  // Save file to unstorage-backed filesystem
  await saveFile(processedBuffer, finalFilename);

  const folder = await resolveMediaFolder(userId, folderName);

  // Create database record for the main file
  const mediaRecord = await createMediaRecord({
    userId,
    folderId: folder?.id ?? null,
    filename: finalFilename,
    originalName: file.name,
    mimeType: type === "image" ? "image/webp" : detected.mime,
    size: processedBuffer.length,
    type,
    privacy,
    width,
    height,
    description,
  });

  // If we uploaded an image, also generate a thumbnail record
  let thumbnailRecord: Awaited<ReturnType<typeof createMediaRecord>> | null =
    null;

  if (type === "image") {
    const thumbnailBuffer = await sharp(processedBuffer)
      .resize({
        width: MEDIA_CONFIG.IMAGE.thumbnail.maxWidth,
        height: MEDIA_CONFIG.IMAGE.thumbnail.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: MEDIA_CONFIG.IMAGE.thumbnail.quality })
      .toBuffer();

    const thumbnailFilename = finalFilename.replace(
      /\.[^.]+$/,
      (match) => `_thumb${match}`,
    );

    await saveFile(thumbnailBuffer, thumbnailFilename);

    thumbnailRecord = await createMediaRecord({
      userId,
      folderId: folder?.id ?? null,
      filename: thumbnailFilename,
      originalName: file.name,
      mimeType: "image/webp",
      size: thumbnailBuffer.length,
      type,
      privacy,
      width: Math.min(width ?? 0, MEDIA_CONFIG.IMAGE.thumbnail.maxWidth),
      height: Math.min(height ?? 0, MEDIA_CONFIG.IMAGE.thumbnail.maxHeight),
      description,
      parentId: mediaRecord.id,
    });
  }

  return {
    ...mediaRecord,
    folder,
    folderName: folder?.name ?? null,
    thumbnail: thumbnailRecord,
  };
}

export async function getMediaById(id: number, userId?: number) {
  const mediaQuery = db
    .select({
      media: schema.media,
      folder: schema.mediaFolders,
    })
    .from(schema.media)
    .leftJoin(
      schema.mediaFolders,
      eq(schema.media.folderId, schema.mediaFolders.id),
    )
    .where(eq(schema.media.id, id))
    .limit(1);

  const media = (await mediaQuery)[0];

  if (!media) {
    throw createError({ statusCode: 404, statusMessage: "Media not found" });
  }

  const mediaRecord = {
    ...media.media,
    folder_name: media.folder?.name ?? null,
    folder: media.folder,
  };

  // Check access permissions
  if (mediaRecord.privacy === "private" && mediaRecord.userId !== userId) {
    throw createError({ statusCode: 403, statusMessage: "Access denied" });
  }

  // If this is a thumbnail, include the original media record too
  if (mediaRecord.parentId) {
    const original = (
      await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.id, mediaRecord.parentId))
        .limit(1)
    )[0];

    return {
      ...mediaRecord,
      original,
    };
  }

  // Otherwise, include the thumbnail (if any)
  const thumbnail = (
    await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.parentId, mediaRecord.id))
      .limit(1)
  )[0];

  return {
    ...mediaRecord,
    thumbnail,
  };
}

export async function deleteMedia(id: number, userId: number) {
  const media = await getMediaById(id, userId);

  if (media.userId !== userId) {
    throw createError({ statusCode: 403, statusMessage: "Access denied" });
  }

  const thumbnailFilenames =
    media.parentId == null
      ? (
          await db
            .select({ filename: schema.media.filename })
            .from(schema.media)
            .where(eq(schema.media.parentId, id))
        ).map((thumbnail) => thumbnail.filename)
      : [];

  // Delete from database
  await db.delete(schema.media).where(eq(schema.media.id, id));

  // Delete file from storage
  try {
    await deleteFile(media.filename);
  } catch (error) {
    // File might not exist, but don't fail the operation
    console.warn("Failed to delete file:", media.filename, error);
  }

  // If this media has thumbnails, delete their files too.
  try {
    await Promise.all(
      thumbnailFilenames.map(async (thumbnailFilename) => {
        await deleteFile(thumbnailFilename);
      }),
    );
  } catch (error) {
    console.warn("Failed to delete thumbnail files for media:", id, error);
  }

  return media;
}

export async function getUserMedia(
  type?: MediaType,
  privacy?: MediaPrivacy,
  page = 1,
  limit = 20,
  userId?: number,
  folderName?: string,
) {
  const offset = (page - 1) * limit;
  const conditions = [isNull(schema.media.parentId)];

  if (userId) {
    conditions.push(eq(schema.media.userId, userId));
  }

  if (type) {
    conditions.push(eq(schema.media.type, type));
  }

  if (privacy) {
    conditions.push(eq(schema.media.privacy, privacy));
  }

  const normalizedFolderName = folderName?.trim().toLowerCase();
  if (normalizedFolderName) {
    conditions.push(
      like(schema.mediaFolders.normalizedName, `%${normalizedFolderName}%`),
    );
  }

  const whereClause = and(...conditions);
  const media = await db
    .select({
      media: schema.media,
      folder: schema.mediaFolders,
    })
    .from(schema.media)
    .leftJoin(
      schema.mediaFolders,
      eq(schema.media.folderId, schema.mediaFolders.id),
    )
    .where(whereClause)
    .orderBy(desc(schema.media.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ totalCount: count() })
    .from(schema.media)
    .leftJoin(
      schema.mediaFolders,
      eq(schema.media.folderId, schema.mediaFolders.id),
    )
    .where(whereClause);
  const totalCount = Number(countResult[0]?.totalCount ?? 0);

  // Attach thumbnails for each media item (if any)
  const mediaIds = media.map((item) => item.media.id);
  if (mediaIds.length === 0) {
    return {
      data: [],
      totalCount,
    };
  }

  const thumbnails = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.parentId, mediaIds));

  const thumbnailsByParent = thumbnails.reduce(
    (acc, thumb) => {
      if (thumb.parentId) acc[thumb.parentId] = thumb;
      return acc;
    },
    {} as Record<number, (typeof thumbnails)[number]>,
  );

  return {
    data: media.map((item) => ({
      ...item.media,
      folder: item.folder,
      folderName: item.folder?.name ?? null,
      thumbnail: thumbnailsByParent[item.media.id] ?? null,
    })),
    totalCount,
  };
}

export async function getUserMediaFolders(userId: number) {
  return db
    .select()
    .from(schema.mediaFolders)
    .where(eq(schema.mediaFolders.userId, userId))
    .orderBy(asc(schema.mediaFolders.name));
}
