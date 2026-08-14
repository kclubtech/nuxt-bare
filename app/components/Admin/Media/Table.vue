<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { Media } from "@/types/db";

const props = withDefaults(
  defineProps<{
    media: Media[];
    loading?: boolean;
    selectMode?: boolean;
  }>(),
  {
    media: () => [],
    loading: false,
    selectMode: false,
  },
);

const emit = defineEmits<{
  (e: "view", url: string): void;
  (e: "delete", id: number): void;
  (e: "select", id: number): void;
}>();

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function getRowActions(rowId: number, item: Media) {
  return [
    {
      label: "View",
      icon: "i-lucide-eye",
      onSelect: () => emit("view", item.full_path || ""),
    },
    {
      label: "Delete",
      icon: "i-lucide-trash-2",
      color: "error",
      onSelect: () => emit("delete", rowId),
    },
  ];
}

const columns: TableColumn<Media>[] = [
  {
    accessorKey: "originalName",
    header: "File",
    cell: ({ row }) => {
      const item = row.original;
      const url = item.thumbnail?.full_path || item.full_path;
      return h("div", { class: "flex items-center gap-3" }, [
        item.type === "image"
          ? h("img", {
              src: url,
              class: "w-12 h-12 object-cover rounded",
              alt: item.originalName,
            })
          : h(
              "div",
              {
                class: "w-12 h-12 grid place-items-center rounded bg-elevated",
              },
              [h("span", { class: "text-sm" }, "📄")],
            ),
        h("div", { class: "min-w-0" }, [
          h("span", { class: "block truncate font-medium" }, item.originalName),
          item.folderName
            ? h(
                "span",
                { class: "block truncate text-xs text-muted" },
                item.folderName,
              )
            : null,
        ]),
      ]);
    },
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "size",
    header: "Size",
    cell: ({ row }) => formatBytes(row.getValue("size") as number),
  },
  {
    accessorKey: "folderName",
    header: "Folder",
    cell: ({ row }) => {
      const folderName = row.original.folderName;
      const UBadge = resolveComponent("UBadge");

      return h(
        UBadge,
        {
          color: folderName ? "primary" : "neutral",
          variant: folderName ? "soft" : "outline",
          size: "sm",
        },
        () => folderName || "Unsorted",
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Uploaded",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt") as string);
      return date.toLocaleString();
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const UButton = resolveComponent("UButton");

      if (props.selectMode) {
        return h(UButton, {
          label: "Pilih",
          variant: "outline",
          size: "sm",
          onClick: () => {
            emit("select", row.original.id);
          },
        });
      }

      const UDropdownMenu = resolveComponent("UDropdownMenu");
      return h(
        UDropdownMenu,
        {
          items: getRowActions(row.original.id, row.original),
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
      );
    },
  },
];
</script>

<template>
  <UCard>
    <UTable :data="media" :columns="columns" :loading="loading" />
  </UCard>
</template>
