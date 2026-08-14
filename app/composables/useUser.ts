import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import type { UserWithProfile } from "@/types/db";
import type { ResponsePagination, APIResponseSuccess } from "@/types/response";
import type { UserListParams } from "@/types/user";
import type { PermissionEntry } from "~~/shared/types/permission";

export const useUsersQuery = (params: Ref<UserListParams>) => {
  return useQuery({
    key: () => ["users", params.value],
    query: () => {
      const p = params.value;
      return $fetch<ResponsePagination<UserWithProfile>>("/api/admin/users", {
        query: {
          page: p.page,
          limit: p.limit,
          search: p.search,
          role: p.role,
        },
      });
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserQuery = (id: Ref<number | string>) => {
  return useQuery({
    key: () => ["users", id.value],
    query: () =>
      $fetch<APIResponseSuccess<UserWithProfile>>(
        `/api/admin/users/${id.value}`,
      ),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserCreateMutation = () => {
  const queryCache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: (payload: Record<string, any>) =>
      $fetch("/api/admin/users", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ["users"] });
      toast.add({
        title: "Success",
        description: "User created successfully",
        color: "success",
      });
    },
    onError: (err: any) => {
      const msg = err.data?.message || "Failed to create user";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    },
  });
};

export const useUserUpdateMutation = () => {
  const queryCache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: ({ id, payload }: { id: number | string; payload: any }) =>
      $fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: (data, { id }) => {
      queryCache.invalidateQueries({ key: ["users"] });
      // also invalidate the specific user
      queryCache.invalidateQueries({ key: ["users", id] });
      toast.add({
        title: "Success",
        description: "User updated successfully",
        color: "success",
      });
    },
    onError: (err: any) => {
      const msg = err.data?.message || "Failed to update user";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    },
  });
};

export const useUserDeleteMutation = () => {
  const queryCache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: (id: number | string) =>
      $fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ["users"] });
      toast.add({
        title: "Success",
        description: "User deleted successfully",
        color: "success",
      });
    },
    onError: (err: any) => {
      const msg = err.data?.message || "Failed to delete user";
      toast.add({ title: "Error", description: msg, color: "error" });
    },
  });
};

export const useAvailablePermissionsQuery = () => {
  return useQuery({
    key: () => ["permissions", "available"],
    query: () => $fetch<{ data: PermissionEntry[] }>("/api/admin/permissions"),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserPermissionsQuery = (id: Ref<number | string | null>) => {
  return useQuery({
    key: () => ["users", id.value, "permissions"],
    query: () =>
      $fetch<{ data: PermissionEntry[] }>(
        `/api/admin/users/${id.value}/permissions`,
      ),
    enabled: computed(() => !!id.value),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserPermissionsMutation = () => {
  const queryCache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: ({
      id,
      permissions,
    }: {
      id: number | string;
      permissions: PermissionEntry[];
    }) =>
      $fetch(`/api/admin/users/${id}/permissions`, {
        method: "POST",
        body: permissions,
      }),
    onSuccess: (_, { id }) => {
      queryCache.invalidateQueries({ key: ["users", id, "permissions"] });
      toast.add({
        title: "Success",
        description: "Permissions updated successfully",
        color: "success",
      });
    },
    onError: (err: any) => {
      const msg = err.data?.message || "Failed to update permissions";
      toast.add({ title: "Error", description: msg, color: "error" });
      throw err;
    },
  });
};
