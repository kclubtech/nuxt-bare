<script setup lang="ts">
import type { Form } from "@nuxt/ui";

interface OtherProps {
  tagId: number | null;
  tag: BlogTag | null;
}

// bind `open` prop properly so parent v-model updates work
const open = defineModel<boolean>("open", { default: false });
const props = defineProps<OtherProps>();

// use async mutations to await completion for closing modal
const { mutateAsync: createTag, isLoading: creating } = useTagCreateMutation();
const { mutateAsync: updateTag, isLoading: updating } = useTagUpdateMutation();

const { transformToIssue } = useValidateHelper();
const toast = useToast();

const form: Ref<Form<any> | null> = ref(null);

const state = reactive({
  name: "",
  color: "",
});

const isLoading = computed(() => creating.value || updating.value);
const modalTitle = computed(() => (props.tagId ? "Edit Tag" : "New Tag"));
const modalDescription = computed(() =>
  props.tagId
    ? "Update the tag details below."
    : "Create a new tag by filling in the details below.",
);

watchEffect(() => {
  if (open.value && props.tag) {
    state.name = props.tag.name || "";
    state.color = props.tag.color || "";
  } else if (open.value && !props.tag) {
    state.name = "";
    state.color = "";
  }
});

async function onSubmit() {
  // clear previous validation errors if the form API is available
  if (form.value && typeof form.value.clear === "function") {
    form.value.clear();
  }

  try {
    const data = {
      name: state.name,
      color: state.color || undefined,
    };

    if (props.tagId) {
      await updateTag({
        id: props.tagId,
        data,
      });
    } else {
      await createTag(data);
    }

    open.value = false;
  } catch (error: any) {
    if (form.value) {
      const errors = transformToIssue(error);
      if (errors.length) {
        form.value.setErrors(errors);
      }
    }

    toast.add({
      title: "Error",
      description: error?.message || "Failed to save tag",
      color: "error",
    });
  }
}

function close() {
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    @close="close"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <CommonLanguageContentViewer />
        <UForm
          ref="form"
          :state="state"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UFormField label="Name" name="name" required>
            <UInput
              v-model="state.name"
              placeholder="Enter tag name"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Color" name="color">
            <div class="flex gap-2">
              <UInput
                v-model="state.color"
                type="color"
                placeholder="#000000"
                class="w-16"
              />
              <UInput
                v-model="state.color"
                placeholder="e.g., #FF5733"
                class="flex-1"
              />
            </div>
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancel"
              @click="close"
            />
            <UButton label="Save Tag" :loading="isLoading" type="submit" />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
