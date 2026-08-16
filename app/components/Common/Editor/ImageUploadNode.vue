<script setup lang="ts">
import type { NodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "@tiptap/vue-3";

const props = defineProps<NodeViewProps>();

const toast = useToast();
const file = ref<File | null>(null);
const alt = ref("");
const loading = ref(false);

async function handleUpload() {
  if (!file.value) return;

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("file", file.value);
    formData.append("type", "image");
    formData.append("privacy", "public");
    formData.append("alt", alt.value);
    // Editor images are cropped to 16:9 by default so content blocks
    // have a consistent hero-like ratio.
    formData.append("aspectRatio", "16:9");

    const response = await $fetch<{ data: { filename: string } }>(
      "/api/media/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    const originalName = response.data?.filename;
    if (!originalName) {
      throw new Error("Upload failed: no filename returned");
    }

    // Files are served publicly via the /assets/[name] route
    const imageUrl = `/assets/${originalName}`;

    const pos = props.getPos();
    if (typeof pos !== "number") {
      loading.value = false;
      return;
    }

    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .setImage({ src: imageUrl, alt: alt.value })
      .run();
  } catch (err) {
    console.error("Image upload failed:", err);
    toast.add({
      title: "Error",
      description: "Image upload failed. Please try again.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function handleRemove() {
  const pos = props.getPos();
  if (typeof pos === "number") {
    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .run();
  }
}
</script>

<template>
  <NodeViewWrapper class="my-4">
    <div class="rounded-lg border border-default bg-elevated p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 font-medium text-sm">
          <UIcon name="i-lucide-image" class="size-4 text-primary" />
          <span>Upload Image</span>
        </div>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="handleRemove"
        />
      </div>

      <UFileUpload
        v-model="file"
        accept="image/*"
        label="Select image"
        description="PNG, JPG, WEBP, SVG or GIF"
        :preview="true"
        class="w-full"
      />

      <div v-if="file" class="space-y-4 pt-2">
        <UFormField
          label="Alt Text"
          help="Describe the image for accessibility"
        >
          <UInput
            v-model="alt"
            placeholder="e.g. A beautiful sunset over the beach"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            label="Upload Image"
            color="primary"
            :loading="loading"
            :disabled="!file"
            @click="handleUpload"
          />
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>
