export interface PlatformFundsSummary {
  total_held: number;
  total_withdrawable: number;
  total_paid_out: number;
}

export interface PlatformFundOrderItem {
  id: number;
  product_name: string;
  sku?: string | null;
  unit_price?: number | string;
  quantity: number;
  line_total?: number | string;
}

export interface PlatformFundOrder {
  id: number;
  order_id: number;
  status: "shipping" | "delivered" | "completed";
  subtotal: number | string;
  commission_rate: number | string;
  seller_amount: number | string;
  completed_at: string | null;
  created_at: string;
  held_amount?: number;
  settled_amount?: number;
  customer_received: boolean;
  store?: { id: number; name: string };
  seller_profile?: { user?: { name: string; username: string } };
  items: PlatformFundOrderItem[];
  order?: { receiver_name: string; receiver_phone?: string; shipping_address?: string; payment_method: string };
  shipment?: { status: string | null; expected_delivery_time: string | null; shipped_at: string | null } | null;
}
