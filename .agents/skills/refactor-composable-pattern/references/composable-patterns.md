---
title: Composable Patterns
description: Best practices for creating and organizing composables for business logic and state management
---

# Composable Patterns Guide

## Principles

1. **Single Responsibility** - Satu composable untuk satu domain (Blog, Category, User)
2. **Reusable Logic** - Composable dapat digunakan di multiple komponen
3. **Type Safety** - Semua return type dan parameter di-type
4. **Testability** - Composable bisa di-test independently
5. **No Circular Dependency** - Composable dapat depend ke composable lain tapi hindari circular

---

## Composable Structure

### Basic Template

```typescript
// composables/useBlogList.ts
import { ref, computed, watch } from "vue";
import { BlogData, BlogListQuery } from "@/shared/types";

export function useBlogList() {
  // State
  const blogs = ref<BlogData[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const query = reactive<BlogListQuery>({
    page: 1,
    limit: 10,
    search: "",
    sort: "createdAt:desc",
  });

  // Computed
  const hasBlogs = computed(() => blogs.value.length > 0);
  const isEmpty = computed(() => !isLoading.value && blogs.value.length === 0);

  // Methods
  const fetchBlogs = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await $fetch("/api/blogs", { query });
      blogs.value = response.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  const search = (term: string) => {
    query.search = term;
    query.page = 1;
    fetchBlogs();
  };

  const setSort = (field: string, order: "asc" | "desc") => {
    query.sort = `${field}:${order}`;
    query.page = 1;
    fetchBlogs();
  };

  const goToPage = (page: number) => {
    query.page = page;
    fetchBlogs();
  };

  // Lifecycle
  onMounted(() => {
    fetchBlogs();
  });

  // Watch untuk auto-fetch saat query berubah
  watch(
    () => query,
    () => {
      fetchBlogs();
    },
    { deep: true, debounce: 300 },
  );

  return {
    // State
    blogs,
    isLoading,
    error,
    query,
    // Computed
    hasBlogs,
    isEmpty,
    // Methods
    fetchBlogs,
    search,
    setSort,
    goToPage,
  };
}
```

---

## Composable Types: By Domain

### 1. **List/Collection Composable**

Untuk menangani fetch list, search, filter, pagination, sort.

```typescript
// composables/useBlogList.ts
export interface BlogListState {
  items: BlogData[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
}

export interface BlogListQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  sort?: string;
}

export function useBlogList() {
  const state = reactive<BlogListState>({
    items: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    limit: 10,
  });

  const query = reactive<BlogListQuery>({
    page: 1,
    limit: 10,
  });

  const totalPages = computed(() => Math.ceil(state.total / state.limit));
  const hasNextPage = computed(() => state.page < totalPages.value);
  const hasPrevPage = computed(() => state.page > 1);

  const fetchList = async () => {
    state.isLoading = true;
    try {
      const res = await $fetch("/api/blogs", { query });
      state.items = res.data;
      state.total = res.total;
    } catch (err) {
      state.error = err.message;
    } finally {
      state.isLoading = false;
    }
  };

  const search = (term: string) => {
    query.search = term;
    query.page = 1;
    return fetchList();
  };

  const nextPage = () => {
    if (hasNextPage.value) {
      query.page++;
      return fetchList();
    }
  };

  const prevPage = () => {
    if (hasPrevPage.value) {
      query.page--;
      return fetchList();
    }
  };

  const goToPage = (page: number) => {
    query.page = Math.max(1, Math.min(page, totalPages.value));
    return fetchList();
  };

  onMounted(fetchList);

  return {
    state,
    query,
    totalPages,
    hasNextPage,
    hasPrevPage,
    fetchList,
    search,
    nextPage,
    prevPage,
    goToPage,
  };
}
```

**Digunakan di:**

```vue
<script setup lang="ts">
const { state, query, search, nextPage } = useBlogList();
</script>

<template>
  <div>
    <input placeholder="Search..." @input="search" />
    <div v-for="blog in state.items" :key="blog.id">
      {{ blog.title }}
    </div>
    <button v-if="state.isLoading">Loading...</button>
    <button v-else @click="nextPage">Next</button>
  </div>
</template>
```

---

