<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import type { UserWithProfile } from "@/types/db";

const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UButton = resolveComponent("UButton");

const { search, page, params } = useUrlListState({
  filters: ["search"],
  debounce: ["search"],
  params: ({ page, search }) => ({
    page: page.value,
    search: search.value,
    limit: 10,
  }),
});
const { data: users, isLoading: pending } = useUsersQuery(params);
const { mutate: deleteUser, isLoading: deleting } = useUserDeleteMutation();

const limit = computed(() => users.value?.meta?.per_page ?? 10);
const total = computed(() => users.value?.meta?.total ?? 0);
const paginationFrom = computed(() =>
  total.value === 0
    ? 0
    : Math.min((page.value - 1) * limit.value + 1, total.value),
);
const paginationTo = computed(() =>
  Math.min(page.value * limit.value, total.value),
);

const confirmDeleteOpen = ref(false);
const userToDelete = ref<number | null>(null);
const userToDeleteEmail = ref<string>("");

function handleDeleteUser(id: number, email: string) {
  userToDelete.value = id;
  userToDeleteEmail.value = email;
  confirmDeleteOpen.value = true;
}

function confirmDelete() {
  if (userToDelete.value) {
    deleteUser(userToDelete.value);
    userToDelete.value = null;
    userToDeleteEmail.value = "";
  }
}

function getRowActions(rowId: number) {
  const user = users.value?.data?.find((u) => u.id === rowId);
  return [
    {
      label: "Edit User",
      icon: "i-lucide-pencil",
      to: `/admin/users/${rowId}`,
    },
    {
      label: "Delete User",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => handleDeleteUser(rowId, user?.email || ""),
    },
  ];
}

const roleColors: Record<string, string> = {
  admin: "error",
  user: "primary",
  moderator: "warning",
};

const columnsData: TableColumn<UserWithProfile>[] = [
  {
    accessorKey: "email",
    header: "Email",
    meta: {
      class: {
        th: "text-left",
        td: "text-left",
      },
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    meta: {
      class: {
        th: "text-left",
        td: "text-left",
      },
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: {
      class: {
        th: "text-center",
        td: "text-center",
      },
    },
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const color = roleColors[role] || "neutral";
      return h(
        UBadge,
        { color, variant: "subtle", class: "capitalize", size: "sm" },
        () => role,
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    meta: {
      class: {
        th: "text-right",
        td: "text-right text-sm",
      },
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt") as string);
      return date.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
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
    <CommonPageHeader title="Manage Users">
      <UButton to="/admin/users/new" icon="i-lucide-plus">Add User</UButton>
    </CommonPageHeader>

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search users..."
            class="w-full max-w-xs"
          />
          <span class="text-sm text-muted ml-auto">{{ total }} results</span>
        </div>
      </template>

      <UTable
        :columns="columnsData"
        :data="users?.data || []"
        :loading="pending"
      />

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            Showing {{ paginationFrom }}–{{ paginationTo }} of {{ total }}
          </p>
          <UPagination
            v-model:page="page"
            :total="users?.meta?.total || 0"
            :items-per-page="users?.meta?.per_page || 10"
          />
        </div>
      </template>
    </UCard>

    <!-- Confirm Delete Modal -->
    <CommonConfirmDelete
      v-model:open="confirmDeleteOpen"
      title="Delete User"
      message="Are you sure you want to delete this user? This action cannot be undone."
      :item-name="userToDeleteEmail"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
