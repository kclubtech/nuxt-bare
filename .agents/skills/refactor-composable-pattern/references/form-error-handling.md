---
title: Form Error Handling & Backend Integration
description: How to handle validation errors from backend, transform them to form errors, and display them properly
---

# Form Error Handling & Backend Integration Pattern

## Overview

This guide shows how to properly handle backend validation errors in forms. The pattern includes:

1. **Composable Logic** - Form state, validation schema, API calls
2. **Error Transformation** - Backend errors → form field errors
3. **Component UI** - Display errors and show toast notifications
4. **Type Safety** - Full TypeScript typing throughout

---

## Architecture Flow

```
Component (Form.vue)
    ↓
    └─→ useAdvertiseForm() Composable
            ├─→ state (reactive form data)
            ├─→ schema (Zod validation)
            ├─→ form ref (NuxtUI Form)
            └─→ onSubmit (handles create/edit)
                    ↓
                    API Request ($fetch)
                    ↓
            ┌──────────┬──────────┐
            ↓                      ↓
        Success            Error (FetchError)
            ↓                      ↓
       Toast OK          transformToIssue()
       Emit 'reload'             ↓
                         form.setErrors()
                         Toast Error
```

---

## Type Definitions

### Error Response Type

```typescript
// filepath: shared/types/index.ts
export interface APIResponseFormError {
  errors: {
    [key: string]: string[]; // field name → array of error messages
  };
  message?: string;
}
```

**Example Backend Error Response:**

```json
{
  "message": "Validation failed",
  "errors": {
    "title": ["Title is required"],
    "start_date": [
      "Start date is required",
      "Start date must be before end date"
    ],
    "url": ["URL must be a valid URL"]
  }
}
```

### Form Schema Type

```typescript
export interface AdvertiseForm {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  url?: string;
  index: number;
}
```

---

## Step 1: Create Composable with Error Handling

```typescript
// filepath: composables/advertise.ts
import type { Form, FormSubmitEvent } from "@nuxt/ui";
import type { Advertise, AdvertiseForm } from "@/types/advertise";
import type { ResponseCommon } from "@/types/response";
import { FetchError } from "ofetch";
import * as z from "zod";

interface Opt {
  callback?: (item?: Advertise) => void;
}

export function useAdvertiseForm({ callback }: Opt) {
  const toast = useToast();
  const pending = ref(false);
  const item = ref<Advertise>();

  // ✅ Helper to transform backend errors to form errors
  const { transformToIssue } = useFormErrors();

  // Form state - tracks current form values
  const state = ref<AdvertiseForm>({
    title: "",
    description: undefined,
    start_date: "",
    end_date: "",
    url: undefined,
    index: 0,
  });

  // Schema for CLIENT-SIDE validation (before sending to backend)
  const schema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    url: z.string().url("URL must be a valid URL").optional(),
    index: z.number().min(0, "Index must be a positive number"),
  });

  // Reference to NuxtUI Form component
  const form = ref<Form<AdvertiseForm>>();

  /**
   * Main submit handler - detects create vs edit
   */
  function onSubmit(event: FormSubmitEvent<AdvertiseForm>): void {
    if (item.value) {
      _edit(event);
    } else {
      _create(event);
    }
  }

  /**
   * CREATE new advertise
   */
  async function _create(event: FormSubmitEvent<AdvertiseForm>) {
    pending.value = true;
    try {
      // ✅ Send data to backend
      const response = await $fetch<ResponseCommon<Advertise>>(
        "/api/admin/advertise",
        {
          method: "POST",
          body: {
            ...event.data,
          },
        },
      );

      // ✅ Success - show toast
      toast.add({
        title: "Success",
        description: "Advertise created successfully",
        color: "success",
        duration: 15 * 1000,
      });

      // ✅ Call callback to parent component (reload data)
      if (callback) {
        callback(response.data);
      }
    } catch (e) {
      // ❌ Error handling
      if (e instanceof FetchError) {
        // ✅ Transform backend errors to form field errors
        if (form.value) {
          form.value.setErrors(transformToIssue(e?.response?._data));
        }

        // ✅ Show error toast
        toast.add({
          title: "Error",
          description:
            e?.response?._data.message ??
            "Something went wrong. Please try again later",
          color: "error",
          duration: 15 * 1000,
        });
      }
    } finally {
      pending.value = false;
    }
  }

  /**
   * EDIT existing advertise
   */
  async function _edit(event: FormSubmitEvent<AdvertiseForm>) {
    pending.value = true;
    try {
      const response = await $fetch<ResponseCommon<Advertise>>(
        `/api/admin/advertise/${item.value?.id}`,
        {
          method: "PUT",
          body: {
            ...event.data,
          },
        },
      );

      toast.add({
        title: "Success",
        description: "Advertise updated successfully",
        color: "success",
        duration: 15 * 1000,
      });

      if (callback) {
        callback(response.data);
      }
    } catch (e) {
      if (e instanceof FetchError) {
        if (form.value) {
          form.value.setErrors(transformToIssue(e?.response?._data));
        }
        toast.add({
          title: "Error",
          description:
            e?.response?._data.message ??
            "Something went wrong. Please try again later",
          color: "error",
          duration: 15 * 1000,
        });
      }
    } finally {
      pending.value = false;
    }
  }

  return {
    state,
    form,
    onSubmit,
    schema,
    pending,
    item,
  };
}
```

