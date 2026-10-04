import { SpecificationItem } from "./specification.types";
import { PaginationMeta } from "./common.types";

export interface ProductVariantAttributes {
  color?: string;
  storage?: string;
  ram?: string;
  cpu?: string;
}

export interface ProductVariant {
  sku: string;
  attributes: ProductVariantAttributes;
  price: number;
  stock: number;
}

export interface ProductItem {
  id?: number;
  code: string;
  name: string;
  slug: string;
  price: number;
  discount_percent?: number;
  final_price?: number;
  stock: number;
  images: string[];
  thumbnail?: string;
  status: number;
  category_id: string;
  specifications?: SpecificationItem[];
  variants?: ProductVariant[];
  use_case_ids?: string[];
  updated_at?: string;
}

export type ProductListMeta = PaginationMeta;

export type ProductSort = "newest" | "price_asc" | "price_desc" | "discount_desc";