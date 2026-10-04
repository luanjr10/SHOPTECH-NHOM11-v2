export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface Brand {
  id: number;
  code: string;
  name: string;
  logo: string | null;
}

export interface Category {
  id: number;
  parent_id?: number | null;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_type?: "icon" | "image";
  image?: string | null;
  status: number;
  status_order?: number;
  products_count?: number;
  children_count?: number;
  children?: Category[];
  brands?: Brand[];
}

export interface StoreRef {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface StoreStats {
  completed_orders: number;
  total_orders: number;
  orders_30d: number;
  completion_rate: number | null;
  complaint_rate: number;
  rating: number | null;
  rating_count: number;
  followers: number;
  products_count: number;
  seller_level: string;
}

export interface StoreListItem extends StoreRef {
  description: string | null;
  products_count: number;
  followers_count: number;
  reviews_count: number;
  rating: number;
  created_at: string;
}

export type StoreSort = "newest" | "products_desc" | "followers_desc" | "name_asc";

export interface Store extends StoreRef {
  description: string | null;
  status: string;
  products_count?: number;
  joined_at?: string;
  seller_profile?: { id: number; display_name: string } | null;
  categories?: { id: number; name: string; slug: string }[];
  stats?: StoreStats;
  is_following?: boolean;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  slug: string;
  price: number;
  discount_percent: number;
  is_featured?: boolean;
  is_flash_sale?: boolean;
  stock: number;
  status: number;
  category_id: number;
  store_id?: number | null;
  store?: StoreRef | null;
  images: string[];
  thumbnail: string | null;
  final_price: number;
  rating?: number;
  reviews_count?: number;
}

export interface ProductSpecItem {
  name: string;
  value: string;
}

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

export interface ProductDetail extends Product {
  specifications: ProductSpecItem[];
  variants: ProductVariant[];
}

export interface CategoryQuickLink {
  title: string;
  icon: string;
}

export interface UseCase {
  id: string;
  categoryId: number;
  name: string;
  slug: string;
  image: string;
  sortOrder: number;
  status: boolean;
}

export interface MainCategoryRef {
  code: string;
  label: string;
}

export type ProductSort = "price_desc" | "price_asc" | "discount_desc";
