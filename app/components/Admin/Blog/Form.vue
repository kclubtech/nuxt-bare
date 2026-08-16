<script setup lang="ts">
interface Props {
  post?: BlogFormData | null;
}

const props = defineProps<Props>();

// Form state, validation, and submission live in the useBlogForm composable
const {
  form,
  formRef,
  categoryOptions,
  tagOptions,
  statusOptions,
  isLoading,
  onSubmit,
} = useBlogForm(
  computed(() => props.post),
  {
    onSuccess: () => {
      navigateTo("/admin/blog");
    },
  },
);
</script>

<template>
  <div class="space-y-6">
    <!-- Language Alert -->
    <CommonLanguageContentViewer />

    <!-- Form -->
    <UForm ref="formRef" :state="form" @submit="onSubmit" class="space-y-4">
      <!-- Slug -->
      <UFormField label="Slug (URL-friendly)" name="slug" required>
        <UInput
          v-model="form.slug"
          placeholder="my-awesome-post"
          icon="i-lucide-link"
          :disabled="isLoading"
          class="w-full"
        />
        <template #hint>
          This will be used in the URL. Use lowercase letters, numbers, and
          hyphens.
        </template>
      </UFormField>

      <!-- Title -->
      <UFormField label="Title" name="title" required>
        <UInput
          v-model="form.title"
          placeholder="Blog title"
          :disabled="isLoading"
          class="w-full"
        />
      </UFormField>

      <!-- Short Description -->
      <UFormField label="Short Description," name="shortDescription">
        <UTextarea
          v-model="form.shortDescription"
          placeholder="Brief summary or excerpt for previews"
          :rows="3"
          :disabled="isLoading"
          class="w-full"
        />
        <template #description>
          This is a brief summary that will appear in blog listings and previews
          also for SEO meta description. Keep it concise and engaging.
        </template>
      </UFormField>

      <!-- Content Editor -->
      <UFormField label="Content" name="content" required>
        <CommonContentEditor
          v-model="form.content"
          placeholder="Write your post content here..."
        />
      </UFormField>

      <!-- Featured Image -->
      <UFormField label="Featured Image" name="featuredImageId">
        <CommonMediaPicker v-model:media-id="form.featuredImageId" />
      </UFormField>

      <!-- Categories -->
      <UFormField label="Categories" name="categories">
        <USelectMenu
          v-model="form.categoryIds"
          :items="categoryOptions"
          multiple
          placeholder="Select categories..."
          :disabled="isLoading"
          searchable
          label-key="label"
          value-key="id"
          class="w-full"
          clear
        />
        <template #description>
          Assign zero or more categories to organize this post.
        </template>
      </UFormField>

      <!-- Tags -->
      <UFormField label="Tags" name="tags">
        <USelectMenu
          v-model="form.tagIds"
          :items="tagOptions"
          multiple
          placeholder="Select tags..."
          :disabled="isLoading"
          searchable
          label-key="label"
          value-key="id"
          class="w-full"
          clear
        />
        <template #description>
          Assign zero or more tags to help readers find related content.
        </template>
      </UFormField>

      <!-- Status -->
      <UFormField label="Status" name="status">
        <USelectMenu
          v-model="form.status"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          :disabled="isLoading"
          class="w-full"
        />
      </UFormField>

      <!-- Submit Button -->
      <div
        class="flex justify-end gap-2 pt-6 border-t border-gray-200 dark:border-gray-700"
      >
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          label="Cancel"
          :to="`/admin/blog`"
        />
        <UButton
          type="submit"
          :label="`${props.post?.id ? 'Update' : 'Create'} Post`"
          :loading="isLoading"
        />
      </div>
    </UForm>
  </div>
</template>
