import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import type { StandardListResponse } from "@/types/response";
import type { BlogListParams, BlogPost } from "@/types/blog";

export const usePostsQuery = (params: Ref<BlogListParams>) => {
  return useQuery({
    key: () => ["posts", params.value],
    query: () => {
      const p = params.value;
      return $fetch<StandardListResponse<BlogPost>>("/api/admin/blog", {
        query: {
          page: p.page,
          limit: p.limit,
          search: p.search,
        },
      });
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePostQuery = (id: Ref<number | string>) => {
  return useQuery({
    key: () => ["posts", id.value],
    query: async () => {
      const response = await $fetch<{
        data: AdminPost;
        statusMessage: string;
      }>(`/api/admin/blog/${id.value}`);
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePostDeleteMutation = () => {
  const queryCache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: (id: number | string) =>
      $fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ["posts"] });
      toast.add({
        title: "Success",
        description: "Post deleted successfully",
        color: "success",
      });
    },
    onError: (err: any) => {
      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to delete post"),
        color: "error",
      });
      throw err;
    },
  });
};

// Handles form state, API submission, and population for the blog create/edit form.
export const useBlogForm = (
  post?: Ref<BlogFormData | null | undefined>,
  options?: { onSuccess?: () => void },
) => {
  const { transformToIssue } = useFormErrors();
  const toast = useToast();

  // Fetch categories and tags for form selectors
  const { data: categories } = useCategoriesQuery();
  const { data: tags } = useTagsQuery();

  // Get mutations for create/update
  const createMutation = useMutation({
    mutation: (payload: BlogFormData) =>
      $fetch("/api/admin/blog", { method: "POST", body: payload }),
    onSuccess: () => {
      toast.add({
        title: "Success",
        description: "Blog post created successfully",
        color: "success",
      });
      options?.onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutation: ({ id, payload }: { id: number; payload: BlogFormData }) =>
      $fetch(`/api/admin/blog/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      toast.add({
        title: "Success",
        description: "Blog post updated successfully",
        color: "success",
      });
      options?.onSuccess?.();
    },
  });

  // Form state
  const form = reactive({
    slug: "",
    title: "",
    shortDescription: "",
    content: "",
    status: "draft" as BlogFormData["status"],
    categoryIds: [] as number[],
    tagIds: [] as number[],
    featuredImageId: null as number | null,
  });

  const formRef = ref<any>(null);
  const isLoading = computed(
    () => createMutation.isLoading.value || updateMutation.isLoading.value,
  );

  // Computed category and tag options for selectors
  const categoryOptions = computed(() =>
    (categories.value || []).map((c) => ({
      id: c.id,
      label: c.name,
    })),
  );

  const tagOptions = computed(() =>
    (tags.value || []).map((t) => ({
      id: t.id,
      label: t.name,
    })),
  );

  const statusOptions = [
    { label: "Draft", value: "draft" as const },
    { label: "Published", value: "published" as const },
    { label: "Archived", value: "archived" as const },
  ];

  // Populate the form when the post changes; reset it when no post is provided.
  // Locale extraction happens upstream (edit page's formPost computed), so the
  // value here already has plain string fields.
  watchEffect(() => {
    if (post?.value) {
      const p = post.value;
      form.slug = p.slug || "";
      form.title = p.title || "";
      form.shortDescription = p.shortDescription || "";
      form.content = p.content || "";
      form.status = p.status || "draft";
      form.categoryIds = p.categoryIds || [];
      form.tagIds = p.tagIds || [];
      form.featuredImageId = p.featuredImageId ?? null;
    } else {
      form.slug = "";
      form.title = "";
      form.shortDescription = "";
      form.content = "";
      form.status = "draft";
      form.categoryIds = [];
      form.tagIds = [];
      form.featuredImageId = null;
    }
  });

  // Submit handler - handles both create & update internally
  const onSubmit = async (event: any) => {
    try {
      const payload = {
        slug: event.data.slug,
        title: event.data.title,
        shortDescription: event.data.shortDescription,
        content: event.data.content,
        status: event.data.status,
        categoryIds: form.categoryIds || [],
        tagIds: form.tagIds || [],
        featuredImageId: form.featuredImageId || null,
      };

      if (post?.value?.id) {
        // Update mode
        await updateMutation.mutateAsync({
          id: post.value.id,
          payload,
        });
      } else {
        // Create mode
        await createMutation.mutateAsync(payload);
      }
    } catch (err: any) {
      if (formRef.value) {
        const errors = transformToIssue(err);
        if (errors.length) {
          formRef.value.setErrors(errors);
        }
      }

      toast.add({
        title: "Error",
        description: getErrorMessage(err, "Failed to save blog post"),
        color: "error",
      });
    }
  };

  return {
    form,
    formRef,
    categories,
    tags,
    categoryOptions,
    tagOptions,
    statusOptions,
    isLoading,
    onSubmit,
  };
};
