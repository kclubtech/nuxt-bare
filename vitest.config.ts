import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
export default defineConfig({
  test: {
    globals: true,
    globalSetup: ["test/setup.ts"],
    alias: {
      "#auth-utils": path.resolve(
        __dirname,
        "./node_modules/nuxt-auth-utils/dist/runtime/server/utils/index.mjs",
      ),
    },
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.{test,spec}.ts"],
          environment: "node",
          globals: true,
          isolate: false,
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
      await defineVitestProject({
        plugins: [
          {
            // bun:test is a Bun built-in that @nuxt/test-utils imports conditionally.
            // Vite fails trying to bundle it in the client environment, so stub it out.
            name: "stub-bun-test",
            enforce: "pre",
            resolveId(id) {
              if (id === "bun:test") return "\0bun-test-stub";
            },
            load(id) {
              if (id === "\0bun-test-stub") return "export default {};";
            },
          },
          {
            // @nuxt/test-utils imports h3-next/generic to support nitro v3 (h3 2.x).
            // This project uses nitro v2 (h3 1.x), so h3Version is always 1 and that
            // branch is dead code — but Vite statically resolves the import and fails
            // when the module isn't installed. Stub it out instead of pulling h3 2.x
            // into the tree (the app must stay on h3 1.x, compatible with nitro v2).
            name: "stub-h3-next",
            enforce: "pre",
            resolveId(id) {
              if (id === "h3-next/generic") return "\0h3-next-generic-stub";
            },
            load(id) {
              if (id === "\0h3-next-generic-stub") {
                return "export const H3 = class H3 {};";
              }
            },
          },
        ],
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.{test,spec}.ts"],
          environment: "nuxt",
          // All nuxt tests share the same SQLite file — run files sequentially
          fileParallelism: false,
          sequence: { groupOrder: 2 },
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL("./", import.meta.url)),
            },
          },
        },
      }),
    ],
  },
});
