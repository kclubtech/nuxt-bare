<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    author?: string;
    date?: string;
    category?: string;
    backgroundImage?: string;
    siteName?: string;
  }>(),
  {
    title: "Article",
    description: "",
    author: "Ndongu",
    date: "",
    category: "",
    siteName: "Nuxt Bare",
  },
);
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col justify-between bg-white p-10 text-neutral-900"
  >
    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      style="
        background-image: radial-gradient(
          at 100% 0%,
          rgba(22, 163, 74, 0.15),
          transparent
        );
      "
    />

    <div class="relative flex items-start justify-between">
      <div
        class="rounded-full bg-primary px-5 py-1.5 text-[18px] font-bold text-white"
      >
        {{ category || siteName }}
      </div>
    </div>

    <div class="relative space-y-5">
      <h1
        class="m-0 text-[40px] leading-[1.1] font-bold"
        style="display: block; line-clamp: 3; text-overflow: ellipsis; text-wrap: balance"
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="m-0 max-w-[90%] text-[20px] leading-snug opacity-75"
        style="display: block; line-clamp: 2"
      >
        {{ description }}
      </p>
      <div class="flex items-center gap-3 pt-2">
        <p v-if="author" class="m-0 text-[16px] font-bold">{{ author }}</p>
        <span v-if="author && date" class="text-[16px] opacity-40">•</span>
        <p v-if="date" class="m-0 text-[16px] opacity-60">{{ date }}</p>
      </div>
    </div>

    <div
      v-if="backgroundImage"
      class="relative overflow-hidden rounded-2xl"
      style="height: 260px"
    >
      <img
        :src="backgroundImage"
        alt="Cover"
        class="h-full w-full"
        style="object-fit: cover"
      />
    </div>
    <div
      v-else
      class="relative flex h-[260px] items-center justify-center rounded-2xl bg-primary/5"
    >
      <p class="text-[30px] font-bold tracking-tight text-primary">
        {{ siteName }}
      </p>
    </div>
  </div>
</template>
