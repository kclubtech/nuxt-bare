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
    class="relative flex h-full w-full flex-col justify-between bg-white p-[60px] text-neutral-900"
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

    <!-- Category badge -->
    <div class="relative flex items-start justify-between">
      <div
        class="rounded-full bg-primary px-6 py-2 text-[22px] font-bold text-white"
      >
        {{ category || siteName }}
      </div>
    </div>

    <div class="relative grid flex-1 grid-cols-[1.4fr_1fr] items-center gap-10">
      <!-- Text column -->
      <div class="flex flex-col justify-between gap-6 py-4">
        <h1
          class="m-0 text-[42px] leading-[1.1] font-bold"
          style="display: block; line-clamp: 3; text-overflow: ellipsis; text-wrap: balance"
        >
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="m-0 max-w-[95%] text-[24px] leading-snug opacity-80"
          style="display: block; line-clamp: 2"
        >
          {{ description }}
        </p>
        <div class="flex items-center gap-4">
          <p v-if="author" class="m-0 text-[20px] font-bold">
            {{ author }}
          </p>
          <span v-if="author && date" class="text-[20px] opacity-40">•</span>
          <p v-if="date" class="m-0 text-[20px] opacity-60">{{ date }}</p>
        </div>
      </div>

      <!-- Cover image column -->
      <div
        v-if="backgroundImage"
        class="overflow-hidden rounded-[24px]"
        style="min-height: 320px"
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
        class="flex h-full min-h-[320px] items-center justify-center rounded-[24px] bg-primary/5"
      >
        <p class="text-[28px] font-bold tracking-tight text-primary">
          {{ siteName }}
        </p>
      </div>
    </div>

    <p class="relative m-0 text-[18px] font-bold tracking-[0.3em] uppercase opacity-40">
      {{ siteName }}
    </p>
  </div>
</template>
