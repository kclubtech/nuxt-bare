<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ChangePasswordInput } from "~~/shared/utils/schema/auth";

const { changePassword } = useAuth();
const { transformToIssue } = useValidateHelper();

// changePasswordSchema auto-imported from shared/utils/schema/auth.ts
const passwordState = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

type Schema = ChangePasswordInput;

const passwordLoading = ref(false);
const passwordForm = ref<{ setErrors(errs: any[]): void } | null>(null);

async function onPasswordSubmit(event: FormSubmitEvent<any>) {
  try {
    passwordLoading.value = true;
    // Toast handled in useAuth's changePassword()
    await changePassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
    });
    passwordState.currentPassword = "";
    passwordState.newPassword = "";
    passwordState.confirmPassword = "";
  } catch (err: any) {
    if (passwordForm.value) {
      const errors = transformToIssue(err);
      if (errors.length) {
        passwordForm.value.setErrors(errors);
      }
    }
  } finally {
    passwordLoading.value = false;
  }
}
</script>

<template>
  <div>
    <h2 class="text-base font-display font-semibold text-highlighted mb-5">
      Change Password
    </h2>
    <UForm
      ref="passwordForm"
      :schema="changePasswordSchema"
      :state="passwordState"
      class="space-y-4"
      @submit="onPasswordSubmit"
    >
      <UFormField label="Current Password" name="currentPassword">
        <UInput
          v-model="passwordState.currentPassword"
          type="password"
          class="w-full"
        />
      </UFormField>

      <UFormField label="New Password" name="newPassword">
        <UInput
          v-model="passwordState.newPassword"
          type="password"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Confirm New Password" name="confirmPassword">
        <UInput
          v-model="passwordState.confirmPassword"
          type="password"
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-end">
        <UButton
          type="submit"
          label="Update Password"
          color="neutral"
          :loading="passwordLoading"
        />
      </div>
    </UForm>
  </div>
</template>
