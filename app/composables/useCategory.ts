import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import type { BlogCategory } from "@/types/blog";

export interface CreateCategoryInput {
  name: Record<string, string> | string;
  slug?: Record<string, string> | string;
  description?: Record<string, string> | string;
  color?: string;
}

export function useCategoriesQuery() {
  return useQuery({
    key: ["admin", "categories"],
    query: async () => {
      const response = await $fetch<{
        data: BlogCategory[];
        statusMessage: string;
      }>("/api/admin/categories");
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryCreateMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (data: CreateCategoryInput) => {
      return $fetch<BlogCategory>("/api/admin/categories", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "categories"],
      });
      toast.add({
        title: "Success",
        description: "Category created successfully",
      });
    },
    // Errors are handled by the component calling mutateAsync()
  });
}

export function useCategoryUpdateMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateCategoryInput>;
    }) => {
      return $fetch<BlogCategory>(`/api/admin/categories/${id}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "categories"],
      });
      toast.add({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    // Errors are handled by the component calling mutateAsync()
  });
}

export function useCategoryDeleteMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (id: number) => {
      return $fetch<{ success: boolean; id: number }>(
        `/api/admin/categories/${id}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: async () => {
      await cache.invalidateQueries({
        key: ["admin", "categories"],
      });
      toast.add({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: () => {
      toast.add({
        title: "Error",
        description: "Failed to delete category",
        color: "error",
      });
    },
  });
}
