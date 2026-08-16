import { beforeEach, describe, expect, it, vi } from "vitest";

type MediaRow = {
  id: number;
  userId: number;
  folderId: number | null;
  parentId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: "image" | "document";
  privacy: "private" | "public";
  width: number | null;
  height: number | null;
  description: string | null;
  path: string;
  full_path: string;
  createdAt: Date;
  updatedAt: Date;
};

type MediaFolderRow = {
  id: number;
  userId: number;
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
};

type EqCondition = {
  type: "eq";
  column: string;
  value: unknown;
};

type AndCondition = {
  type: "and";
  conditions: Condition[];
};

type Condition = EqCondition | AndCondition;

const mediaColumns = {
  id: "id",
  userId: "userId",
  folderId: "folderId",
  parentId: "parentId",
  filename: "filename",
  originalName: "originalName",
  mimeType: "mimeType",
  size: "size",
  type: "type",
  privacy: "privacy",
  width: "width",
  height: "height",
  description: "description",
  path: "path",
  full_path: "full_path",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const mediaFoldersColumns = {
  id: "id",
  userId: "userId",
  name: "name",
  normalizedName: "normalizedName",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const state: {
  media: MediaRow[];
  mediaFolders: MediaFolderRow[];
} = {
  media: [],
  mediaFolders: [],
};

const removeItemMock = vi.fn<(filename: string) => Promise<void>>();

function matchesCondition(
  row: Record<string, unknown>,
  condition?: Condition,
): boolean {
  if (!condition) {
    return true;
  }

  if (condition.type === "eq") {
    return row[condition.column] === condition.value;
  }

  return condition.conditions.every((item) => matchesCondition(row, item));
}

function createSelectBuilder(projection?: Record<string, unknown>) {
  let source: typeof mediaColumns | typeof mediaFoldersColumns | undefined;
  let condition: Condition | undefined;

  const execute = () => {
    if (source === mediaColumns) {
      const rows = state.media.filter((row) =>
        matchesCondition(row, condition),
      );

      if (projection?.media === mediaColumns) {
        return rows.map((row) => ({
          media: { ...row },
          folder:
            state.mediaFolders.find((folder) => folder.id === row.folderId) ??
            null,
        }));
      }

      if (projection) {
        return rows.map((row) =>
          Object.fromEntries(
            Object.entries(projection).map(([key, column]) => [
              key,
              row[column as keyof MediaRow],
            ]),
          ),
        );
      }

      return rows.map((row) => ({ ...row }));
    }

    const folderRows = state.mediaFolders.filter((row) =>
      matchesCondition(row, condition),
    );

    if (projection) {
      return folderRows.map((row) =>
        Object.fromEntries(
          Object.entries(projection).map(([key, column]) => [
            key,
            row[column as keyof MediaFolderRow],
          ]),
        ),
      );
    }

    return folderRows.map((row) => ({ ...row }));
  };

  return {
    from(table: typeof mediaColumns | typeof mediaFoldersColumns) {
      source = table;
      return this;
    },
    leftJoin() {
      return this;
    },
    where(nextCondition: Condition) {
      condition = nextCondition;
      return this;
    },
    limit(limit: number) {
      return Promise.resolve(execute().slice(0, limit));
    },
    then(onFulfilled: (value: Record<string, unknown>[]) => unknown) {
      return Promise.resolve(execute()).then(onFulfilled);
    },
  };
}

const dbMock = {
  select(projection?: Record<string, unknown>) {
    return createSelectBuilder(projection);
  },
  insert(table: typeof mediaFoldersColumns) {
    return {
      values(value: Omit<MediaFolderRow, "id">) {
        return {
          returning() {
            const nextId =
              Math.max(0, ...state.mediaFolders.map((folder) => folder.id)) + 1;
            const createdFolder = {
              id: nextId,
              ...value,
            };

            if (table === mediaFoldersColumns) {
              state.mediaFolders.push(createdFolder);
            }

            return Promise.resolve([createdFolder]);
          },
        };
      },
    };
  },
  update(table: typeof mediaFoldersColumns) {
    return {
      set(values: Partial<MediaFolderRow>) {
        return {
          where(condition: Condition) {
            if (table === mediaFoldersColumns) {
              state.mediaFolders = state.mediaFolders.map((folder) =>
                matchesCondition(folder, condition)
                  ? { ...folder, ...values }
                  : folder,
              );
            }

            return Promise.resolve([]);
          },
        };
      },
    };
  },
  delete() {
    return {
      where(condition: EqCondition) {
        if (condition.column !== "id") {
          return Promise.resolve([]);
        }

        const deletedIds = new Set<number>([condition.value as number]);
        let changed = true;

        while (changed) {
          changed = false;
          for (const row of state.media) {
            if (
              row.parentId != null &&
              deletedIds.has(row.parentId) &&
              !deletedIds.has(row.id)
            ) {
              deletedIds.add(row.id);
              changed = true;
            }
          }
        }

        state.media = state.media.filter((row) => !deletedIds.has(row.id));
        return Promise.resolve([]);
      },
    };
  },
};

vi.mock("drizzle-orm", () => ({
  eq: (column: string, value: unknown) => ({ type: "eq", column, value }),
  and: (...conditions: Condition[]) => ({ type: "and", conditions }),
  count: () => ({ type: "count" }),
  desc: (column: string) => column,
  inArray: (column: string, values: unknown[]) => ({ column, values }),
  isNull: (column: string) => ({ type: "eq", column, value: null }),
  like: (column: string, value: unknown) => ({ type: "eq", column, value }),
}));

vi.mock("../../../server/db", () => ({
  db: dbMock,
  schema: {
    media: mediaColumns,
    mediaFolders: mediaFoldersColumns,
  },
}));

describe("Media Service", () => {
  beforeEach(() => {
    vi.resetModules();
    removeItemMock.mockReset();
    vi.stubGlobal("useStorage", () => ({
      removeItem: removeItemMock,
      setItemRaw: vi.fn(),
    }));

    state.media = [];
    state.mediaFolders = [];
  });

  it("normalizes folder names before matching", async () => {
    const { normalizeMediaFolderName } =
      await import("../../../server/utils/media/service");

    expect(normalizeMediaFolderName("  Campaign   Assets  ")).toBe(
      "campaign assets",
    );
  });

  it("creates a folder when an upload folder name does not exist yet", async () => {
    const { resolveMediaFolder } =
      await import("../../../server/utils/media/service");

    const folder = await resolveMediaFolder(10, " Campaign Assets ");

    expect(folder?.id).toBe(1);
    expect(folder?.name).toBe("Campaign Assets");
    expect(folder?.normalizedName).toBe("campaign assets");
    expect(state.mediaFolders).toHaveLength(1);
  });

  it("reuses and refreshes an existing folder for the same user", async () => {
    const now = new Date("2026-03-23T10:00:00.000Z");

    state.mediaFolders = [
      {
        id: 1,
        userId: 10,
        name: "campaign assets",
        normalizedName: "campaign assets",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const { resolveMediaFolder } =
      await import("../../../server/utils/media/service");
    const folder = await resolveMediaFolder(10, "Campaign Assets");

    expect(folder?.id).toBe(1);
    expect(state.mediaFolders).toHaveLength(1);
    expect(state.mediaFolders[0].name).toBe("Campaign Assets");
  });

  it("deletes thumbnail files when deleting an image with generated thumbnail", async () => {
    const now = new Date("2026-03-23T10:00:00.000Z");

    state.media = [
      {
        id: 1,
        userId: 10,
        folderId: null,
        parentId: null,
        filename: "hero.webp",
        originalName: "hero.png",
        mimeType: "image/webp",
        size: 1234,
        type: "image",
        privacy: "private",
        width: 1200,
        height: 800,
        description: null,
        path: "/assets/hero.webp",
        full_path: "/assets/hero.webp",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        userId: 10,
        folderId: null,
        parentId: 1,
        filename: "hero_thumb.webp",
        originalName: "hero.png",
        mimeType: "image/webp",
        size: 456,
        type: "image",
        privacy: "private",
        width: 300,
        height: 200,
        description: null,
        path: "/assets/hero_thumb.webp",
        full_path: "/assets/hero_thumb.webp",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const { deleteMedia } = await import("../../../server/utils/media/service");
    const deleted = await deleteMedia(1, 10);

    expect(deleted.id).toBe(1);
    expect(removeItemMock).toHaveBeenCalledTimes(2);
    expect(removeItemMock).toHaveBeenNthCalledWith(1, "hero.webp");
    expect(removeItemMock).toHaveBeenNthCalledWith(2, "hero_thumb.webp");
    expect(state.media).toEqual([]);
  });

  it("keeps the thumbnail quality at 100%", async () => {
    const { MEDIA_CONFIG } =
      await import("../../../server/utils/media/service");
    expect(MEDIA_CONFIG.IMAGE.thumbnail.quality).toBe(100);
  });

  it("deletes only the thumbnail file when removing a thumbnail directly", async () => {
    const now = new Date("2026-03-23T10:00:00.000Z");

    state.media = [
      {
        id: 1,
        userId: 10,
        folderId: null,
        parentId: null,
        filename: "hero.webp",
        originalName: "hero.png",
        mimeType: "image/webp",
        size: 1234,
        type: "image",
        privacy: "private",
        width: 1200,
        height: 800,
        description: null,
        path: "/assets/hero.webp",
        full_path: "/assets/hero.webp",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        userId: 10,
        folderId: null,
        parentId: 1,
        filename: "hero_thumb.webp",
        originalName: "hero.png",
        mimeType: "image/webp",
        size: 456,
        type: "image",
        privacy: "private",
        width: 300,
        height: 200,
        description: null,
        path: "/assets/hero_thumb.webp",
        full_path: "/assets/hero_thumb.webp",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const { deleteMedia } = await import("../../../server/utils/media/service");
    const deleted = await deleteMedia(2, 10);

    expect(deleted.id).toBe(2);
    expect(deleted).toHaveProperty("original");
    expect(removeItemMock).toHaveBeenCalledTimes(1);
    expect(removeItemMock).toHaveBeenCalledWith("hero_thumb.webp");
    expect(state.media.map((row) => row.id)).toEqual([1]);
  });
});