### 2. **Detail/Single Item Composable**

Untuk fetch single item berdasarkan ID.

```typescript
// composables/useBlogDetail.ts
import { BlogData } from "@/shared/types";

export function useBlogDetail(id: string | Ref<string>) {
  const blog = ref<BlogData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const blogId = computed(() => {
    return typeof id === "string" ? id : id.value;
  });

  const fetchBlog = async () => {
    if (!blogId.value) return;

    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(`/api/blogs/${blogId.value}`);
      blog.value = res.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-fetch saat ID berubah
  watch(blogId, fetchBlog);

  onMounted(fetchBlog);

  return {
    blog,
    isLoading,
    error,
    refetch: fetchBlog,
  };
}
```

**Digunakan di:**

```vue
<script setup lang="ts">
import { useBlogDetail } from "@/composables/useBlogDetail";

const route = useRoute();
const { blog, isLoading } = useBlogDetail(route.params.id);
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <article v-else-if="blog">
    <h1>{{ blog.title }}</h1>
    <div>{{ blog.content }}</div>
  </article>
</template>
```

---

### 3. **Form Composable (Smart Edit/Create)**

Untuk handle form submission (create dan update dalam satu logic).

```typescript
// composables/useBlogForm.ts
import { isRef, Ref } from "vue";
import { BlogData, BlogFormData } from "@/shared/types";

export function useBlogForm(initialData?: BlogData | Ref<BlogData | null>) {
  // Determine if this is edit or create
  const data = isRef(initialData) ? initialData : ref(initialData);

  const isEdit = computed(() => !!data.value?.id);
  const isCreate = computed(() => !isEdit.value);

  // Form state
  const formData = reactive<BlogFormData>({
    title: data.value?.title || "",
    content: data.value?.content || "",
    excerpt: data.value?.excerpt || "",
    categoryId: data.value?.categoryId || "",
    tags: data.value?.tags || [],
  });

  // Form meta
  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);
  const touched = ref<Record<string, boolean>>({});

  // Validation
  const validateForm = (): boolean => {
    errors.value = {};

    if (!formData.title?.trim()) {
      errors.value.title = "Title is required";
    }
    if (!formData.content?.trim()) {
      errors.value.content = "Content is required";
    }

    return Object.keys(errors.value).length === 0;
  };

  // Submit
  const submitForm = async () => {
    if (!validateForm()) return;

    isSubmitting.value = true;
    try {
      let response;
      if (isEdit.value) {
        response = await $fetch(`/api/blogs/${data.value!.id}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        response = await $fetch("/api/blogs", {
          method: "POST",
          body: formData,
        });
      }

      // Update local data
      data.value = response.data;

      return response.data;
    } finally {
      isSubmitting.value = false;
    }
  };

  // Reset to initial
  const reset = () => {
    Object.assign(formData, {
      title: data.value?.title || "",
      content: data.value?.content || "",
      excerpt: data.value?.excerpt || "",
      categoryId: data.value?.categoryId || "",
      tags: data.value?.tags || [],
    });
    errors.value = {};
    touched.value = {};
  };

  // Mark field as touched
  const markTouched = (field: string) => {
    touched.value[field] = true;
  };

  const getFieldError = (field: string) => {
    return touched.value[field] ? errors.value[field] : null;
  };

  return {
    // State
    formData,
    errors,
    isSubmitting,
    isEdit,
    isCreate,
    // Methods
    submitForm,
    reset,
    validateForm,
    markTouched,
    getFieldError,
  };
}
```

**Digunakan di:**

```vue
<script setup lang="ts">
import { useBlogForm } from "@/composables/useBlogForm";
import BlogForm from "@/components/Blog/BlogForm.vue";

const route = useRoute();
const blog = ref<BlogData>(null);

// Fetch blog jika edit
if (route.params.id) {
  const res = await $fetch(`/api/blogs/${route.params.id}`);
  blog.value = res.data;
}

const { formData, errors, isEdit, submitForm } = useBlogForm(blog);
</script>

<template>
  <form @submit.prevent="submitForm">
    <h1>{{ isEdit ? "Edit" : "Create" }} Blog</h1>
    <!-- form fields -->
  </form>
