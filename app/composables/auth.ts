export const useAuth = () => {
  const loading = ref(false);
  const toast = useToast();
  const { fetch: refreshSession } = useUserSession();
  const router = useRouter();

  const login = async (payload: any) => {
    try {
      loading.value = true;
      await $fetch("/api/auth/login", {
        method: "POST",
        body: payload,
      });
      await refreshSession();
      toast.add({
        title: "Success",
        description: "Logged in successfully",
        color: "success",
      });
      router.push("/");
    } catch (err: any) {
      const msg = err.data?.message || "Login failed";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const requestPasswordReset = async (payload: any) => {
    try {
      loading.value = true;
      await $fetch("/api/auth/request-password-reset", {
        method: "POST",
        body: payload,
      });
      toast.add({
        title: "Email Sent",
        description: "Check your inbox for instructions",
        color: "success",
      });
      return true;
    } catch (err: any) {
      const msg = err.data?.message || "Failed to send reset email";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (payload: any) => {
    try {
      loading.value = true;
      await $fetch("/api/auth/reset-password", {
        method: "POST",
        body: payload,
      });
      toast.add({
        title: "Success",
        description: "Password reset successfully",
        color: "success",
      });
      router.push("/login");
    } catch (err: any) {
      const msg = err.data?.message || "Failed to reset password";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async (payload: any) => {
    try {
      loading.value = true;
      await $fetch("/api/user/profile", {
        method: "PATCH",
        body: payload,
      });
      await refreshSession();
      toast.add({
        title: "Success",
        description: "Profile updated",
        color: "success",
      });
    } catch (err: any) {
      const msg = err.data?.message || "Failed to update profile";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const changePassword = async (payload: any) => {
    try {
      loading.value = true;
      await $fetch("/api/user/password", {
        method: "PUT",
        body: payload,
      });
      toast.add({
        title: "Success",
        description: "Password changed",
        color: "success",
      });
    } catch (err: any) {
      const msg = err.data?.message || "Failed to change password";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    login,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
  };
};
