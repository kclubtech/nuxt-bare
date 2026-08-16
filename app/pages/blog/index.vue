<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const { siteName, absoluteUrl, breadcrumbSchema, itemListSchema } = useSeo();

// Sync query params from URL → reactive state
const page = computed({
  get: () => Number(route.query.page) || 1,
  set: (v) =>
    router.push({ query: { ...route.query, page: v === 1 ? undefined : v } }),
});

const search = ref((route.query.search as string) || "");
const activeCategory = ref((route.query.category as string) || "");
const activeTag = ref((route.query.tag as string) || "");

watch(search, () => {
  router.push({
    query: {
      ...route.query,
      search: search.value || undefined,
      page: undefined,
    },
  });
});

const params = computed(() => ({
  page: page.value,
  limit: 9,
  search: search.value || undefined,
  category: activeCategory.value || undefined,
  tag: activeTag.value || undefined,
  lang: locale.value,
}));

const { data, status } = usePublicPostsQuery(params);

const posts = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta);
const total = computed(() => meta.value?.total ?? 0);
const totalPages = computed(() =>
  Math.ceil(total.value / (meta.value?.per_page ?? 9)),
);

function setCategory(slug: string) {
  activeCategory.value = activeCategory.value === slug ? "" : slug;
  activeTag.value = "";
  router.push({
    query: { category: activeCategory.value || undefined, page: undefined },
  });
}

function setTag(slug: string) {
  activeTag.value = activeTag.value === slug ? "" : slug;
  activeCategory.value = "";
  router.push({
    query: { tag: activeTag.value || undefined, page: undefined },
  });
}

function clearFilters() {
  activeCategory.value = "";
  activeTag.value = "";
  search.value = "";
  router.push({ query: {} });
}

const hasFilters = computed(
  () => !!activeCategory.value || !!activeTag.value || !!search.value,
);

const breadcrumbItems = computed(() => [
  { label: "Home", to: "/" },
  { label: "Blog" },
]);

// Canonical: /blog, keeping category/tag filters but dropping pagination params.
const canonicalUrl = computed(() => {
  const query: Record<string, string> = {};
  if (activeCategory.value) query.category = activeCategory.value;
  if (activeTag.value) query.tag = activeTag.value;
  const qs = new URLSearchParams(query).toString();
  return absoluteUrl(qs ? `/blog?${qs}` : "/blog");
});

const seoTitle = computed(() => {
  const parts = ["Blog"];
  if (activeCategory.value) parts.push(`Category: ${activeCategory.value}`);
  if (activeTag.value) parts.push(`Tag: ${activeTag.value}`);
  return parts.join(" — ");
});
const seoDescription =
  "Read all published articles. Browse by category, tag, or search for a topic.";

useHead(() => ({
  link: [{ key: "canonical", rel: "canonical", href: canonicalUrl.value }],
  script: [
    {
      key: "blog-list-jsonld",
      type: "application/ld+json",
      textContent: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonicalUrl.value}#webpage`,
            url: canonicalUrl.value,
            name: seoTitle.value,
            description: seoDescription,
            inLanguage: "en",
            isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          itemListSchema(
            posts.value.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })),
            { name: "Recent articles" },
          ),
        ],
      }),
    },
  ],
}));

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: "website",
  ogUrl: canonicalUrl,
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
});

defineOgImage(
  "GeneralPage.takumi",
  {
    title: seoTitle.value,
    description: seoDescription,
    siteName: siteName.value,
  },
  [{ key: "og" }, { key: "whatsapp", width: 800, height: 800 }],
);
</script>

