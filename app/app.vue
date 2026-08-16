<script setup lang="ts">
const { siteName, absoluteUrl, defaultOgImage, defaultDescription } = useSeo();

const colorMode = useColorMode();
const color = computed(() =>
  colorMode.value === "dark" ? "#1b1718" : "#ffffff",
);

useHead({
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: color },
  ],
  link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "en",
  },
});

useSeoMeta({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} | ${siteName.value}` : siteName.value,
  description: defaultDescription,
  ogSiteName: siteName,
  ogLocale: "en_US",
  twitterCard: "summary_large_image",
  ogImage: defaultOgImage,
  applicationName: siteName,
});

// Global structured data: site + organization. Page-specific nodes (Article,
// CollectionPage, ...) reference these via `isPartOf: { "@id": ".../#website" }`.
useHead(() => ({
  script: [
    {
      key: "website-jsonld",
      type: "application/ld+json",
      textContent: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${absoluteUrl("/")}#website`,
            url: absoluteUrl("/"),
            name: siteName.value,
            inLanguage: "en",
            publisher: {
              "@id": `${absoluteUrl("/")}#organization`,
            },
          },
          {
            "@type": "Organization",
            "@id": `${absoluteUrl("/")}#organization`,
            url: absoluteUrl("/"),
            name: siteName.value,
            logo: {
              "@type": "ImageObject",
              url: defaultOgImage(),
            },
          },
        ],
      }),
    },
  ],
}));
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
