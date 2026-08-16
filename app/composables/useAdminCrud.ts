import { useMutation, useQuery, useQueryCache } from "@pinia/colada";

/**
 * Standard data hooks for a simple admin CRUD resource (categories, tags, ...):
 * a list query plus create/update/delete mutations that invalidate the list
 * cache and show success/error toasts.
 *
 * Per-resource wrappers live in `useCategory.ts` / `useTag.ts`; adding a new
 * simple resource only needs a new wrapper file with this config.
 */
export interface AdminCrudConfig {
  /** Query cache key, e.g. `["admin", "tags"]` */
  key: string[];
  /** API base path, e.g. `/api/admin/tags` */
  baseUrl: string;
  /** Display label used in toasts, e.g. `"Tag"` */
  label: string;
}

export function useAdminCrudList<TItem>(config: AdminCrudConfig) {
  return useQuery({
    key: config.key,
    query: async () => {
      const response = await $fetch<{ data: TItem[]; statusMessage: string }>(
        config.baseUrl,
      );
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminCrudMutations<
  TItem,
  TCreate extends Record<string, any>,
  TUpdate extends Record<string, any>,
>(
  config: AdminCrudConfig,
) {
  const cache = useQueryCache();
  const toast = useToast();

  const invalidate = () => cache.invalidateQueries({ key: config.key });

  const successToast = (action: string) =>
    toast.add({
      title: "Success",
      description: `${config.label} ${action} successfully`,
    });

  const errorToast = (action: string, error: unknown) =>
    toast.add({
      title: "Error",
      description: getErrorMessage(error, `Failed to ${action} ${config.label.toLowerCase()}`),
      color: "error",
    });

  const create = useMutation({
    mutation: (data: TCreate) =>
      $fetch<TItem>(config.baseUrl, { method: "POST", body: data }),
    onSuccess: async () => {
      await invalidate();
      successToast("created");
    },
    // Errors are handled by the calling component (form field errors)
  });

  const update = useMutation({
    mutation: ({ id, data }: { id: number; data: TUpdate }) =>
      $fetch<TItem>(`${config.baseUrl}/${id}`, { method: "PUT", body: data }),
    onSuccess: async () => {
      await invalidate();
      successToast("updated");
    },
    // Errors are handled by the calling component (form field errors)
  });

  const remove = useMutation({
    mutation: (id: number) =>
      $fetch<{ success: boolean; id: number }>(`${config.baseUrl}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidate();
      successToast("deleted");
    },
    onError: (error) => errorToast("delete", error),
  });

  return { create, update, remove };
}