---

## Step 2: Transform Backend Errors to Form Errors

```typescript
// filepath: composables/useFormErrors.ts
import type { FormError } from "@nuxt/ui";

export default function () {
  /**
   * Transform backend validation errors to NuxtUI FormError format
   *
   * Input: { errors: { title: ['Title is required'], url: ['Invalid URL'] } }
   * Output: [{ name: 'title', message: 'Title is required' }, ...]
   */
  function transformToIssue(issues?: APIResponseFormError): FormError<any>[] {
    const errors: FormError<any>[] = [];

    if (issues?.errors) {
      Object.entries(issues.errors).forEach(([key, value]) => {
        errors.push({
          message: value?.join(", "), // Join multiple errors with comma
          name: key, // Field name that has error
        });
      });
    }

    return errors;
  }

  return {
    transformToIssue,
  };
}
```

---

## Step 3: Use in Component

```vue
<!-- filepath: components/Advertise/Form.vue -->
<script setup lang="ts">
import type { Advertise } from "@/types/advertise";

const props = defineProps<{
  item?: Advertise;
}>();

const emit = defineEmits<{
  (e: "reload", item?: Advertise): void;
}>();

// ✅ Get everything from composable
const { state, item, onSubmit, form, schema, pending } = useAdvertiseForm({
  callback: (item) => {
    // ✅ Emit event so parent can reload data
    emit("reload", item);
  },
});

// ✅ Initialize form if editing
onMounted(async () => {
  await nextTick();

  if (props.item) {
    item.value = props.item;
    state.value.title = props.item.title;
    state.value.description = props.item.description ?? undefined;
    state.value.start_date = props.item.start_date;
    state.value.end_date = props.item.end_date;
    state.value.url = props.item.url ?? undefined;
  }
});
</script>

<template>
  <div>
    <!-- ✅ UForm ref needed for setErrors() to work -->
    <UForm ref="form" :state="state" :schema="schema" @submit="onSubmit">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- ✅ UFormField displays errors automatically -->
          <UFormField label="Title" name="title">
            <UInput
              v-model="state.title"
              class="w-full"
              placeholder="Enter the title"
            />
          </UFormField>

          <UFormField label="Start Date" name="start_date">
            <UInput
              v-model="state.start_date"
              type="date"
              class="w-full"
              placeholder="Select start date"
            />
          </UFormField>

          <UFormField label="End Date" name="end_date">
            <UInput
              v-model="state.end_date"
              type="date"
              class="w-full"
              placeholder="Select end date"
            />
          </UFormField>

          <UFormField label="URL" name="url">
            <UInput
              v-model="state.url"
              class="w-full"
              placeholder="Enter the URL"
            />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
            class="lg:col-span-3"
          >
            <UTextarea
              v-model="state.description"
              class="w-full"
              placeholder="Enter the description"
              :rows="4"
            />
          </UFormField>
        </div>

        <USeparator />

        <div class="flex justify-end gap-2">
          <!-- ✅ loading state shows during submit -->
          <UButton type="submit" :loading="pending">
            {{ props.item?.id ? "Update" : "Create" }}
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
</template>
```

