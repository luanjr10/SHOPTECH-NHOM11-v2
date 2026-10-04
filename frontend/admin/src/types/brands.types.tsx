import { PaginationMeta } from "./common.types";

export interface BrandItem {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export type BrandListMeta = PaginationMeta;

export type BrandSort = "newest" | "name_asc" | "name_desc";
