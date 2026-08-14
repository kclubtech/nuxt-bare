<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";
import type { LoginInput } from "~~/shared/utils/schema/auth";

const { login, loading } = useAuth();
const { transformToIssue } = useValidateHelper();

// loginSchema auto-imported from shared/utils/schema/auth.ts
type Schema = LoginInput;

const authForm = useTemplateRef("authForm");

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "text", // use text to avoid browser email validation quirks
    label: "Email Address",
    placeholder: "name@example.com",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    placeholder: "Enter your password",
    required: true,
  },
  {
    name: "remember",
    type: "checkbox",
    label: "Remember me",
  },
];

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Toast + navigation are handled in useAuth's login()
    await login(event.data);
  } catch (err: any) {
    if (authForm.value?.formRef) {
      const errors = transformToIssue(err);
      if (errors && errors.length) {
        authForm.value.formRef.setErrors(errors);
      }
    }
  }
}
</script>

<template>
  <UAuthForm
    ref="authForm"
    title="Login"
    description="Welcome back"
    icon="i-lucide-lock"
    :schema="loginSchema"
    :fields="fields"
    :loading="loading"
    :submit="{ label: 'Login', block: true }"
    @submit="onSubmit"
  >
    <!-- password hint slot shows forgot link under inputs -->
    <template #password-hint>
      <NuxtLink
        to="/forgot-password"
        class="text-sm font-medium text-primary hover:underline"
      >
        Forgot password?
      </NuxtLink>
    </template>
  </UAuthForm>
</template>
