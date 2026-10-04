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

export interface WalletInfo {
  id: number;
  balance: number | string;
  pending_balance: number | string;
  withdrawable_balance: number | string;
}

export type WalletTransactionType = "hold" | "release" | "refund" | "debit";

export interface WalletTransaction {
  id: number;
  type: WalletTransactionType | string;
  amount: number | string;
  balance_after: number | string;
  reference_type: string | null;
  reference_id: number | null;
  description: string | null;
  created_at: string;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders_count: number;
}

export interface RevenueSummary {
  days: number;
  orders_count: number;
  gross_revenue: number;
  commission_paid: number;
  net_revenue: number;
  series: RevenuePoint[];
}

export type { PayoutMethod, WithdrawalItem } from "./withdrawal.types";
