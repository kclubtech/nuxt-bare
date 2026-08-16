<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
});

const route = useRoute();
const postId = computed(() => parseInt(route.params.id as string));

const { locale } = useI18n();
const {
  data: post,
  error: fetchError,
  isPending: pending,
} = usePostQuery(postId);

// The admin API returns translation records ({ en, id, ... }); extract the
// current locale (falling back to en) into the plain form data the form expects.
const formPost = computed<BlogFormData | undefined>(() => {
  if (!post.value) {
    return undefined;
  }
  const p = post.value;
  const pick = (translations: Record<string, string> | null | undefined) =>
    translations?.[locale.value] || translations?.en || "";

  return {
    id: p.id,
    slug: pick(p.slug),
    title: pick(p.title),
    shortDescription: pick(p.shortDescription),
    content: pick(p.content),
    status: p.status,
    categoryIds: (p.categories || []).map((c) => c.id),
    tagIds: (p.tags || []).map((t) => t.id),
    featuredImageId: p.featuredImage?.id ?? p.featuredImageId ?? null,
  };
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/admin/blog"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <UIcon name="i-lucide-arrow-left" />
          </NuxtLink>
          <h1 class="text-3xl font-bold">Edit Post</h1>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Update your blog post content
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-12">
      <UCard class="w-full max-w-4xl">
        <div class="flex items-center justify-center py-12">
          <UIcon name="i-lucide-loader" class="animate-spin text-2xl" />
        </div>
      </UCard>
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError">
      <UCard class="max-w-4xl border-red-200 dark:border-red-900">
        <div class="text-red-600 dark:text-red-400">
          <p class="font-medium">Failed to load post</p>
          <p class="text-sm mt-1">{{ fetchError.message }}</p>
        </div>
      </UCard>
    </div>

    <!-- Form Card -->
    <div v-else>
      <UCard class="max-w-4xl">
        <!-- Pass formPost to component - composable handles update internally -->
        <AdminBlogForm :post="formPost" />
      </UCard>
    </div>
  </div>
</template>
