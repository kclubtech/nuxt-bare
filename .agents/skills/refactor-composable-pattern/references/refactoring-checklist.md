---
title: Refactoring Checklist
description: Step-by-step checklist untuk melakukan refactor sesuai pattern
---

# Refactoring Checklist & Workflow

Gunakan checklist ini saat melakukan refactor pada setiap module/feature.

---

## Phase 1: Preparation

### Project Setup

- [ ] Read SKILL.md (overview pattern)
- [ ] Read component-structure.md (understand hierarchy)
- [ ] Read type-management.md (type organization)
- [ ] Read composable-patterns.md (composable structure)
- [ ] Read form-pattern.md (if refactoring forms)
- [ ] Read import-best-practices.md (prevent circular deps)

### Choose First Module to Refactor

- [ ] Start with small module (e.g., Category, Tags)
- [ ] NOT with complex features first
- [ ] Document current structure
- [ ] Note any circular dependencies
- [ ] List all types/interfaces in module

---

## Phase 2: Type Centralization

For Blog module refactor example:

### Step 1: Collect All Types

- [ ] List all types in `app/types/blog.ts`
- [ ] List all types in `server/api/` routes
- [ ] List all types in components (inline interfaces)
- [ ] List all types in composables

### Step 2: Create Shared Type File

```bash
# Create if not exists
touch shared/types/blog.ts
```

**File content template:**

```typescript
// shared/types/blog.ts
export interface Blog {
  /* ... */
}
export interface BlogFormData {
  /* ... */
}
export interface BlogListItem {
  /* ... */
}
export type BlogListQuery = {/* ... */};
export type CreateBlogPayload = Omit<BlogFormData, "id">;
export type UpdateBlogPayload = Partial<BlogFormData>;
```

- [ ] Create comprehensive types (Entity + FormData + ListItem + Query + Payloads)
- [ ] Add JSDoc comments
- [ ] Export from `shared/types/index.ts`

### Step 3: Update Imports Everywhere

- [ ] In `server/api/**/*.ts` - import from `@/shared/types`
- [ ] In `app/composables/**/*.ts` - import types
- [ ] In `app/components/**/*.vue` - import types
- [ ] Delete duplicate type definitions
- [ ] Run type check: `nuxi typecheck`

Checklist:

- [ ] No types in app/types (for this module)
- [ ] All types in shared/types
- [ ] shared/types/index.ts updated with barrel exports
- [ ] No type errors in output

---

## Phase 3: Composable Creation

### Step 1: Identify Business Logic

For Blog module:

- [ ] List fetching + search + filter + pagination → `useBlogList`
- [ ] Single item fetching → `useBlogDetail`
- [ ] Form create + update → `useBlogForm`
- [ ] Delete, bulk actions → `useBlogActions`

### Step 2: Create Composable Files

```bash
touch app/composables/useBlog{List,Detail,Form,Actions}.ts
```

**For each composable:**

- [ ] Clear naming: `use[Domain][Action]`
- [ ] All params and return types typed
- [ ] Error handling implemented
- [ ] Loading state tracked
- [ ] Properly documented with JSDoc

### Step 3: Extract Logic from Components

- [ ] Move all data fetching to composable
- [ ] Move all validation to composable
- [ ] Move form submission logic to composable
- [ ] Move delete/action logic to composable
- [ ] Keep component focused on rendering

Checklist:

- [ ] All composables in app/composables/
- [ ] Named exports only
- [ ] Proper TypeScript types
- [ ] No circular dependencies
- [ ] No component imports in composables
- [ ] All composables tested (manual or unit test)

---

## Phase 4: Component Refactoring

### Step 1: Identify Components

For Blog module:

- [ ] BlogForm.vue (create & edit, unified)
- [ ] BlogList.vue (list with pagination)
- [ ] BlogCard.vue (item display)
- [ ] BlogDetail.vue (single item view)
- [ ] BlogFilter.vue (search & filter)

### Step 2: Refactor Each Component

**BlogForm.vue:**

```vue
<script setup lang="ts">
import type { BlogData } from "@/shared/types";
import { useBlogForm } from "@/composables/useBlogForm";

defineProps<{ blog?: BlogData }>();
defineEmits<{
  success: [blog: BlogData];
  cancel: [];
}>();

const { formData, submitForm } = useBlogForm(props.blog);
</script>
```

Checklist:

- [ ] Props properly typed
- [ ] Emits defined with types
- [ ] Minimal logic (delegated to composable)
- [ ] Uses v-model or defineModel for form fields
- [ ] Import statement clean

**BlogList.vue:**

- [ ] Uses useBlogList composable
- [ ] Passes blogs as prop to BlogCard
- [ ] Emits events, doesn't call API directly
- [ ] No fetch logic

**BlogCard.vue:**

- [ ] Pure presentation
- [ ] Receives blog as prop
- [ ] Emits edit/delete/select events
- [ ] No data transformation

### Step 3: Remove Old Code

- [ ] Delete old components (if completely replaced)
- [ ] Delete inline scripts (moved to composable)
- [ ] Delete duplicate validation
- [ ] Delete old API calls

