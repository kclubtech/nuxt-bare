<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { formatTimeAgo } from "@vueuse/core";

const { locale } = useI18n();
const { search, page, params } = useBlogListState();
const { data: posts, isLoading: pending } = usePostsQuery(params);
const { mutate: deletePost, isLoading: deleting } = usePostDeleteMutation();

const limit = computed(() => posts.value?.meta?.per_page ?? 10);
const total = computed(() => posts.value?.meta?.total ?? 0);
const paginationFrom = computed(() =>
  total.value === 0
    ? 0
    : Math.min((page.value - 1) * limit.value + 1, total.value),
);
const paginationTo = computed(() =>
  Math.min(page.value * limit.value, total.value),
);

const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UButton = resolveComponent("UButton");
const UIcon = resolveComponent("UIcon");

const confirmDeleteOpen = ref(false);
const postToDelete = ref<number | null>(null);

function handleDeletePost(id: number) {
  postToDelete.value = id;
  confirmDeleteOpen.value = true;
}

function confirmDelete() {
  if (postToDelete.value) {
    deletePost(postToDelete.value);
    postToDelete.value = null;
  }
}

function getRowActions(rowId: number) {
  return [
    {
      label: "Edit",
      icon: "i-lucide-pencil",
      to: `/admin/blog/${rowId}/edit`,
    },
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => handleDeletePost(rowId),
    },
  ];
}

const columnsData: TableColumn<BlogPost>[] = [
  {
    id: "image",
    header: "",
    meta: {
      class: {
        th: "text-left w-16",
        td: "text-left",
      },
    },
    cell: ({ row }) => {
      const featured = row.original.featuredImage;
      if (!featured?.full_path) {
        return h(
          "div",
          {
            class:
              "flex h-10 w-14 items-center justify-center rounded border border-dashed border-default bg-muted/30",
          },
          () => h(UIcon, { name: "i-lucide-image", class: "size-4 text-muted" }),
        );
      }
      return h("img", {
        // Prefer the small thumbnail variant when the media has one
        src: featured.thumbnail?.full_path ?? featured.full_path,
        alt: "",
        loading: "lazy",
        class: "h-10 w-14 rounded object-cover",
      });
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    meta: {
      class: {
        th: "text-left",
        td: "text-left",
      },
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
  {
    accessorKey: "language",
    header: "Language",
    meta: {
      class: {
        th: "text-center",
        td: "text-center",
      },
    },
    cell: ({ row }) =>
      h(UBadge, { color: "primary", variant: "subtle", size: "sm" }, () =>
        (row.getValue("language") as string).toUpperCase(),
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      class: {
        th: "text-center",
        td: "text-center",
      },
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const color = status === "published" ? "success" : "neutral";
      return h(
        UBadge,
        { color, variant: "subtle", class: "capitalize", size: "sm" },
        () => status,
      );
    },
  },
  {
    accessorKey: "author.name",
    header: "Author",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    meta: {
      class: {
        th: "text-right",
        td: "text-right text-sm",
      },
    },
    cell: ({ row }) =>
      formatTimeAgo(new Date(row.getValue("createdAt") as string)),
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      class: {
        th: "text-right",
        td: "text-right",
      },
    },
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          items: getRowActions(row.original.id),
          content: { align: "end" },
        },
        () =>
          h(UButton, {
            icon: "i-lucide-ellipsis-vertical",
            color: "neutral",
            variant: "ghost",
            size: "sm",
            "aria-label": "Actions",
          }),
      ),
  },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <CommonPageHeader title="Blog Posts">
      <template #description>
        Manage your localized content. Currently editing in
        <span class="font-semibold uppercase">{{ locale }}</span> language.
      </template>
      <UButton to="/admin/blog/create" icon="i-lucide-plus" label="New Post" />
    </CommonPageHeader>

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search posts..."
            class="w-full max-w-xs"
          />
          <span class="text-sm text-muted ml-auto">{{ total }} results</span>
        </div>
      </template>

      <UTable
        :data="posts?.data || []"
        :columns="columnsData"
        :loading="pending"
      />

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Showing {{ paginationFrom }}–{{ paginationTo }} of {{ total }}
          </p>
          <UPagination
            v-model:page="page"
            :total="posts?.meta?.total || 0"
            :items-per-page="posts?.meta?.per_page || 10"
          />
        </div>
      </template>
    </UCard>

    <!-- Confirm Delete Modal -->
    <CommonConfirmDelete
      v-model:open="confirmDeleteOpen"
      title="Delete Blog Post"
      message="Are you sure you want to delete this blog post? This action cannot be undone and all content will be permanently removed."
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
