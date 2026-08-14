<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";
import type { ForgotPasswordInput } from "~~/shared/utils/schema/auth";

const { requestPasswordReset, loading } = useAuth();

// forgotPasswordSchema auto-imported from shared/utils/schema/auth.ts
type Schema = ForgotPasswordInput;

const success = ref(false);

const fields = computed<AuthFormField[]>(() =>
  success.value
    ? []
    : [
        {
          name: "email",
          type: "text", // use text to allow trimming and avoid built-in validation
          label: "Email",
          placeholder: "you@example.com",
          icon: "i-lucide-mail",
          required: true,
        },
      ],
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Toast handled in useAuth's requestPasswordReset()
    await requestPasswordReset(event.data);
    success.value = true;
  } catch (err: any) {
    // Handled in composable
  }
}
</script>

<template>
  <UAuthForm
    title="Forgot Password"
    description="No worries, it happens."
    icon="i-lucide-circle-help"
    :schema="forgotPasswordSchema"
    :fields="fields"
    :loading="loading"
    :submit="{ label: 'Send Reset Link', block: true }"
    @submit="onSubmit"
  >
    <template #validation>
      <div v-if="success" class="text-center space-y-4 mb-4">
        <p class="text-green-600 font-medium">Reset link sent to your email!</p>
        <UButton
          to="/login"
          label="Return to Login"
          block
          variant="outline"
          color="neutral"
        />
      </div>
    </template>

    <template #footer>
      <NuxtLink
        to="/login"
        class="text-sm font-medium text-primary hover:underline"
      >
        Back to Login
      </NuxtLink>
    </template>
  </UAuthForm>
</template>
