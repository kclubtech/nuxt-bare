<script setup lang="ts">
import type { Form } from "@nuxt/ui";
import { z } from "zod";

interface OtherProps {
  categoryId: number | null;
  category: BlogCategory | null;
}

// `open` is a v-model prop from parent; specify name so model binding works
const open = defineModel<boolean>("open", { default: false });
const props = defineProps<OtherProps>();

// prefer mutateAsync so we can await completion and close modal only on success
const { mutateAsync: createCategory, isLoading: creating } =
  useCategoryCreateMutation();
const { mutateAsync: updateCategory, isLoading: updating } =
  useCategoryUpdateMutation();

const { transformToIssue } = useValidateHelper();
const toast = useToast();

const form: Ref<Form<any> | null> = ref(null);

const state = reactive({
  name: "",
  description: "",
  color: "",
});

const isLoading = computed(() => creating.value || updating.value);
const modalTitle = computed(() =>
  props.categoryId ? "Edit Category" : "New Category",
);
const modalDescription = computed(() =>
  props.categoryId
    ? "Update the category details below."
    : "Create a new category by filling in the details below.",
);

watchEffect(() => {
  if (open.value && props.category) {
    state.name = props.category.name || "";
    state.description = props.category.description || "";
    state.color = props.category.color || "";
  } else if (open.value && !props.category) {
    state.name = "";
    state.description = "";
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
      description: state.description || undefined,
      color: state.color || undefined,
    };

    if (props.categoryId) {
      await updateCategory({
        id: props.categoryId,
        data,
      });
    } else {
      await createCategory(data);
    }

    // only close when mutation succeeded
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
      description: error?.message || "Failed to save category",
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
              placeholder="Enter category name"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea
              v-model="state.description"
              placeholder="Enter category description"
              :rows="3"
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
            <UButton label="Save Category" :loading="isLoading" type="submit" />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
