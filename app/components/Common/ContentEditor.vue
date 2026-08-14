<script setup lang="ts">
import type { EditorToolbarItem, EditorCustomHandlers } from "@nuxt/ui";
import type { Editor } from "@tiptap/vue-3";
import TextAlign from "@tiptap/extension-text-align";
import { ImageUpload } from "./Editor/ImageUploadExtension";

const modelValue = defineModel<string>({
  required: true,
});

interface Props {
  placeholder?: string;
  readonly?: boolean;
  minHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  minHeight: "16rem",
});

const activeTab = ref("editor");

const wordCount = computed(() => {
  const text = modelValue.value?.trim() ?? "";
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
});

const charCount = computed(() => modelValue.value?.length ?? 0);

const tabItems = [
  { label: "Editor", icon: "i-lucide-pen-line", value: "editor" },
  { label: "Preview", icon: "i-lucide-eye", value: "preview" },
];

const customHandlers: EditorCustomHandlers = {
  imageUpload: {
    canExecute: (editor: Editor) =>
      editor.can().insertContent({ type: "imageUpload" }),
    execute: (editor: Editor) =>
      editor.chain().focus().insertContent({ type: "imageUpload" }).run(),
    isActive: (editor: Editor) => editor.isActive("imageUpload"),
    isDisabled: undefined,
  },
};

const extensions = [
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ImageUpload,
];

const items: EditorToolbarItem[][] = [
  // Text style: H2 → H4 only (no H1 allowed)
  [
    {
      icon: "i-lucide-heading",
      tooltip: { text: "Headings" },
      content: { align: "start" },
      items: [
        {
          kind: "paragraph",
          icon: "i-lucide-case-sensitive",
          label: "Paragraph",
        },
        {
          kind: "heading",
          level: 2,
          icon: "i-lucide-heading-2",
          label: "Heading 2",
        },
        {
          kind: "heading",
          level: 3,
          icon: "i-lucide-heading-3",
          label: "Heading 3",
        },
        {
          kind: "heading",
          level: 4,
          icon: "i-lucide-heading-4",
          label: "Heading 4",
        },
      ],
    },
  ],
  // Inline marks
  [
    {
      kind: "mark",
      mark: "bold",
      icon: "i-lucide-bold",
      tooltip: { text: "Bold (⌘B)" },
    },
    {
      kind: "mark",
      mark: "italic",
      icon: "i-lucide-italic",
      tooltip: { text: "Italic (⌘I)" },
    },
    {
      kind: "mark",
      mark: "underline",
      icon: "i-lucide-underline",
      tooltip: { text: "Underline (⌘U)" },
    },
    {
      kind: "mark",
      mark: "strike",
      icon: "i-lucide-strikethrough",
      tooltip: { text: "Strikethrough" },
    },
    {
      kind: "mark",
      mark: "code",
      icon: "i-lucide-code",
      tooltip: { text: "Inline Code" },
    },
    {
      kind: "clearFormatting",
      icon: "i-lucide-remove-formatting",
      tooltip: { text: "Clear Formatting" },
    },
  ],
  // Alignment
  [
    {
      kind: "textAlign",
      align: "left",
      icon: "i-lucide-align-left",
      tooltip: { text: "Align Left" },
    },
    {
      kind: "textAlign",
      align: "center",
      icon: "i-lucide-align-center",
      tooltip: { text: "Align Center" },
    },
    {
      kind: "textAlign",
      align: "right",
      icon: "i-lucide-align-right",
      tooltip: { text: "Align Right" },
    },
  ],
  // Lists & blocks
  [
    {
      kind: "bulletList",
      icon: "i-lucide-list",
      tooltip: { text: "Bullet List" },
    },
    {
      kind: "orderedList",
      icon: "i-lucide-list-ordered",
      tooltip: { text: "Ordered List" },
    },
    {
      kind: "blockquote",
      icon: "i-lucide-text-quote",
      tooltip: { text: "Blockquote" },
    },
    {
      kind: "codeBlock",
      icon: "i-lucide-square-code",
      tooltip: { text: "Code Block" },
    },
    {
      kind: "horizontalRule",
      icon: "i-lucide-minus",
      tooltip: { text: "Horizontal Rule" },
    },
  ],
  // Link, image & history
  [
    {
      kind: "link",
      icon: "i-lucide-link",
      tooltip: { text: "Insert Link" },
    },
    {
      kind: "imageUpload",
      icon: "i-lucide-image",
      tooltip: { text: "Image" },
    },
    {
      kind: "undo",
      icon: "i-lucide-undo-2",
      tooltip: { text: "Undo (⌘Z)" },
    },
    {
      kind: "redo",
      icon: "i-lucide-redo-2",
      tooltip: { text: "Redo (⌘⇧Z)" },
    },
  ],
];
</script>

<template>
  <div
    class="flex flex-col rounded-[calc(var(--ui-radius)+2px)] border border-default overflow-hidden transition-shadow"
    :class="
      activeTab === 'editor'
        ? 'focus-within:shadow-sm focus-within:ring-1 focus-within:ring-primary/40'
        : ''
    "
  >
    <!-- Tab bar -->
    <div
      class="flex items-center justify-between border-b border-default bg-muted/50"
    >
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        :ui="{
          root: 'px-2 pt-1.5',
          list: 'gap-0',
          trigger: 'px-3 py-1.5 text-xs data-[state=active]:bg-background',
        }"
      />
      <div class="flex items-center gap-3 px-4 text-xs text-muted select-none">
        <span
          v-if="activeTab === 'editor' && readonly"
          class="flex items-center gap-1"
        >
          <UIcon name="i-lucide-lock" class="size-3" />
          Read only
        </span>
        <span>{{ wordCount }} {{ wordCount === 1 ? "word" : "words" }}</span>
        <USeparator orientation="vertical" class="h-3" />
        <span>{{ charCount }} chars</span>
      </div>
    </div>

    <!-- Edit tab -->
    <div
      v-if="activeTab === 'editor'"
      class="flex flex-col flex-1"
      :style="{ minHeight: props.minHeight }"
    >
      <LazyUEditor
        v-model="modelValue"
        v-slot="{ editor }"
        :extensions="extensions"
        :handlers="customHandlers"
        content-type="html"
        :placeholder="placeholder || 'Start writing…'"
        :disabled="readonly"
        class="w-full flex-1"
        :ui="{
          root: 'flex flex-col flex-1',
          base: 'prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus:outline-none flex-1',
        }"
      >
        <LazyUEditorToolbar
          :editor="editor"
          :items="items"
          class="border-b border-default bg-muted px-2 py-1.5 shrink-0"
        />
      </LazyUEditor>
    </div>

    <!-- Preview tab -->
    <div
      v-else
      class="flex-1 overflow-auto"
      :style="{ minHeight: props.minHeight }"
    >
      <div v-if="modelValue" class="px-4 py-3">
        <LazyMDC :value="modelValue" tag="article" />
      </div>

      <div
        v-else
        class="flex items-center justify-center h-full text-muted text-sm py-12"
      >
        <div class="text-center">
          <UIcon
            name="i-lucide-file-text"
            class="size-8 mx-auto mb-2 opacity-40"
          />
          <p>Nothing to preview</p>
        </div>
      </div>
    </div>
  </div>
</template>
