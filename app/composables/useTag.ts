import type { BlogTag } from "@/types/blog";
import { useAdminCrudList, useAdminCrudMutations } from "./useAdminCrud";

export type CreateTagInput = {
  name: Record<string, string> | string;
  slug?: Record<string, string> | string;
  color?: string;
};

const tagConfig: AdminCrudConfig = {
  key: ["admin", "tags"],
  baseUrl: "/api/admin/tags",
  label: "Tag",
};

export function useTagsQuery() {
  return useAdminCrudList<BlogTag>(tagConfig);
}

export function useTagCreateMutation() {
  return useAdminCrudMutations<BlogTag, CreateTagInput, Partial<CreateTagInput>>(
    tagConfig,
  ).create;
}

export function useTagUpdateMutation() {
  return useAdminCrudMutations<BlogTag, CreateTagInput, Partial<CreateTagInput>>(
    tagConfig,
  ).update;
}

export function useTagDeleteMutation() {
  return useAdminCrudMutations<BlogTag, CreateTagInput, Partial<CreateTagInput>>(
    tagConfig,
  ).remove;
}