Checklist:

- [ ] All components render-focused
- [ ] No API calls in components
- [ ] All types from shared/types
- [ ] No circular imports
- [ ] Component imports only composables/types
- [ ] Page/layout composes components together

---

## Phase 5: Server Routes Update

### Step 1: Update API Routes

For each route (`server/api/blogs/*.ts`):

- [ ] Import types from `@/shared/types`
- [ ] Add proper request/response types
- [ ] Use typed return value: `Promise<{ data: BlogData }>`

Example:

```typescript
// server/api/blogs/index.get.ts
import type {
  PaginatedResponse,
  BlogListItem,
  BlogListQuery,
} from "@/shared/types";

export default defineEventHandler(
  async (event): Promise<PaginatedResponse<BlogListItem>> => {
    const query = getQuery(event) as BlogListQuery;
    // ...
  },
);
```

Checklist:

- [ ] All routes typed properly
- [ ] Using types from shared/types
- [ ] Request body validated
- [ ] Response typed correctly
- [ ] Error handling consistent

### Step 2: Test Routes

- [ ] Test create endpoint (POST)
- [ ] Test read endpoint (GET)
- [ ] Test update endpoint (PATCH)
- [ ] Test delete endpoint (DELETE)
- [ ] Test error cases

---

## Phase 6: Page/Layout Updates

For routes using refactored components:

### Step 1: Update Pages

```vue
<!-- pages/admin/blog/index.vue -->
<script setup lang="ts">
import BlogList from "@/components/Blog/BlogList.vue";
import { useBlogManager } from "@/composables/useBlogManager";

const { blogs, isLoading, search } = useBlogManager();
</script>

<template>
  <div>
    <BlogList :blogs="blogs" :loading="isLoading" />
  </div>
</template>
```

Checklist:

- [ ] Pages import components and composables
- [ ] Pages handle high-level logic
- [ ] URLs and routing updated if needed
- [ ] Middleware properly applied
- [ ] Navigation tested

---

## Phase 7: Testing & Verification

### Run Type Check

```bash
nuxi typecheck
```

- [ ] No type errors
- [ ] All imports resolve

### Run Linting

```bash
npm run lint
```

- [ ] No linting errors
- [ ] Format is consistent

### Manual Testing

- [ ] Create new item (create form)
- [ ] Edit existing item (edit form)
- [ ] Delete item
- [ ] Search/filter items
- [ ] Pagination works
- [ ] Error messages display

### Automated Testing (if applicable)

- [ ] Composable unit tests
- [ ] Component snapshots
- [ ] Integration tests

Checklist:

- [ ] All features working
- [ ] No console errors
- [ ] No type errors
- [ ] Linting passes
- [ ] Performance acceptable

---

## Phase 8: Documentation & Handoff

### Create Module Documentation

Create `docs/REFACTORED_[MODULE].md`:

```markdown
# Blog Module Refactoring

## Structure

- **Types:** shared/types/blog.ts
- **Composables:** app/composables/useBlog\*.ts
- **Components:** app/components/Blog/
- **Routes:** server/api/blogs/

## Key Files

- useBlogForm: handles create & update
- useBlogList: handles listing & pagination
- BlogForm.vue: smart create/edit form
- BlogList.vue: list view

## Usage Example

[Include example of using the module]

## Data Flow Diagram

[Include architecture diagram]
```

Checklist:

- [ ] Code is well commented
- [ ] Types are properly documented
- [ ] Usage examples provided
- [ ] Architecture documented
- [ ] Ready for team handoff

---

## Quick Refactoring Template

Copy & use for next refactor:

### Files to Create

```
shared/types/[module].ts       # Types
app/composables/use[Module]*.ts # Composables
app/components/[Module]/*.vue  # Components
docs/REFACTORED_[MODULE].md    # Docs
```

### Checklist Summary

- [ ] Phase 1: Preparation (read docs)
- [ ] Phase 2: Types (centralize in shared/types)
- [ ] Phase 3: Composables (extract business logic)
- [ ] Phase 4: Components (keep presentation focused)
- [ ] Phase 5: Server Routes (update and type)
- [ ] Phase 6: Pages (wire everything together)
- [ ] Phase 7: Test (verify everything works)
- [ ] Phase 8: Document (handoff to team)

---

## Common Issues & Solutions

### Issue: Circular Import Detected

**Solution:** Composable shouldn't import component

- Move component to page/parent level
- Use event emission or slots instead

### Issue: Type Conflicts

**Solution:** Use specific types from shared/types

- Don't use `any`
- Import from barrel export (shared/types/index.ts)

### Issue: Form Not Updating

**Solution:** Use ref/reactive properly in composable

- Check isEdit detection
- Verify initial data is passed
- Check submitForm API call

### Issue: Validation Not Showing

**Solution:** Check touched state

- Mark field as touched on blur
- Only show error if touched AND has error

---

## When Complete

✅ Refactoring is complete when:

- All phases finished
- Type check passes
- Linting passes
- Manual tests pass
- Features work as before
- Code is cleaner & more maintainable
- Team understands new structure
