<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Form } from "@nuxt/ui";
import type { Ref } from "vue";
import type { ChangePasswordInput } from "~~/shared/utils/schema/auth";

const { changePassword, loading } = useAuth();
const { transformToIssue } = useValidateHelper();

// changePasswordSchema auto-imported from shared/utils/schema/auth.ts
type Schema = ChangePasswordInput;

type UFormInstance = Form<any>;
const form: Ref<UFormInstance | null> = ref(null);

const state = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // clear previous validation errors if the form API is available
  if (form.value && typeof form.value.clear === "function") {
    form.value.clear();
  }

  try {
    // Toast handled in useAuth's changePassword()
    await changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
    });
    state.currentPassword = "";
    state.newPassword = "";
    state.confirmPassword = "";
  } catch (err: any) {
    if (form.value) {
      const errors = transformToIssue(err);
      if (errors.length) {
        form.value.setErrors(errors);
      }
    }
  }
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Change Password</h1>
      <UButton to="/profile" variant="ghost" icon="i-lucide-arrow-left"
        >Back to Profile</UButton
      >
    </div>

    <UCard>
      <UForm
        ref="form"
        :schema="changePasswordSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Current Password" name="currentPassword">
          <UInput
            v-model="state.currentPassword"
            type="password"
            class="w-full"
          />
        </UFormField>

        <UFormField label="New Password" name="newPassword">
          <UInput v-model="state.newPassword" type="password" class="w-full" />
        </UFormField>

        <UFormField label="Confirm New Password" name="confirmPassword">
          <UInput
            v-model="state.confirmPassword"
            type="password"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            type="submit"
            label="Update Password"
            color="neutral"
            :loading="loading"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
