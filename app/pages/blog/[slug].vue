<script setup lang="ts">
const route = useRoute();
const { locale } = useI18n();
const { siteName, absoluteUrl, defaultOgImage, mediaUrl, breadcrumbSchema } = useSeo();

const slug = computed(() => route.params.slug as string);
const lang = computed(() => locale.value);

const { data, status, error } = usePublicPostQuery(slug, lang);
const post = computed(() => data.value?.data);

const breadcrumbItems = computed(() => [
  { label: "Home", to: "/" },
  { label: "Blog", to: "/blog" },
  { label: post.value?.title || "Article" },
]);

// 404 if not found
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: "Post not found" });
}

const canonicalUrl = computed(() => absoluteUrl(`/blog/${slug.value}`));
const ogImageUrl = computed(() =>
  post.value?.featuredImage
    ? mediaUrl(post.value.featuredImage.full_path)
    : defaultOgImage(),
);
const articleDate = computed(() =>
  post.value
    ? new Date(post.value.createdAt).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "",
);

// Article + breadcrumb structured data, linked to the global #website node.
const articleSchemaGraph = computed(() => {
  if (!post.value) return [];
  const p = post.value;
  return [
    {
      "@type": "Article",
      "@id": `${canonicalUrl.value}#article`,
      headline: p.title,
      description: p.shortDescription || undefined,
      url: canonicalUrl.value,
      mainEntityOfPage: canonicalUrl.value,
      image: ogImageUrl.value ? [ogImageUrl.value] : undefined,
      datePublished: new Date(p.createdAt).toISOString(),
      dateModified: new Date(p.updatedAt).toISOString(),
      author: p.author
        ? { "@type": "Person", name: p.author.name }
        : undefined,
      articleSection: p.categories?.map((c) => c.name),
      keywords: p.tags?.map((t) => t.name).join(", "),
      inLanguage: p.language || "en",
      isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: p.title, path: `/blog/${slug.value}` },
    ]),
  ];
});

useHead(() => ({
  link: [{ key: "canonical", rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      key: "article-jsonld",
      type: "application/ld+json",
      textContent: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": articleSchemaGraph.value,
      }),
    },
  ],
}));

// SEO — reactive to fetched post data
useSeoMeta({
  title: () => post.value?.title ?? "",
  description: () => post.value?.shortDescription ?? "",
  ogTitle: () => post.value?.title ?? "",
  ogDescription: () => post.value?.shortDescription ?? "",
  ogType: "article",
  ogUrl: canonicalUrl,
  twitterTitle: () => post.value?.title ?? "",
  twitterDescription: () => post.value?.shortDescription ?? "",
  articlePublishedTime: () =>
    post.value ? new Date(post.value.createdAt).toISOString() : undefined,
  articleModifiedTime: () =>
    post.value ? new Date(post.value.updatedAt).toISOString() : undefined,
  articleSection: () => post.value?.categories?.[0]?.name ?? undefined,
  articleTag: () => post.value?.tags?.map((t) => t.name) ?? [],
});

// Branded share cards: 1200x630 for og:image, square variant for WhatsApp.
defineOgImage("Article.takumi", {
  title: computed(() => post.value?.title ?? "Article"),
  description: computed(() => post.value?.shortDescription ?? ""),
  author: computed(() => post.value?.author?.name ?? ""),
  date: computed(() => articleDate.value),
  category: computed(() => post.value?.categories?.[0]?.name ?? ""),
  backgroundImage: computed(() =>
    post.value?.featuredImage
      ? mediaUrl(post.value.featuredImage.full_path)
      : undefined,
  ),
  siteName,
});

defineOgImage(
  "ArticleWhatsapp.takumi",
  {
    title: computed(() => post.value?.title ?? "Article"),
    description: computed(() => post.value?.shortDescription ?? ""),
    author: computed(() => post.value?.author?.name ?? ""),
    date: computed(() => articleDate.value),
    category: computed(() => post.value?.categories?.[0]?.name ?? ""),
    backgroundImage: computed(() =>
      post.value?.featuredImage
        ? mediaUrl(post.value.featuredImage.full_path)
        : undefined,
    ),
    siteName,
  },
  { key: "whatsapp", width: 800, height: 800 },
);
</script>

