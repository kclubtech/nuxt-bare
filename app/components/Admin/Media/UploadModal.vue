<script setup lang="ts">
import type { Form, FormSubmitEvent } from "@nuxt/ui";

const props = defineProps({
  open: { type: Boolean, required: true },
});

const emit = defineEmits<{
  (e: "reload", response: { message: string; data: any }): void;
}>();

const open = defineModel<boolean>("open", {
  default: false,
});

const { transformToIssue } = useValidateHelper();
const toast = useToast();

interface Schema {
  file: File | null;
  alt: string;
  description: string;
  folderName: string;
  aspectRatio: "" | "16:9" | "9:16";
}

const form = ref<Form<Schema>>();

const state = ref<Schema>({
  file: null,
  alt: "",
  description: "",
  folderName: "",
  aspectRatio: "",
});

// Aspect ratio picker is only relevant for images
const isImageFile = computed(
  () => state.value.file?.type?.startsWith("image/") ?? false,
);

const aspectRatioItems = [
  {
    label: "Original",
    value: "" as const,
    icon: "i-lucide-maximize-2",
  },
  {
    label: "16:9",
    value: "16:9" as const,
    icon: "i-lucide-monitor",
  },
  {
    label: "9:16",
    value: "9:16" as const,
    icon: "i-lucide-smartphone",
  },
];

const { data: folderResponse, isLoading: foldersLoading } =
  useMediaFoldersQuery();

const createdFolderItems = ref<string[]>([]);

const availableFolders = computed(() => {
  const existingFolders = (folderResponse.value?.data ?? []).map(
    (folder) => folder.name,
  );

  return [...existingFolders, ...createdFolderItems.value].filter(
    (folder, index, folders) => folders.indexOf(folder) === index,
  );
});

const folderItems = computed(() =>
  availableFolders.value.map((folder) => ({
    label: folder,
    value: folder,
    description: "Existing folder",
  })),
);

const uploadMutation = useMediaUploadMutation();
const loading = computed(() => uploadMutation.isLoading.value);

async function submit(event: FormSubmitEvent<Schema>) {
  // clear previous validation errors if the form API is available

  form.value?.clear();

  if (!event.data.file) {
    toast.add({
      title: "Error",
      description: "Please select a file to upload.",
      color: "error",
    });
    return;
  }

  const fileType = event.data.file.type || "";
  const mediaType = fileType.startsWith("image/") ? "image" : "document";

  // Client-side size validation using centralized config (backend also validates)
  const config =
    mediaType === "image"
      ? MEDIA_CONFIG.UPLOAD.IMAGE
      : MEDIA_CONFIG.UPLOAD.DOCUMENT;
  const maxSize = config.maxSize;

  if (event.data.file.size > maxSize) {
    toast.add({
      title: "File too large",
      description:
        mediaType === "image"
          ? `Images must be ${maxSize / (1024 * 1024)}MB or less.`
          : `Documents must be ${maxSize / (1024 * 1024)}MB or less.`,
      color: "error",
    });
    return;
  }

  const payload = {
    file: event.data.file,
    type: mediaType,
    privacy: "public",
    description: event.data.description,
    alt: event.data.alt,
    folderName: event.data.folderName,
    aspectRatio: event.data.aspectRatio || undefined,
  } as const;

  try {
    const response = await uploadMutation.mutateAsync(payload);
    emit("reload", response);
    reset();
    open.value = false;
  } catch (err: any) {
    if (form.value) {
      const errors = transformToIssue(err);
      if (errors.length) {
        form.value.setErrors(errors);
      }
    }

    toast.add({
      title: "Error",
      description: err?.message || "Failed to upload media",
      color: "error",
    });
  }
}

function reset() {
  state.value.file = null;
  state.value.alt = "";
  state.value.description = "";
  state.value.folderName = "";
  state.value.aspectRatio = "";
}

function close() {
  reset();
  open.value = false;
}

function onCreateFolder(item: string) {
  const folderName = item.trim();
  if (!folderName) {
    return;
  }

  if (!availableFolders.value.includes(folderName)) {
    createdFolderItems.value.push(folderName);
  }

  state.value.folderName = folderName;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Upload media"
    description="Upload an image (max 2MB) or document (max 50MB)"
    icon="i-lucide-upload"
  >
    <template #body>
      <UForm ref="form" :state="state" class="space-y-4" @submit="submit">
        <UFileUpload
          layout="list"
          v-model="state.file"
          label="Drop your file here"
          description="Images (max 2MB) or documents (PDF/Word/Excel, max 50MB)"
        />

        <UFormField
          v-if="isImageFile"
          label="Aspect ratio"
          name="aspectRatio"
          description="Crop the image to this ratio. Choose Original to keep it untouched."
        >
          <URadioGroup
            v-model="state.aspectRatio"
            :items="aspectRatioItems"
            orientation="horizontal"
            size="sm"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Alt text" name="alt">
          <UInput
            v-model="state.alt"
            placeholder="Optional alt text"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea
            v-model="state.description"
            :rows="3"
            placeholder="Optional description"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Folder"
          name="folderName"
          description="Optional. Type a new folder name or pick one that already exists."
        >
          <UInputMenu
            v-model="state.folderName"
            :items="folderItems"
            :loading="foldersLoading"
            placeholder="Campaign Assets / Product Photos / Team Docs"
            class="w-full"
            icon="i-lucide-folder-plus"
            value-key="value"
            label-key="label"
            description-key="description"
            searchable
            clear
            create-item="always"
            @create="onCreateFolder"
          >
            <template #create-item-label="{ item }">
              Create new folder: {{ item }}
            </template>
            <template #empty>
              <span class="text-sm text-muted">
                No matching folder. Create a new one from your input.
              </span>
            </template>
          </UInputMenu>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="close"
          />
          <UButton
            :loading="loading"
            label="Upload"
            color="primary"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
