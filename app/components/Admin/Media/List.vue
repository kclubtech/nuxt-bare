<script setup lang="ts">
const { page, type, folderName, params } = useUrlListState({
  filters: ["type", "folderName"],
  params: ({ page, type, folderName }) => ({
    page: page.value,
    limit: 10,
    type: type.value || undefined,
    privacy: "public",
    folderName: folderName.value || undefined,
  }),
});
const { data: mediaResponse, isLoading: pending } =
  useMediaManagementQuery(params);

const media = computed(() => mediaResponse.value?.data || []);
const pagination = computed(() => mediaResponse.value?.meta);

const deleteMutation = useMediaDeleteMutation();

// Use centralized modal state management
const {
  uploadOpen,
  deleteConfirmOpen,
  deleteId,
  openDeleteModal,
  closeDeleteModal,
  openUploadModal,
} = useMediaModal();

function openMedia(url: string) {
  if (!url) return;

  // Ensure we open an absolute URL (the backend stores paths like `/assets/…`).
  const fullUrl = new URL(url, window.location.origin).toString();
  window.open(fullUrl, "_blank");
}

function handleUploadReload(response: { message: string; data: any }) {
  // The upload modal emits this after a successful upload.
  // The query cache is invalidated by the upload mutation itself, so no
  // additional action is required here, but the parent can respond if needed.
  console.debug("Media uploaded:", response);
}

function confirmDelete() {
  if (!deleteId.value) return;
  deleteMutation.mutate(deleteId.value);
  closeDeleteModal();
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Media Library</h2>
        <p class="text-gray-500 dark:text-gray-400">
          Upload and manage your media assets.
        </p>
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Upload Media"
        @click="openUploadModal"
      />
    </div>

    <AdminMediaFilterBar
      v-model:page="page"
      v-model:type="type"
      v-model:folder-name="folderName"
    />

    <AdminMediaTable
      :media="media"
      :loading="pending"
      @view="openMedia"
      @delete="openDeleteModal"
    />

    <UPagination
      v-model:page="page"
      :total="pagination?.total || 0"
      :items-per-page="pagination?.per_page || 10"
      class="self-end"
    />

    <AdminMediaUploadModal
      v-model:open="uploadOpen"
      @reload="handleUploadReload"
    />

    <AdminMediaDeleteConfirmModal
      v-model:open="deleteConfirmOpen"
      @confirm="confirmDelete"
    />
  </div>
</template>
