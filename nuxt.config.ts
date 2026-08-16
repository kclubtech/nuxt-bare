// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxt/hints",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/test-utils/module",
    "@nuxtjs/google-fonts",
    "@nuxtjs/mdc",
    "@nuxtjs/seo",
    "@pinia/colada-nuxt",
    "@pinia/nuxt",
    "nuxt-auth-utils",
    "nuxt-email-renderer",
    "@vueuse/nuxt",
    "@nuxtjs/i18n",
  ],

  devtools: {
    enabled: true,
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    externals: {
      external: ["better-sqlite3"],
    },
    storage: {
      file: {
        driver: "fs",
        base: "assets",
      },
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || process.env.NUXT_APP_URL || "http://localhost:3000",
    name: process.env.NUXT_APP_NAME || "Nuxt Bare",
    defaultLocale: "en",
  },

  ogImage: {
    // Render .takumi.vue templates with the native Takumi engine
    compatibility: {
      runtime: {
        takumi: "node",
        resvg: "node",
      },
    },
    defaults: {
      width: 1200,
      height: 630,
    },
  },

  css: ["~/assets/css/main.css"],

  routeRules: {
    "/admin/**": { ssr: false },
    // Authenticated dashboard-style pages — client-rendered so they don't SSR
    // authenticated fetches without cookies
    "/profile": { ssr: false },
    "/profile/**": { ssr: false },
  },

  compatibilityDate: "2026-01-15",

  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    // Private keys (only available on server-side)
    // Session signing secret is handled by nuxt-auth-utils via NUXT_SESSION_PASSWORD

    // Mail configuration for nodemailer
    mailHost: process.env.NUXT_MAIL_HOST || "localhost",
    mailPort: process.env.NUXT_MAIL_PORT || "587",
    mailUsername: process.env.NUXT_MAIL_USER || "",
    mailPassword: process.env.NUXT_MAIL_PASS || "",
    mailFrom: process.env.NUXT_MAIL_FROM || "noreply@example.com",
    mailSecure: process.env.NUXT_MAIL_SECURE === "true", // true for port 465, false for other ports

    // App configuration
    appName: process.env.NUXT_APP_NAME || "Nuxt App",
    appUrl: process.env.NUXT_APP_URL || "http://localhost:3000",

    // Public keys (available on both server and client-side)
    public: {
      appName: process.env.NUXT_APP_NAME || "Nuxt App",
      appUrl: process.env.NUXT_PUBLIC_SITE_URL || process.env.NUXT_APP_URL || "http://localhost:3000",
      defaultOgImage: "/og-default.png",
    },
  },
  googleFonts: {
    families: {
      Inter: [300, 400, 500, 600, 700],
      "Plus Jakarta Sans": [500, 600, 700, 800],
    },
    display: "swap",
    preload: true,
  },

  i18n: {
    vueI18n: "./i18n.config.ts",
    // list of supported locales; each can include a code, ISO, and file path
    locales: [
      { code: "en", iso: "en-US", file: "en.json" },
      { code: "id", iso: "id-ID", file: "id.json" },
    ],
    defaultLocale: "en",
    strategy: "no_prefix", // simplest strategy, no prefix on routes
    // where translation files live
    langDir: "locales/",
  },

  sitemap: {
    // Dynamic URLs are provided by /server/api/__sitemap__/urls.ts
    sources: ["/api/__sitemap__/urls"],
    // Static pages already handled automatically by Nuxt module scanning
    // Exclude admin and auth pages from sitemap
    exclude: [
      "/admin",
      "/admin/**",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/profile",
      "/profile/**",
    ],
  },
  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "zod",
        // Tiptap editor (used by Common/ContentEditor via Nuxt UI's UEditor)
        "@tiptap/core",
        "@tiptap/vue-3",
        "@tiptap/extension-text-align",
        "prosemirror-state",
        "prosemirror-transform",
        "prosemirror-model",
        "prosemirror-view",
      ],
    },
  },
});
