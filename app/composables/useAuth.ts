import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from "~~/shared/utils/schema/auth";

export const useAuth = () => {
  const loading = ref(false);
  const toast = useToast();
  const { fetch: refreshSession } = useUserSession();
  const router = useRouter();

  const login = async (payload: LoginInput) => {
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
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Login failed"),
        color: "error",
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const requestPasswordReset = async (payload: ForgotPasswordInput) => {
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
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to send reset email"),
        color: "error",
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetPassword = async (
    payload: Pick<ResetPasswordInput, "password"> & { token: string },
  ) => {
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
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to reset password"),
        color: "error",
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async (payload: UpdateProfileInput) => {
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
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to update profile"),
        color: "error",
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const changePassword = async (
    payload: Pick<ChangePasswordInput, "currentPassword" | "newPassword">,
  ) => {
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
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to change password"),
        color: "error",
      });
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