---

## Error Flow Example

### Scenario: User submits form with invalid data

```
1. User submits form
   ↓
2. Client-side validation (Zod schema)
   - If fails → UForm shows errors, doesn't send to backend
   - If passes → sends to backend
   ↓
3. Backend validates again
   - If passes → returns success
   - If fails → returns APIResponseFormError
        {
          message: 'Validation failed',
          errors: {
            title: ['Title must be unique'],
            start_date: ['Start date must be before end date']
          }
        }
   ↓
4. Frontend catches FetchError
   ↓
5. transformToIssue() converts:
   { title: ['Title must be unique'], start_date: ['Start date must be before end date'] }
   ↓
   to FormError[]:
   [
     { name: 'title', message: 'Title must be unique' },
     { name: 'start_date', message: 'Start date must be before end date' }
   ]
   ↓
6. form.setErrors() updates form state
   ↓
7. UFormField components render errors under each field
   ↓
8. Toast shows: "Validation failed"
```

---

## Multiple Field Errors

When backend returns multiple error messages for one field:

```json
{
  "errors": {
    "title": ["Title is required", "Title must be unique", "Title is too short"]
  }
}
```

The `transformToIssue()` joins them:

```
message: "Title is required, Title must be unique, Title is too short"
```

Display in UFormField:

```
Title ✗
Title is required, Title must be unique, Title is too short
```

---

## Complete Form with Delete

```typescript
// filepath: composables/advertise.ts

export function useAdvertiseDelete({ callback }: Opt) {
  const toast = useToast();
  const pending = ref(false);
  const item = ref<Advertise>();

  async function onDelete() {
    pending.value = true;
    try {
      await $fetch(`/api/admin/advertise/${item.value?.id}`, {
        method: "DELETE",
      });

      toast.add({
        title: "Success",
        description: "Advertise deleted successfully",
        color: "success",
        duration: 15 * 1000,
      });

      if (callback) {
        callback();
      }
    } catch (e) {
      if (e instanceof FetchError) {
        toast.add({
          title: "Error",
          description:
            e?.response?._data.message ??
            "Something went wrong. Please try again later",
          color: "error",
          duration: 15 * 1000,
        });
      }
    } finally {
      pending.value = false;
    }
  }

  return {
    onDelete,
    pending,
    item,
  };
}
```

---

## Key Patterns

### 1. Contract Between Frontend & Backend

**Backend returns:**

```typescript
interface APIResponseFormError {
  errors: {
    [fieldName: string]: string[];
  };
  message?: string;
}
```

**Frontend expects:**

```typescript
// transformToIssue converts to FormError[]
interface FormError {
  name: string; // field name
  message: string; // error message(s)
}
```

### 2. Form Reference Required

```typescript
// ✅ Must have form ref to call setErrors()
const form = ref<Form<AdvertiseForm>>()

// In component template:
<UForm ref="form" :state="state" @submit="onSubmit">
```

### 3. Error Handling Pattern

```typescript
try {
  await $fetch(...)  // Send to backend
  toast.add(...)     // Success
  callback()         // Notify parent
}
catch (e) {
  if (e instanceof FetchError) {
    form.value?.setErrors(transformToIssue(e?.response?._data))
    toast.add(...)   // Error message
  }
}
```

