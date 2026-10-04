export interface SellerStore {
  id: number;
  seller_profile_id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  status: "active" | "inactive" | "pending";
  pickup_contact_name?: string | null;
  pickup_phone?: string | null;
  province_id?: number | null;
  province_name?: string | null;
  district_id?: number | null;
  district_name?: string | null;
  ward_code?: string | null;
  ward_name?: string | null;
  address_line?: string | null;
}

export interface SellerProductItem {
  id: number;
  code: string;
  name: string;
  price: number | string;
  discount_percent?: number;
  stock: number;
  status: number;
  category_id: number;
  images?: string[];
  thumbnail?: string | null;
  updated_at?: string;
}

export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  stock: number;
  low_stock: boolean;
  status: number;
}

export interface StockAdjustment {
  id: number;
  store_id: number;
  product_id: number;
  previous_stock: number;
  change: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
}