<template>
  <UContainer class="py-12">
    <UBreadcrumb :items="breadcrumbItems" class="mb-8" />

    <!-- Page header -->
    <div class="mb-10 text-center">
      <h1
        class="text-4xl font-display font-bold tracking-tight text-highlighted mb-3"
      >
        Blog
      </h1>
      <p class="text-muted max-w-xl mx-auto">
        Articles, tutorials, and thoughts on the things we build.
      </p>
    </div>

    <!-- Search + filter bar -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search articles…"
        class="w-full sm:max-w-xs"
        :ui="{ base: 'w-full' }"
      />
      <div class="flex items-center gap-2 flex-wrap">
        <UBadge
          v-if="activeCategory"
          variant="subtle"
          color="primary"
          class="cursor-pointer flex items-center gap-1"
          @click="setCategory(activeCategory)"
        >
          <UIcon name="i-lucide-folder" class="size-3" />
          {{ activeCategory }}
          <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
        </UBadge>
        <UBadge
          v-if="activeTag"
          variant="subtle"
          color="secondary"
          class="cursor-pointer flex items-center gap-1"
          @click="setTag(activeTag)"
        >
          <UIcon name="i-lucide-tag" class="size-3" />
          {{ activeTag }}
          <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
        </UBadge>
        <UButton
          v-if="hasFilters"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-x-circle"
          label="Clear"
          @click="clearFilters"
        />
      </div>
      <div class="sm:ml-auto flex items-center text-sm text-muted">
        {{ total }} {{ total === 1 ? "article" : "articles" }}
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <USkeleton v-for="n in 9" :key="n" class="h-72 rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="posts.length === 0" class="py-20 text-center">
      <UIcon
        name="i-lucide-file-search"
        class="size-12 text-muted mx-auto mb-4"
      />
      <p class="text-lg font-medium text-highlighted">No articles found</p>
      <p class="text-muted text-sm mt-1">
        Try adjusting your search or filters.
      </p>
      <UButton
        class="mt-4"
        variant="ghost"
        color="primary"
        @click="clearFilters"
      >
        Clear filters
      </UButton>
    </div>

    <!-- Post grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="post in posts"
        :key="post.id"
        :to="`/blog/${post.slug}`"
        class="group flex flex-col"
      >
        <UCard
          class="flex flex-col h-full transition-shadow group-hover:shadow-md"
          :ui="{ body: 'flex flex-col flex-1 gap-3' }"
        >
          <!-- Featured image -->
          <div
            v-if="post.featuredImage"
            class="aspect-video overflow-hidden rounded-t-lg -mt-4 -mx-4 mb-0"
          >
            <img
              :src="
                post.featuredImage.thumbnail?.full_path ??
                post.featuredImage.full_path
              "
              :alt="post.title"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div
            v-else
            class="aspect-video rounded-t-lg -mt-4 -mx-4 mb-0 bg-elevated flex items-center justify-center"
          >
            <UIcon name="i-lucide-file-text" class="size-10 text-muted/40" />
          </div>

          <!-- Categories -->
          <div v-if="post.categories?.length" class="flex flex-wrap gap-1 pt-2">
            <UBadge
              v-for="cat in post.categories"
              :key="cat.id"
              variant="subtle"
              color="primary"
              size="xs"
              class="cursor-pointer"
              @click.prevent="setCategory(cat.slug)"
            >
              {{ cat.name }}
            </UBadge>
          </div>

          <!-- Title + excerpt -->
          <div class="flex-1">
            <h2
              class="font-display font-semibold text-highlighted leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2"
            >
              {{ post.title }}
            </h2>
            <p
              v-if="post.shortDescription"
              class="text-sm text-muted line-clamp-3"
            >
              {{ post.shortDescription }}
            </p>
          </div>

          <!-- Footer: tags + date -->
          <div
            class="flex items-center justify-between pt-2 border-t border-default"
          >
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="tag in post.tags?.slice(0, 2)"
                :key="tag.id"
                variant="soft"
                color="neutral"
                size="xs"
                class="cursor-pointer"
                @click.prevent="setTag(tag.slug)"
              >
                #{{ tag.name }}
              </UBadge>
              <span
                v-if="(post.tags?.length ?? 0) > 2"
                class="text-xs text-muted self-center"
              >
                +{{ post.tags.length - 2 }}
              </span>
            </div>
            <time class="text-xs text-muted flex-shrink-0">
              {{
                new Date(post.createdAt).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }}
            </time>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-10">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="meta?.per_page ?? 9"
      />
    </div>
  </UContainer>
</template>