### 4. Callback Pattern

```typescript
// Composable accepts callback
export function useAdvertiseForm({ callback }: Opt) { ... }

// Component passes callback
const { ... } = useAdvertiseForm({
  callback: (item) => {
    emit('reload', item)
  }
})
```

---

## Component Hierarchy

```
Page (pages/admin/advertise/index.vue)
  ├─→ Table (Advertise/Table.vue)
  ├─→ Page (Advertise/Page.vue)
  │   ├─→ Form (Advertise/Form.vue)
  │   │   └─→ useAdvertiseForm() composable
  │   │       └─→ error handling with form.setErrors()
  │   └─→ Delete (Advertise/Delete.vue)
  │       └─→ useAdvertiseDelete() composable
```

---

## Image Upload with Error Handling

```typescript
// filepath: composables/advertise.ts

export function useAdvertiseImageForm({ callback }: Opt) {
  const toast = useToast();
  const pending = ref(false);
  const item = ref<Advertise>();
  const { transformToIssue } = useFormErrors();

  interface ImageForm {
    image: File | undefined;
    description?: string;
  }

  const state = ref<ImageForm>({
    image: undefined,
    description: undefined,
  });

  const schema = z
    .object({
      description: z.string().optional(),
      image: z.instanceof(File),
    })
    .superRefine((val, ctx) => {
      // Custom validation
      if (!val.image) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image is required",
          path: ["image"],
        });
      }

      // Only PNG, JPG, JPEG
      if (!["image/png", "image/jpeg", "image/jpg"].includes(val.image?.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image type must be PNG, JPG, JPEG",
          path: ["image"],
        });
      }

      // Max 2MB
      if (val.image && val.image.size > 2 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image size must be less than 2MB",
          path: ["image"],
        });
      }
    });

  const form = ref<Form<ImageForm>>();

  async function onSubmit(event: FormSubmitEvent<ImageForm>) {
    pending.value = true;
    const formData = new FormData();
    formData.append("image", event.data.image!);
    formData.append("description", event.data.description ?? "");

    try {
      const response = await $fetch<ResponseCommon<Advertise>>(
        `/api/admin/advertise/${item.value?.id}/image`,
        {
          method: "POST",
          body: formData,
        },
      );

      toast.add({
        title: "Success",
        description: "Image uploaded successfully",
        color: "success",
        duration: 15 * 1000,
      });

      if (callback) {
        callback(response.data);
      }
    } catch (error) {
      if (error instanceof FetchError) {
        if (form.value) {
          form.value.setErrors(transformToIssue(error?.response?._data));
        }
        toast.add({
          title: "Error",
          description:
            error?.response?._data.message ?? "Failed to upload image",
          color: "error",
          duration: 15 * 1000,
        });
      }
    } finally {
      pending.value = false;
    }
  }

  return {
    state,
    form,
    onSubmit,
    schema,
    pending,
    item,
  };
}
```

---

## Testing Error Handling

```typescript
// Test transforming errors
const helper = useFormErrors();
const result = helper.transformToIssue({
  errors: {
    title: ["Required", "Min 5 chars"],
    url: ["Invalid URL"],
  },
});

expect(result).toEqual([
  { name: "title", message: "Required, Min 5 chars" },
  { name: "url", message: "Invalid URL" },
]);
```

---

## Summary

✅ **Best Practices:**

- Backend validates and returns structured errors
- Frontend transforms errors to form field errors
- Form displays errors under each field automatically
- Toast shows general error message
- Callback notifies parent to reload data
- Full type safety with TypeScript

❌ **Avoid:**

- Manual error handling in components
- Displaying raw backend error objects
- Toast-only error feedback (needs field-level errors too)
- Missing form reference (can't call setErrors)
- Not handling FetchError properly