<template>
  <UContainer class="max-w-3xl py-12">
    <UBreadcrumb :items="breadcrumbItems" class="mb-8" />

    <!-- Loading skeleton -->
    <div v-if="status === 'pending'" class="space-y-4">
      <USkeleton class="h-10 w-2/3 rounded" />
      <USkeleton class="h-5 w-1/3 rounded" />
      <USkeleton class="h-64 rounded-lg" />
      <div class="space-y-3 mt-6">
        <USkeleton v-for="n in 8" :key="n" class="h-4 rounded" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error || !post" class="py-24 text-center">
      <UIcon name="i-lucide-file-x" class="size-12 text-muted mx-auto mb-4" />
      <h1 class="text-xl font-semibold text-highlighted mb-2">
        Article not found
      </h1>
      <p class="text-muted text-sm">
        The article you're looking for doesn't exist or has been removed.
      </p>
      <UButton
        class="mt-6"
        to="/blog"
        icon="i-lucide-arrow-left"
        label="Back to Blog"
      />
    </div>

    <!-- Article -->
    <article v-else>
      <!-- Categories -->
      <div v-if="post.categories?.length" class="flex flex-wrap gap-2 mb-4">
        <NuxtLink
          v-for="cat in post.categories"
          :key="cat.id"
          :to="`/blog?category=${cat.slug}`"
        >
          <UBadge
            variant="subtle"
            color="primary"
            size="sm"
            class="hover:opacity-80 transition-opacity"
          >
            <UIcon name="i-lucide-folder" class="size-3 mr-1" />
            {{ cat.name }}
          </UBadge>
        </NuxtLink>
      </div>

      <!-- Title -->
      <h1
        class="text-3xl sm:text-4xl font-display font-bold tracking-tight text-highlighted leading-tight mb-4"
      >
        {{ post.title }}
      </h1>

      <!-- Meta row -->
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted mb-6 pb-6 border-b border-default"
      >
        <span class="flex items-center gap-1.5">
          <UIcon name="i-lucide-user" class="size-4" />
          {{ post.author?.name }}
        </span>
        <time
          :datetime="new Date(post.createdAt).toISOString()"
          class="flex items-center gap-1.5"
        >
          <UIcon name="i-lucide-calendar" class="size-4" />
          {{
            new Date(post.createdAt).toLocaleDateString(locale, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          }}
        </time>
        <span
          v-if="post.updatedAt !== post.createdAt"
          class="flex items-center gap-1.5"
        >
          <UIcon name="i-lucide-pencil" class="size-4" />
          Updated
          {{
            new Date(post.updatedAt).toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }}
        </span>
      </div>

      <!-- Featured image -->
      <div
        v-if="post.featuredImage"
        class="rounded-lg overflow-hidden mb-8 aspect-video"
      >
        <img
          :src="post.featuredImage.full_path"
          :alt="post.title"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Short description (lead) -->
      <p
        v-if="post.shortDescription"
        class="text-lg text-muted leading-relaxed mb-8 font-medium border-l-2 border-primary pl-4"
      >
        {{ post.shortDescription }}
      </p>

      <!-- Content rendered from Markdown -->
      <div
        class="prose prose-sm sm:prose dark:prose-invert max-w-none"
        v-html="post.content"
      />

      <!-- Tags -->
      <div
        v-if="post.tags?.length"
        class="flex flex-wrap gap-2 mt-10 pt-6 border-t border-default"
      >
        <span class="text-sm text-muted self-center mr-1">Tags:</span>
        <NuxtLink
          v-for="tag in post.tags"
          :key="tag.id"
          :to="`/blog?tag=${tag.slug}`"
        >
          <UBadge
            variant="soft"
            color="neutral"
            size="sm"
            class="hover:opacity-80 transition-opacity"
          >
            #{{ tag.name }}
          </UBadge>
        </NuxtLink>
      </div>
    </article>
  </UContainer>
</template>
