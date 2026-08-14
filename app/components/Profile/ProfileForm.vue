<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { UpdateProfileInput } from "~~/shared/utils/schema/auth";

const { updateProfile, loading: authLoading } = useAuth();
const { transformToIssue } = useValidateHelper();
const { user } = useUserSession();

// updateProfileSchema auto-imported from shared/utils/schema/auth.ts
const state = reactive({
  firstName: "",
  lastName: "",
  bio: "",
});

type Schema = UpdateProfileInput;
const form = ref<any>(null);

// Fetch current profile data
const { data: userData, refresh } = await useFetch("/api/user/profile");

watchEffect(() => {
  if (userData.value?.data?.profile) {
    state.firstName = userData.value.data.profile.firstName || "";
    state.lastName = userData.value.data.profile.lastName || "";
    state.bio = userData.value.data.profile.bio || "";
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Toast handled in useAuth's updateProfile()
    await updateProfile(event.data);
    await refresh();
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
  <div>
    <h2 class="text-base font-display font-semibold text-highlighted mb-5">
      Profile Information
    </h2>
    <UForm
      ref="form"
      :schema="updateProfileSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="First Name" name="firstName">
          <UInput v-model="state.firstName" class="w-full" />
        </UFormField>
        <UFormField label="Last Name" name="lastName">
          <UInput v-model="state.lastName" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Email (Cannot be changed)" name="email">
        <UInput :model-value="user?.email" disabled class="w-full" />
      </UFormField>

      <UFormField label="Bio" name="bio">
        <UTextarea v-model="state.bio" class="w-full" />
      </UFormField>

      <div class="flex justify-end">
        <UButton type="submit" label="Save Changes" :loading="authLoading" />
      </div>
    </UForm>
  </div>
</template>
