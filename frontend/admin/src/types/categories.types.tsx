import { PaginationMeta } from "./common.types";

export interface CategoryItem {
  id: number;
  parent_id?: number | null;
  parent?: { id: number; name: string } | null;
  code: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_type?: "icon" | "image";
  image?: string | null;
  status: number;
  status_order: number;
  products_count?: number;
  children_count?: number;
  brand_ids?: number[];
  created_at: string;
  updated_at: string;
}

export type CategoryListMeta = PaginationMeta;

export type CategorySort = "newest" | "name_asc" | "name_desc";
