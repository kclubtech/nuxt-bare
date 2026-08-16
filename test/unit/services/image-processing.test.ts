import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

// The media service imports the DB at module load; stub it since these tests
// only exercise pure image processing (sharp).
vi.mock("../../../server/db", () => ({
  db: {},
  schema: {},
}));

import {
  processImage,
  MEDIA_CONFIG,
} from "../../../server/utils/media/service";

async function makeImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

async function process(
  buffer: Buffer,
  aspectRatio?: "16:9" | "9:16",
): Promise<{ width: number; height: number }> {
  const result = await processImage(
    buffer,
    MEDIA_CONFIG.IMAGE as any,
    aspectRatio,
  );
  return { width: result.width, height: result.height };
}

describe("Image processing — aspect ratio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crops a landscape image to 16:9", async () => {
    const buffer = await makeImage(800, 600); // 4:3
    const result = await process(buffer, "16:9");

    expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
    // Source is taller than 16:9 → top/bottom cropped, width kept
    expect(result.width).toBe(800);
    expect(result.height).toBe(450);
  });

  it("crops a portrait image to 9:16 (mobile)", async () => {
    const buffer = await makeImage(600, 800); // 3:4
    const result = await process(buffer, "9:16");

    expect(result.width / result.height).toBeCloseTo(9 / 16, 2);
    expect(result.height).toBe(800);
    expect(result.width).toBe(450);
  });

  it("crops an already-16:9 image to the same 16:9 ratio", async () => {
    const buffer = await makeImage(1600, 900);
    const result = await process(buffer, "16:9");

    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
  });

  it("does not upscale a small image when cropping to 16:9", async () => {
    const buffer = await makeImage(100, 100);
    const result = await process(buffer, "16:9");

    expect(result.width).toBe(100);
    expect(result.height).toBe(56); // 100 / (16/9) ≈ 56
  });

  it("keeps the original dimensions when no aspect ratio is requested", async () => {
    const buffer = await makeImage(800, 600);
    const result = await process(buffer);

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("downscales large aspect-ratio crops to the configured max size", async () => {
    const buffer = await makeImage(4000, 3000);
    const result = await process(buffer, "16:9");

    expect(result.width).toBeLessThanOrEqual(MEDIA_CONFIG.IMAGE.maxWidth);
    expect(result.width / result.height).toBeCloseTo(16 / 9, 2);
  });
});
