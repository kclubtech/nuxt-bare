import type { BlogPost } from "@/types/blog";
import type {
  StandardListResponse,
  StandardSingleResponse,
} from "@/types/response";

export interface PublicBlogParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  lang?: string;
}

export function usePublicPostsQuery(params: Ref<PublicBlogParams>) {
  return useAsyncData(
    () => `blog-list-${JSON.stringify(params.value)}`,
    () =>
      $fetch<StandardListResponse<BlogPost>>("/api/blog", {
        query: params.value,
      }),
    { watch: [params] },
  );
}

export function usePublicPostQuery(slug: Ref<string>, lang?: Ref<string>) {
  return useAsyncData(
    () => `blog-detail-${slug.value}-${lang?.value ?? ""}`,
    () =>
      $fetch<StandardSingleResponse<BlogPost>>(`/api/blog/${slug.value}`, {
        query: lang?.value ? { lang: lang.value } : undefined,
      }),
  );
}
