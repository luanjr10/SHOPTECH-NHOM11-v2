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

export type SellerOrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "completed" | "cancelled";

export interface OrderShipment {
  id: number;
  provider: string;
  tracking_number: string | null;
  status: string | null;
  expected_delivery_time: string | null;
}

export interface SellerOrderItem {
  id: number;
  store_id: number;
  status: SellerOrderStatus;
  subtotal: number | string;
  shipping_fee: number | string;
  commission_amount: number | string;
  seller_amount: number | string;
  created_at: string;
  order?: {
    receiver_name: string;
    receiver_phone: string;
    shipping_address: string;
  };
  items?: Array<{
    id: number;
    product_name: string;
    sku: string | null;
    unit_price: number | string;
    quantity: number;
    line_total: number | string;
  }>;
  shipment?: OrderShipment | null;
}

export type ReturnRequestType = "return" | "warranty";
export type ReturnRequestStatus = "pending" | "approved" | "rejected";

export interface ReturnRequestItem {
  id: number;
  order_item_id: number;
  seller_order_id: number;
  type: ReturnRequestType;
  reason: string;
  images: string[];
  status: ReturnRequestStatus;
  seller_response: string | null;
  responded_at: string | null;
  created_at: string;
  order_item?: { id: number; product_name: string; sku: string | null; quantity: number };
  user?: { id: number; name: string; email: string; phone: string | null };
}
