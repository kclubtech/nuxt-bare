import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import type { BlogTag } from "@/types/blog";

export interface CreateTagInput {
  name: Record<string, string> | string;
  slug?: Record<string, string> | string;
  color?: string;
}

export function useTagsQuery() {
  return useQuery({
    key: ["admin", "tags"],
    query: async () => {
      const response = await $fetch<{
        data: BlogTag[];
        statusMessage: string;
      }>("/api/admin/tags");
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTagCreateMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (data: CreateTagInput) => {
      return $fetch<BlogTag>("/api/admin/tags", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "tags"],
      });
      toast.add({
        title: "Success",
        description: "Tag created successfully",
      });
    },
    // Errors are handled by the component calling mutateAsync()
  });
}

export function useTagUpdateMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateTagInput>;
    }) => {
      return $fetch<BlogTag>(`/api/admin/tags/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "tags"],
      });
      toast.add({
        title: "Success",
        description: "Tag updated successfully",
      });
    },
    // Errors are handled by the component calling mutateAsync()
  });
}

export function useTagDeleteMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (id: number) => {
      return $fetch<{ success: boolean; id: number }>(`/api/admin/tags/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "tags"],
      });
      toast.add({
        title: "Success",
        description: "Tag deleted successfully",
      });
    },
    onError: () => {
      toast.add({
        title: "Error",
        description: "Failed to delete tag",
        color: "error",
      });
    },
  });
}
