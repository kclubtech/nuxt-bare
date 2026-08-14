// Shared blog types used by both server and app.
export interface BlogListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color: string;
  language?: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  color: string;
  language?: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  content: string;
  language: string;
  status: "draft" | "published" | "archived";
  author: {
    id: number;
    name: string;
    email: string;
  };
  categories: BlogCategory[];
  tags: BlogTag[];
  featuredImage?: BlogFeaturedImage | null;
  featuredImageId?: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw post shape returned by the admin API (`GET /api/admin/blog/:id`).
 * Localized fields are translation records ({ en, id, ... }) so editors can
 * see and update every language. Localized output uses BlogPost instead.
 */
export interface AdminPost {
  id: number;
  slug: Record<string, string>;
  title: Record<string, string>;
  shortDescription: Record<string, string> | null;
  content: Record<string, string>;
  status: "draft" | "published" | "archived";
  featuredImageId?: number | null;
  createdAt: string;
  updatedAt: string;
  categories: BlogCategory[];
  tags: BlogTag[];
  featuredImage?: BlogFeaturedImage | null;
}

export interface BlogFeaturedImage {
  id: number;
  full_path: string;
  thumbnail?: {
    full_path: string;
  };
}

/**
 * Form input data sent to the API. Kept separate from BlogPost because the
 * form uses plain localized strings and a numeric featuredImageId.
 */
export interface BlogFormData {
  /** Present when editing an existing post */
  id?: number;
  slug: string;
  title: string;
  shortDescription: string;
  content: string;
  status: "draft" | "published" | "archived";
  categoryIds?: number[];
  tagIds?: number[];
  featuredImageId?: number | null;
}
