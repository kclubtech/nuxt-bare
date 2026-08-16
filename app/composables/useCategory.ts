import type { BlogCategory } from "@/types/blog";
import { useAdminCrudList, useAdminCrudMutations } from "./useAdminCrud";

export type CreateCategoryInput = {
  name: Record<string, string> | string;
  slug?: Record<string, string> | string;
  description?: Record<string, string> | string;
  color?: string;
};

const categoryConfig: AdminCrudConfig = {
  key: ["admin", "categories"],
  baseUrl: "/api/admin/categories",
  label: "Category",
};

export function useCategoriesQuery() {
  return useAdminCrudList<BlogCategory>(categoryConfig);
}

export function useCategoryCreateMutation() {
  return useAdminCrudMutations<
    BlogCategory,
    CreateCategoryInput,
    Partial<CreateCategoryInput>
  >(categoryConfig).create;
}

export function useCategoryUpdateMutation() {
  return useAdminCrudMutations<
    BlogCategory,
    CreateCategoryInput,
    Partial<CreateCategoryInput>
  >(categoryConfig).update;
}

export function useCategoryDeleteMutation() {
  return useAdminCrudMutations<
    BlogCategory,
    CreateCategoryInput,
    Partial<CreateCategoryInput>
  >(categoryConfig).remove;
}
