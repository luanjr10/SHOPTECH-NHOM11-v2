export type SellerOrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled";
export type OrderStatus = "pending" | "paid" | "completed" | "cancelled";
export type PaymentMethod = "cod" | "momo" | "vnpay" | "onepay" | "sepay";

export interface Shipment {
  id: number;
  provider: string;
  tracking_number: string | null;
  status: string | null;
  expected_delivery_time: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export type ReturnRequestType = "return" | "warranty";
export type ReturnRequestStatus = "pending" | "approved" | "rejected";

export interface ReturnRequest {
  id: number;
  order_item_id: number;
  type: ReturnRequestType;
  reason: string;
  images: string[];
  status: ReturnRequestStatus;
  seller_response: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  return_request?: ReturnRequest | null;
}

export interface WarrantyStatus {
  applicable: boolean;
  status: "chua_ap_dung" | "con_han" | "het_han";
  label: string;
  expires_at: string | null;
  purchased_at: string | null;
}

export interface SellerOrder {
  id: number;
  order_id: number;
  store_id: number;
  status: SellerOrderStatus;
  subtotal: number;
  shipping_fee: number;
  store?: { id: number; name: string; slug: string };
  items: OrderItem[];
  shipment?: Shipment | null;
  warranty?: WarrantyStatus;
  can_request_return?: boolean;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total_amount: number;
  shipping_fee: number;
  expected_delivery_time: string | null;
  payment_method: PaymentMethod;
  discount_code: string | null;
  discount_amount: number;
  paid_at: string | null;
  receiver_name: string;
  receiver_phone: string;
  shipping_address: string;
  created_at: string;
  seller_orders: SellerOrder[];
}

export function isOrderCancellable(order: Order): boolean {
  return order.status === "pending" && order.seller_orders.every((so) => so.status === "pending");
}

export interface OrderListResponse {
  success: boolean;
  data: {
    data: Order[];
    current_page: number;
    last_page: number;
    total: number;
  };
}
