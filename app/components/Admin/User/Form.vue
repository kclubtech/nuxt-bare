<script setup lang="ts">
import type { Form } from "@nuxt/ui";
import type { FormSubmitEvent } from "@nuxt/ui";
import type {
  CreateUserInput,
  EditUserInput,
} from "~~/shared/utils/schema/user";
import type { UserRole } from "~/types/db";

interface Props {
  userId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  userId: null,
});

const { transformToIssue } = useFormErrors();
const toast = useToast();

// Use userId directly from props
const currentUserId = computed(() => props.userId);

const isEditMode = computed(() => !!currentUserId.value);

// Queries and mutations
const { data: userResp, isLoading: isFetching } = isEditMode.value
  ? useUserQuery(computed(() => currentUserId.value as string | number))
  : { data: ref(null), isLoading: ref(false) };

const { mutateAsync: createUser, isLoading: isCreating } =
  useUserCreateMutation();
const { mutateAsync: updateUser, isLoading: isUpdating } =
  useUserUpdateMutation();

const isLoading = computed(
  () => isFetching.value || isCreating.value || isUpdating.value,
);

const pending = computed(() => isCreating.value || isUpdating.value);

// createUserSchema / editUserSchema auto-imported from shared/utils/schema/user.ts
const schema = computed(() =>
  isEditMode.value ? editUserSchema : createUserSchema,
);

type Schema = CreateUserInput | EditUserInput;

const roles = ["admin", "user", "moderator"];

const form: Ref<Form<any> | null> = ref(null);

const state = reactive({
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "user" as UserRole,
});

const modalTitle = computed(() =>
  isEditMode.value ? "Edit User" : "Create User",
);

const submitButtonLabel = computed(() =>
  isEditMode.value ? "Update User" : "Create User",
);

// Populate form state once the query returns data
watchEffect(() => {
  if (isEditMode.value && userResp?.value?.data) {
    const u = userResp.value.data;
    state.email = u.email || "";
    state.firstName = u.profile?.firstName || "";
    state.lastName = u.profile?.lastName || "";
    state.role = (u.role as UserRole) || "user";
  } else if (!isEditMode.value) {
    state.email = "";
    state.password = "";
    state.firstName = "";
    state.lastName = "";
    state.role = "user" as const;
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const payload = {
      ...event.data,
      name: `${event.data.firstName} ${event.data.lastName}`.trim(),
    };

    if (isEditMode.value) {
      await updateUser({
        id: currentUserId.value!,
        payload,
      });
    } else {
      await createUser(payload);
    }

    // Toast is handled in mutation onSuccess
    navigateTo("/admin/users");
  } catch (err: any) {
    if (form.value) {
      const errors = transformToIssue(err);
      if (errors.length) {
        form.value.setErrors(errors);
      }
    }

    toast.add({
      title: "Error",
      description: err?.message || "Failed to save user",
      color: "error",
    });
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ modalTitle }}</h1>
      <UButton
        to="/admin/users"
        variant="ghost"
        icon="i-lucide-arrow-left"
        label="Back to List"
      />
    </div>

    <template v-if="isEditMode && isFetching">
      <UCard>
        <div class="flex items-center justify-center py-8">
          <UButton
            disabled
            icon="i-lucide-loader-circle"
            variant="ghost"
            label="Loading user data..."
          />
        </div>
      </UCard>
    </template>

    <UTabs
      v-else-if="isEditMode"
      :items="[
        { label: 'User Info', icon: 'i-lucide-user', slot: 'info' },
        { label: 'Permissions', icon: 'i-lucide-shield', slot: 'permissions' },
      ]"
      class="w-full"
    >
      <template #info>
        <UCard class="mt-4">
          <UForm
            ref="form"
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField label="Email" name="email">
              <UInput
                v-model="state.email"
                type="email"
                :disabled="isEditMode"
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name" name="firstName">
                <UInput v-model="state.firstName" class="w-full" />
              </UFormField>
              <UFormField label="Last Name" name="lastName">
                <UInput v-model="state.lastName" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Role" name="role">
              <USelect v-model="state.role" :items="roles" class="w-full" />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                :label="submitButtonLabel"
                :loading="pending"
              />
            </div>
          </UForm>
        </UCard>
      </template>

      <template #permissions>
        <div class="mt-4">
          <AdminUserPermissions :user-id="currentUserId!" />
        </div>
      </template>
    </UTabs>

    <!-- Create mode: no tabs needed -->
    <UCard v-else>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="Minimum 8 characters"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="First Name" name="firstName">
            <UInput v-model="state.firstName" class="w-full" />
          </UFormField>
          <UFormField label="Last Name" name="lastName">
            <UInput v-model="state.lastName" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Role" name="role">
          <USelect v-model="state.role" :items="roles" class="w-full" />
        </UFormField>

        <div class="flex justify-end">
          <UButton
            type="submit"
            :label="submitButtonLabel"
            :loading="pending"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