</template>
```

---

### 4. **Deletion/Action Composable**

Untuk handle delete, activate, deactivate, dll.

```typescript
// composables/useBlogActions.ts
export function useBlogActions() {
  const isDeleting = ref(false);
  const deleteError = ref<string | null>(null);

  const deleteBlog = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    isDeleting.value = true;
    deleteError.value = null;
    try {
      await $fetch(`/api/blogs/${id}`, { method: "DELETE" });
      return true;
    } catch (err) {
      deleteError.value = err.message;
      return false;
    } finally {
      isDeleting.value = false;
    }
  };

  const bulkDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} items? This cannot be undone.`)) return;

    isDeleting.value = true;
    try {
      await $fetch("/api/blogs/bulk-delete", {
        method: "POST",
        body: { ids },
      });
      return true;
    } finally {
      isDeleting.value = false;
    }
  };

  return {
    isDeleting,
    deleteError,
    deleteBlog,
    bulkDelete,
  };
}
```

---

## Composable Composition

Composable dapat menggunakan composable lain:

```typescript
// composables/useBlogManager.ts
export function useBlogManager() {
  // Gunakan composable lain
  const { state, fetchList, search } = useBlogList();
  const { deleteBlog } = useBlogActions();

  const deleteAndRefresh = async (id: string) => {
    const success = await deleteBlog(id);
    if (success) {
      await fetchList();
    }
  };

  return {
    blogs: state.items,
    isLoading: state.isLoading,
    search,
    deleteAndRefresh,
  };
}
```

---

## Advanced: Local State with Composable

Atau gunakan composable dengan local reactive state:

```typescript
// composables/useFormWithState.ts
export function useFormWithState<T extends Record<string, any>>(
  initialData: T,
  onSubmit: (data: T) => Promise<any>,
) {
  const formData = reactive({ ...initialData });
  const isSubmitting = ref(false);
  const errors = ref<Record<string, string>>({});

  const submit = async () => {
    isSubmitting.value = true;
    try {
      return await onSubmit(formData);
    } finally {
      isSubmitting.value = false;
    }
  };

  const reset = () => {
    Object.assign(formData, initialData);
    errors.value = {};
  };

  return { formData, isSubmitting, errors, submit, reset };
}
```

---

## ✅ Composable Checklist

- [ ] Composable hanya export plain JS (tidak Vue component)
- [ ] Semua return value di-type
- [ ] Tidak ada circular dependency dengan composable lain
- [ ] Reusable di multiple komponen
- [ ] Error handling di-implement
- [ ] Loading state di-track
- [ ] Data fetching menggunakan `$fetch` atau `useFetch`
- [ ] Properly cleanup (onUnmounted untuk listeners/subscriptions)
- [ ] Named export (bukan default)
- [ ] File naming: `use` prefix + camelCase

---

## Best Practices: Don't

❌ **Don't: Import komponen dari composable**

```typescript
// JANGAN!
import MyComponent from "@/components/MyComponent.vue";

export function useMyComposable() {
  // ...
}
```

❌ **Don't: Return Vue component instance**

```typescript
// JANGAN!
export function useMyComposable() {
  return reactive({/* */}); // Return komponen langsung
}
```

❌ **Don't: Circular dependency**

```typescript
// composables/useA.ts
import { useB } from "./useB";
export const useA = () => useB();

// composables/useB.ts
import { useA } from "./useA"; // ❌ CIRCULAR!
export const useB = () => useA();
```

---

## Best Practices: Do

✅ **Do: Clear naming**

```typescript
// Clear nama: use[Domain][Action]
export function useBlogForm() {}
export function useBlogList() {}
export function useBlogDetail() {}
export function useBlogActions() {}
```

✅ **Do: Type everything**

```typescript
export function useExample(): UseExampleReturn {
  return {
    data: ref<Data>([]),
    isLoading: ref<boolean>(false),
  };
}

interface UseExampleReturn {
  data: Ref<Data[]>;
  isLoading: Ref<boolean>;
}
```

✅ **Do: Handle errors**

```typescript
export function useExample() {
  const error = ref<string | null>(null);

  const fetch = async () => {
    try {
      // ...
    } catch (err: any) {
      error.value = err.message;
    }
  };

  return { error, fetch };
}
```
