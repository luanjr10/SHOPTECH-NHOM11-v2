import { apiAuthGet, apiPost } from "../libs/api";
import { type Order, type OrderListResponse, type PaymentMethod } from "../types/order";

export interface PlaceOrderPayload {
  items: Array<{ product_id: number; sku: string | null; quantity: number }>;
  receiver_name: string;
  receiver_phone: string;
  shipping_address: string;
  province_id: number;
  province_name: string;
  district_id: number;
  district_name: string;
  ward_code: string;
  ward_name: string;
  payment_method: PaymentMethod;
  coupon_code?: string | null;
}

interface PlaceOrderResponse {
  success: boolean;
  message: string;
  data: { id: number; total_amount: number };
}

interface OrderDetailResponse {
  success: boolean;
  data: Order;
}

export const placeOrder = async (
  payload: PlaceOrderPayload,
): Promise<PlaceOrderResponse["data"]> =>
  (await apiPost<PlaceOrderResponse>("/orders", payload)).data;

export const getMyOrders = async (page = 1): Promise<OrderListResponse["data"]> =>
  (await apiAuthGet<OrderListResponse>(`/orders/mine?page=${page}`)).data;

export const getOrder = async (id: number): Promise<Order> =>
  (await apiAuthGet<OrderDetailResponse>(`/orders/${id}`)).data;

export const cancelOrder = async (id: number): Promise<Order> =>
  (await apiPost<OrderDetailResponse>(`/orders/${id}/cancel`)).data;

export const completeSellerOrder = async (
  orderId: number,
  sellerOrderId: number,
): Promise<void> => {
  await apiPost(`/orders/${orderId}/seller-orders/${sellerOrderId}/complete`);
};
