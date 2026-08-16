<template>
  <UContainer>
    <UPageHero
      :title="$t('welcome')"
      description="A Nuxt/Vue-integrated UI library providing a rich set of fully-styled, accessible and highly customizable components for building modern web applications."
      headline="New release"
    />
  </UContainer>
</template>

<script setup lang="ts">
const { siteName, absoluteUrl, defaultDescription, breadcrumbSchema } = useSeo();
const route = useRoute();

const title = "Home";
const description = defaultDescription;
const canonicalUrl = computed(() => absoluteUrl(route.path));

useHead(() => ({
  link: [{ key: "canonical", rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      key: "home-jsonld",
      type: "application/ld+json",
      textContent: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonicalUrl.value}#webpage`,
            url: canonicalUrl.value,
            name: title,
            description,
            inLanguage: "en",
            isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          },
          breadcrumbSchema([{ name: "Home", path: "/" }]),
        ],
      }),
    },
  ],
}));

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: canonicalUrl,
  twitterTitle: title,
  twitterDescription: description,
});

defineOgImage(
  "GeneralPage.takumi",
  {
    title,
    description,
    siteName: siteName.value,
  },
  [{ key: "og" }, { key: "whatsapp", width: 800, height: 800 }],
);
</script>

<style scoped></style>
