import { describe, it, expect } from "vitest";
import {
  uploadSchema,
  MediaQuerySchema,
} from "../../../shared/utils/schema/media";

describe("Media Schemas", () => {
  describe("uploadSchema", () => {
    const validUpload = {
      type: "image",
    };

    it("should accept valid upload with type only", () => {
      const result = uploadSchema.safeParse(validUpload);
      expect(result.success).toBe(true);
    });

    it("should accept public privacy", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        privacy: "public",
      });
      expect(result.success).toBe(true);
      expect(result.data?.privacy).toBe("public");
    });

    it("should accept optional description", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        description: "Profile picture",
      });
      expect(result.success).toBe(true);
    });

    it("should treat empty description as undefined", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        description: "   ",
      });
      expect(result.success).toBe(true);
      expect(result.data?.description).toBeUndefined();
    });

    it("should accept optional folder name", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        folderName: "Campaign Assets",
      });
      expect(result.success).toBe(true);
      expect(result.data?.folderName).toBe("Campaign Assets");
    });

    it("should reject invalid type", () => {
      const result = uploadSchema.safeParse({
        type: "video",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid privacy", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        privacy: "restricted",
      });
      expect(result.success).toBe(false);
    });

    it("should accept document type", () => {
      const result = uploadSchema.safeParse({
        type: "document",
      });
      expect(result.success).toBe(true);
    });

    it("should accept a valid aspect ratio", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        aspectRatio: "16:9",
      });
      expect(result.success).toBe(true);
      expect(result.data?.aspectRatio).toBe("16:9");
    });

    it("should accept a mobile aspect ratio", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        aspectRatio: "9:16",
      });
      expect(result.success).toBe(true);
    });

    it("should treat missing aspect ratio as undefined (original)", () => {
      const result = uploadSchema.safeParse(validUpload);
      expect(result.success).toBe(true);
      expect(result.data?.aspectRatio).toBeUndefined();
    });

    it("should reject an invalid aspect ratio", () => {
      const result = uploadSchema.safeParse({
        ...validUpload,
        aspectRatio: "4:3",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("MediaQuerySchema", () => {
    it("should accept empty query (all fields optional)", () => {
      const result = MediaQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept type filter", () => {
      const result = MediaQuerySchema.safeParse({ type: "image" });
      expect(result.success).toBe(true);
    });

    it("should accept privacy filter", () => {
      const result = MediaQuerySchema.safeParse({ privacy: "public" });
      expect(result.success).toBe(true);
    });

    it("should accept pagination parameters", () => {
      const result = MediaQuerySchema.safeParse({
        page: "1",
        limit: "20",
      });
      expect(result.success).toBe(true);
    });

    it("should accept all parameters combined", () => {
      const result = MediaQuerySchema.safeParse({
        type: "image",
        privacy: "public",
        page: "2",
        limit: "10",
        folderName: "campaign",
      });
      expect(result.success).toBe(true);
    });

    it("should accept folder name filter", () => {
      const result = MediaQuerySchema.safeParse({
        folderName: "product photos",
      });
      expect(result.success).toBe(true);
      expect(result.data?.folderName).toBe("product photos");
    });

    it("should reject invalid type", () => {
      const result = MediaQuerySchema.safeParse({ type: "video" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid privacy", () => {
      const result = MediaQuerySchema.safeParse({ privacy: "draft" });
      expect(result.success).toBe(false);
    });
  });
});
