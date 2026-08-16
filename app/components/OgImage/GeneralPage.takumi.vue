<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    siteName?: string;
  }>(),
  {
    title: "Nuxt Bare",
    description: "",
    siteName: "Nuxt Bare",
  },
);
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col items-center justify-center bg-white p-10 text-neutral-900"
  >
    <div
      class="absolute top-0 right-0 bottom-0 left-0"
      style="
        background-image: radial-gradient(
          at 100% 0%,
          rgba(22, 163, 74, 0.18),
          transparent
        );
      "
    />

    <div class="relative flex flex-col items-center gap-6 text-center">
      <p
        class="m-0 text-[24px] font-bold tracking-[0.3em] uppercase opacity-50"
      >
        {{ siteName }}
      </p>
      <h1
        class="m-0 max-w-[900px] text-[64px] leading-tight font-bold"
        style="display: block; text-wrap: balance"
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="m-0 max-w-[750px] text-[30px] leading-snug opacity-70"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>
