<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Media } from "~/types/db";
import type { APIResponseSuccess } from "~/types/response";
import MediaManagementModal from "~/components/Common/MediaManagementModal.vue";
import UploadModal from "~/components/Admin/Media/UploadModal.vue";

const mediaId = defineModel<number | null>("mediaId");

const props = defineProps<{
  disabled?: boolean;
  label?: string;
  description?: string;
  allowPrivate?: boolean;
}>();

const showPicker = ref(false);
const uploadOpen = ref(false);
const activeTab = ref<"existing" | "upload">("existing");

// Fetching existing media list is handled by MediaLibraryModal via useMediaBrowser composable

const selectedMedia = ref<Media | null>(null);
const debounce = useDebounceFn(async (id: number) => {
  try {
    const response = await $fetch<APIResponseSuccess<Media>>(
      `/api/media/${id}`,
    );
    selectedMedia.value = response.data ?? null;
  } catch (error) {
    console.error("Failed to load media:", error);
    selectedMedia.value = null;
  }
}, 300);

watch(
  () => mediaId.value,
  async (id) => {
    if (!id) {
      selectedMedia.value = null;
      return;
    }
    try {
      debounce(id);
    } catch {
      selectedMedia.value = null;
    }
  },
  { immediate: true },
);

function openPicker() {
  showPicker.value = true;
  activeTab.value = "existing";
}

function closePicker() {
  showPicker.value = false;
  uploadOpen.value = false;
}

async function selectMedia(itemId: number) {
  mediaId.value = itemId;
}

function selectedMediaUpload(item: any) {
  mediaId.value = item.id;
  showPicker.value = false;
}

function clearSelection() {
  mediaId.value = null;
  selectedMedia.value = null;
}

function onUploadReload(response: any) {
  const item = response?.data;
  if (item?.id) {
    selectedMediaUpload(item);
  }
  uploadOpen.value = false;
}

const thumbnailUrl = computed(() => {
  return selectedMedia.value?.full_path;
});
</script>

<template>
  <div class="space-y-3">
    <div
      class="rounded border border-dashed border-gray-300 p-4 flex flex-col items-center gap-3"
    >
      <div
        class="w-full min-h-20 rounded overflow-hidden bg-gray-50 flex items-center justify-center"
      >
        <template v-if="thumbnailUrl">
          <img
            :src="thumbnailUrl"
            alt="Selected media"
            class="w-full min-h-40 max-h-96 h-full object-cover"
          />
        </template>
        <template v-else>
          <Placeholder />
        </template>
      </div>

      <div class="flex flex-wrap justify-end gap-2 w-full">
        <UButton
          size="md"
          :variant="selectedMedia ? 'outline' : 'solid'"
          label="Choose existing"
          :disabled="props.disabled"
          v-if="!selectedMedia"
          @click="openPicker"
        />
        <UButton
          size="md"
          variant="ghost"
          label="Upload new"
          v-if="!selectedMedia"
          @click="uploadOpen = true"
        />
        <UButton
          v-if="selectedMedia"
          size="md"
          variant="ghost"
          label="Clear"
          :disabled="props.disabled"
          @click="clearSelection"
        />
      </div>
    </div>

    <MediaManagementModal
      :open="showPicker"
      @select="selectMedia"
      @close="closePicker"
    />

    <UploadModal v-model:open="uploadOpen" @reload="onUploadReload" />
  </div>
</template>
