export type OrderStatus = "pending" | "paid" | "completed" | "cancelled";
export type SellerOrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "completed" | "cancelled";

export interface AdminOrderItem {
  id: number;
  product_name: string;
  sku: string | null;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
}

export interface AdminSellerOrder {
  id: number;
  store_id: number;
  status: SellerOrderStatus;
  subtotal: number | string;
  shipping_fee: number | string;
  store?: { id: number; name: string };
  items?: AdminOrderItem[];
}

export interface AdminOrder {
  id: number;
  status: OrderStatus;
  total_amount: number | string;
  shipping_fee: number | string;
  discount_amount: number | string;
  discount_code: string | null;
  payment_method: string;
  paid_at: string | null;
  receiver_name: string;
  receiver_phone: string;
  shipping_address: string;
  created_at: string;
  user?: { id: number; name: string; username: string; email?: string };
  seller_orders: AdminSellerOrder[];
}
