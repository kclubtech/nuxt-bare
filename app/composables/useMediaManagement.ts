import { computed, ref, watch } from "vue";

import { useMediaManagementQuery } from "~/composables/useMediaManagementQuery";

export function useMediaManagement(options?: {
  initialType?: string;
  initialPage?: number;
  limit?: number;
  initialFolderName?: string;
}) {
  const page = ref(options?.initialPage ?? 1);
  const limit = ref(options?.limit ?? 12);
  const type = ref(options?.initialType ?? "image");
  const folderName = ref(options?.initialFolderName ?? "");

  const params = computed(() => ({
    page: page.value,
    limit: limit.value,
    type: type.value || undefined,
    privacy: "public",
    folderName: folderName.value || undefined,
  }));

  const {
    data: mediaResponse,
    isLoading,
    refetch,
  } = useMediaManagementQuery(params);

  const mediaItems = computed(() => mediaResponse.value?.data || []);
  const pagination = computed(() => mediaResponse.value?.meta || null);

  watch([type, folderName], () => {
    page.value = 1;
  });

  return {
    page,
    limit,
    type,
    folderName,
    mediaItems,
    pagination,
    isLoading,
    refetch,
  };
}
