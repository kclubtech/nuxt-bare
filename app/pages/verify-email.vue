<script setup lang="ts">
const route = useRoute();
const token = route.query.token as string;
const router = useRouter();
const toast = useToast();

const isLoading = ref(true);
const error = ref<string | null>(null);

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

async function verifyEmail() {
  if (!token) {
    error.value = "Missing verification token";
    isLoading.value = false;
    return;
  }

  try {
    await $fetch("/api/auth/verify-email", {
      method: "POST",
      body: { token },
    });
    toast.add({
      title: "Success",
      description: "Email verified successfully",
      color: "success",
    });
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err: any) {
    error.value = getErrorMessage(err, "Verification failed");
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  verifyEmail();
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
  >
    <UCard class="max-w-md w-full">
      <div v-if="isLoading" class="text-center py-8">
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin w-12 h-12 text-primary-500 mx-auto mb-4"
        />
        <h2 class="text-xl font-semibold">Verifying your email...</h2>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <UIcon
          name="i-lucide-x-circle"
          class="w-12 h-12 text-red-500 mx-auto mb-4"
        />
        <h2 class="text-xl font-semibold text-red-600 mb-2">
          Verification Failed
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error }}</p>
        <UButton to="/login" color="neutral" block>Back to Login</UButton>
      </div>

      <div v-else class="text-center py-8">
        <UIcon
          name="i-lucide-check-circle"
          class="w-12 h-12 text-green-500 mx-auto mb-4"
        />
        <h2 class="text-xl font-semibold text-green-600 mb-2">
          Email Verified!
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Redirecting you to login...
        </p>
        <UButton to="/login" color="primary" block>Go to Login</UButton>
      </div>
    </UCard>
  </div>
</template>
