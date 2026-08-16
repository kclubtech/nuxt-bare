import { useMutation, useQuery, useQueryCache } from "@pinia/colada";
import type { Ref } from "vue";
import type { Media, MediaFolder } from "~/types/db";
import type {
  StandardListResponse,
  StandardSingleResponse,
} from "~/types/response";

export interface MediaListParams {
  page?: number;
  limit?: number;
  type?: string;
  privacy?: string;
  folderName?: string;
}

export function useMediaManagementQuery(params: Ref<MediaListParams>) {
  return useQuery({
    key: () => ["admin", "media", params.value],
    query: async () => {
      const p = params.value;
      return $fetch<StandardListResponse<Media>>("/api/media", {
        params: {
          page: p.page,
          limit: p.limit,
          type: p.type,
          privacy: p.privacy,
          folderName: p.folderName,
        },
      });
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMediaFoldersQuery() {
  return useQuery({
    key: () => ["admin", "media", "folders"],
    query: () =>
      $fetch<StandardSingleResponse<MediaFolder[]>>("/api/media/folders"),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMediaUploadMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (payload: {
      file: File;
      type: string;
      privacy: string;
      description?: string;
      alt?: string;
      folderName?: string;
      aspectRatio?: "16:9" | "9:16";
    }) => {
      const formData = new FormData();
      formData.append("file", payload.file);
      formData.append("type", payload.type);
      formData.append("privacy", payload.privacy);
      if (payload.description) {
        formData.append("description", payload.description);
      }
      if (payload.alt) {
        formData.append("alt", payload.alt);
      }
      if (payload.folderName) {
        formData.append("folderName", payload.folderName);
      }
      if (payload.aspectRatio) {
        formData.append("aspectRatio", payload.aspectRatio);
      }

      return $fetch<{ message: string; data: Media }>("/api/media/upload", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ key: ["admin", "media"] });
      await cache.invalidateQueries({ key: ["admin", "media", "folders"] });
      toast.add({
        title: "Success",
        description: "Media uploaded successfully",
      });
    },
    onError: (error) => {
      console.log("Media upload failed:", error);
      throw error; // Let the component handle the error and show the toast
    },
  });
}

export function useMediaDeleteMutation() {
  const cache = useQueryCache();
  const toast = useToast();

  return useMutation({
    mutation: async (id: number) => {
      return $fetch<{ success: boolean; id: number }>(`/api/media/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ key: ["admin", "media"] });
      toast.add({
        title: "Success",
        description: "Media deleted successfully",
      });
    },
    onError: (error) => {
      throw error; // Let the component handle the error and show the toast
    },
  });
}
