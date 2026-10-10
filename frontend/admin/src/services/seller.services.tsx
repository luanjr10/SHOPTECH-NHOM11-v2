import api, { BACKEND_URL } from "../api/axios";
import {
  PayoutMethod,
  RevenueSummary,
  SellerStore,
  StockAdjustment,
  WalletInfo,
  WalletTransaction,
  WithdrawalItem,
} from "../types/seller.types";

export interface Paged<T> {
  current_page: number;
  data: T[];
  last_page: number;
  total: number;
}

// ---- Gian hàng

export const getMyStores = async (): Promise<SellerStore[]> => {
  const res = await api.get("seller/stores");
  return res.data.data;
};

export const createStore = async (form: FormData) => {
  const res = await api.post("seller/stores", form);
  return res.data;
};

export const updateStore = async (storeId: number, form: FormData) => {
  const res = await api.post(`seller/stores/${storeId}`, form);
  return res.data;
};

// ---- Sản phẩm

export const getStoreProducts = async (
  storeId: number,
  params: { page?: number; sort?: string; search?: string } = {},
) => {
  const res = await api.get(`seller/stores/${storeId}/products`, { params });
  return res.data;
};

export const createStoreProduct = async (storeId: number, form: FormData) => {
  const res = await api.post(`seller/stores/${storeId}/products`, form);
  return res.data;
};

export const updateStoreProduct = async (storeId: number, productId: number, form: FormData) => {
  const res = await api.post(`seller/stores/${storeId}/products/${productId}`, form);
  return res.data;
};

export const deleteStoreProduct = async (storeId: number, productId: number) => {
  const res = await api.delete(`seller/stores/${storeId}/products/${productId}`);
  return res.data;
};

// ---- Kho hàng

export const getStoreInventory = async (
  storeId: number,
  params: { lowStockOnly?: boolean; page?: number } = {},
) => {
  const res = await api.get(`seller/stores/${storeId}/inventory`, {
    params: { low_stock: params.lowStockOnly || undefined, page: params.page, per_page: 15 },
  });
  return res.data;
};

export const adjustStock = async (storeId: number, productId: number, change: number, reason?: string) => {
  const res = await api.post(`seller/stores/${storeId}/products/${productId}/stock-adjustments`, {
    change,
    reason,
  });
  return res.data;
};

export const getStockHistory = async (storeId: number, productId: number): Promise<StockAdjustment[]> => {
  const res = await api.get(`seller/stores/${storeId}/products/${productId}/stock-adjustments`);
  return res.data.data;
};

// ---- Doanh thu

export const getStoreRevenue = async (storeId: number, days = 30): Promise<RevenueSummary> => {
  const res = await api.get(`seller/stores/${storeId}/revenue`, { params: { days } });
  return res.data.data;
};

// ---- Ví & rút tiền (theo người bán, không gắn gian hàng)

export const getWallet = async (): Promise<WalletInfo> => {
  const res = await api.get("seller/wallet");
  return res.data.data;
};

/** data là trang phân trang: { current_page, data, last_page, total } */
export const getWalletTransactions = async (page = 1): Promise<Paged<WalletTransaction>> => {
  const res = await api.get("seller/wallet/transactions", { params: { page, per_page: 20 } });
  return res.data.data;
};

export const getWithdrawals = async (page = 1): Promise<Paged<WithdrawalItem>> => {
  const res = await api.get("seller/withdrawals", { params: { page, per_page: 15 } });
  return res.data.data;
};

export const createWithdrawal = async (payload: {
  amount: number;
  method: PayoutMethod;
  bank_account: string;
  bank_name: string;
  note?: string;
}) => {
  const res = await api.post("seller/withdrawals", payload);
  return res.data;
};

// ---- Cài đặt gian hàng

export const updateStorePickupAddress = async (
  storeId: number,
  payload: {
    pickup_contact_name: string;
    pickup_phone: string;
    province_id: number;
    district_id: number;
    ward_code: string;
    address_line: string;
  },
) => {
  const res = await api.put(`seller/stores/${storeId}/pickup-address`, payload);
  return res.data;
};

// ---- Đơn hàng & hoá đơn

export const getStoreOrders = async (storeId: number, status?: string, page = 1) => {
  const res = await api.get(`seller/stores/${storeId}/orders`, {
    params: { status: status || undefined, page, per_page: 15 },
  });
  return res.data;
};

export const getStoreOrderDetail = async (storeId: number, orderId: number) => {
  const res = await api.get(`seller/stores/${storeId}/orders/${orderId}`);
  return res.data;
};

export const updateOrderStatus = async (storeId: number, orderId: number, status: "confirmed" | "cancelled") => {
  const res = await api.patch(`seller/stores/${storeId}/orders/${orderId}/status`, { status });
  return res.data;
};

export const handoverOrder = async (storeId: number, orderId: number) => {
  const res = await api.post(`seller/stores/${storeId}/orders/${orderId}/handover`);
  return res.data;
};

export const driverMarkDelivered = async (storeId: number, orderId: number) => {
  const res = await api.post(`seller/stores/${storeId}/orders/${orderId}/driver-mark-delivered`);
  return res.data;
};

export const driverMarkCancelled = async (storeId: number, orderId: number) => {
  const res = await api.post(`seller/stores/${storeId}/orders/${orderId}/driver-mark-cancelled`);
  return res.data;
};

export const emailOrderInvoice = async (storeId: number, orderId: number, email?: string) => {
  const res = await api.post(`seller/stores/${storeId}/orders/${orderId}/invoice/email`, { email });
  return res.data;
};

export const orderInvoicePdfUrl = (storeId: number, orderId: number) =>
  `${BACKEND_URL}/api/seller/stores/${storeId}/orders/${orderId}/invoice/pdf`;

// ---- Hoàn trả / bảo hành

export const getStoreReturns = async (storeId: number, status?: string, page = 1) => {
  const res = await api.get(`seller/stores/${storeId}/returns`, {
    params: { status: status || undefined, page, per_page: 15 },
  });
  return res.data;
};

export const getStoreReturnDetail = async (storeId: number, returnId: number) => {
  const res = await api.get(`seller/stores/${storeId}/returns/${returnId}`);
  return res.data;
};

export const respondToReturn = async (
  storeId: number,
  returnId: number,
  payload: { status: "approved" | "rejected"; seller_response: string },
) => {
  const res = await api.patch(`seller/stores/${storeId}/returns/${returnId}/respond`, payload);
  return res.data;
};

// ---- Đánh giá & người theo dõi

/** data: trang đánh giá (current_page, data, last_page, total) + stats { average, count } */
export const getStoreReviews = async (storeId: number, params: { rating?: number; page?: number } = {}) => {
  const res = await api.get(`seller/stores/${storeId}/reviews`, { params });
  return res.data;
};

export const getStoreFollowers = async (storeId: number, page = 1) => {
  const res = await api.get(`seller/stores/${storeId}/followers`, { params: { page, per_page: 15 } });
  return res.data;
};

export const getStoreChatConversations = async (storeId: number) => {
  const res = await api.get(`seller/stores/${storeId}/chat/conversations`);
  return res.data.data;
};

export const getStoreChatMessages = async (storeId: number, conversationId: number, afterId = 0) => {
  const res = await api.get(`seller/stores/${storeId}/chat/conversations/${conversationId}/messages`, {
    params: { after_id: afterId },
  });
  return res.data.data;
};

export const buildChatForm = (body: string, files: File[]): FormData => {
  const form = new FormData();
  if (body) form.append("body", body);
  files.forEach((f) => form.append("attachments[]", f));
  return form;
};

export const sendStoreChatMessage = async (storeId: number, conversationId: number, body: string, files: File[] = []) => {
  const res = await api.post(
    `seller/stores/${storeId}/chat/conversations/${conversationId}/messages`,
    buildChatForm(body, files),
  );
  return res.data.data;
};

export interface TradeInModelPayload {
  category: string;
  brand: string;
  name: string;
  base_price: number;
  is_active: boolean;
}

export const getStoreTradeInRequests = async (storeId: number, status?: string) => {
  const res = await api.get(`seller/stores/${storeId}/trade-in/requests`, {
    params: { status: status || undefined, per_page: 50 },
  });
  return res.data;
};

export const reviewStoreTradeInRequest = async (
  storeId: number,
  id: number,
  payload: { status: "approved" | "rejected"; final_price?: number; note?: string },
) => {
  const res = await api.post(`seller/stores/${storeId}/trade-in/requests/${id}/review`, payload);
  return res.data;
};

export const getStoreTradeInModels = async (storeId: number) => {
  const res = await api.get(`seller/stores/${storeId}/trade-in/models`);
  return res.data;
};

export const createStoreTradeInModel = async (storeId: number, payload: TradeInModelPayload) => {
  const res = await api.post(`seller/stores/${storeId}/trade-in/models`, payload);
  return res.data;
};

export const updateStoreTradeInModel = async (storeId: number, id: number, payload: TradeInModelPayload) => {
  const res = await api.patch(`seller/stores/${storeId}/trade-in/models/${id}`, payload);
  return res.data;
};

export const deleteStoreTradeInModel = async (storeId: number, id: number) => {
  const res = await api.delete(`seller/stores/${storeId}/trade-in/models/${id}`);
  return res.data;
};

export interface Coupon {
  id: number;
  code: string;
  title?: string | null;
  description?: string | null;
  type: "percent" | "fixed" | "free_ship";
  target_tier?: string | null;
  new_customer_only?: boolean;
  weekday?: number | null;
  daily_limit?: number | null;
  is_free_ship: boolean;
  value: number | string;
  max_discount?: number | string | null;
  min_order_amount: number | string;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  used_count: number;
  expires_at?: string | null;
  is_active: boolean;
  claims_count?: number;
  redemptions_count?: number;
  created_at?: string;
}

export interface CouponPayload {
  code: string;
  title?: string;
  description?: string;
  type: "percent" | "fixed" | "free_ship";
  target_tier?: string | null;
  new_customer_only?: boolean;
  weekday?: number | null;
  daily_limit?: number | null;
  value?: number;
  max_discount?: number | null;
  min_order_amount?: number;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export const getStoreCoupons = async (storeId: number, params: { search?: string; page?: number } = {}) => {
  const res = await api.get(`seller/stores/${storeId}/coupons`, { params });
  return res.data;
};

export const createStoreCoupon = async (storeId: number, payload: CouponPayload) => {
  const res = await api.post(`seller/stores/${storeId}/coupons`, payload);
  return res.data;
};

export const updateStoreCoupon = async (storeId: number, id: number, payload: Partial<CouponPayload>) => {
  const res = await api.patch(`seller/stores/${storeId}/coupons/${id}`, payload);
  return res.data;
};

export const deleteStoreCoupon = async (storeId: number, id: number) => {
  const res = await api.delete(`seller/stores/${storeId}/coupons/${id}`);
  return res.data;
};

export interface StoreInstallmentSettings {
  enabled: boolean;
  min_order: number;
  options: Array<{ months: number; monthly_rate: number }>;
}

export const getStoreInstallmentSettings = async (storeId: number): Promise<StoreInstallmentSettings> => {
  const res = await api.get(`seller/stores/${storeId}/installments/settings`);
  return res.data.data;
};

export const saveStoreInstallmentSettings = async (
  storeId: number,
  payload: { enabled: boolean; min_order: number; terms: Array<{ months: number; monthly_rate: number }> },
) => {
  const res = await api.put(`seller/stores/${storeId}/installments/settings`, payload);
  return res.data;
};

export const getStoreInstallments = async (storeId: number, params: { status?: string; overdue?: boolean } = {}) => {
  const res = await api.get(`seller/stores/${storeId}/installments`, {
    params: { status: params.status || undefined, overdue: params.overdue ? 1 : undefined, per_page: 50 },
  });
  return res.data;
};

export const decideStoreInstallment = async (
  storeId: number,
  planId: number,
  payload: { decision: "approve" | "reject"; note?: string },
) => {
  const res = await api.post(`seller/stores/${storeId}/installments/${planId}/decide`, payload);
  return res.data;
};

export interface StoreAffiliateSettings {
  enabled: boolean;
  rate: number;
  hold_days: number;
  min_withdrawal: number;
}

export const getStoreAffiliateSettings = async (storeId: number): Promise<StoreAffiliateSettings> => {
  const res = await api.get(`seller/stores/${storeId}/affiliate/settings`);
  return res.data.data;
};

export const saveStoreAffiliateSettings = async (storeId: number, payload: StoreAffiliateSettings) => {
  const res = await api.put(`seller/stores/${storeId}/affiliate/settings`, payload);
  return res.data;
};

export const getStoreAffiliateWithdrawals = async (storeId: number, status?: string) => {
  const res = await api.get(`seller/stores/${storeId}/affiliate/withdrawals`, {
    params: { status: status || undefined, per_page: 50 },
  });
  return res.data;
};

export const reviewStoreAffiliateWithdrawal = async (
  storeId: number,
  id: number,
  status: "approved" | "rejected",
  note?: string,
) => {
  const res = await api.post(`seller/stores/${storeId}/affiliate/withdrawals/${id}/review`, { status, note });
  return res.data;
};

export const getStoreAffiliateCommissions = async (storeId: number) => {
  const res = await api.get(`seller/stores/${storeId}/affiliate/commissions`, { params: { per_page: 50 } });
  return res.data;
};

export interface StoreAffiliateProduct {
  id: number;
  name: string;
  price: number;
  discount_percent: number;
  thumbnail: string | null;
  affiliate_enabled: boolean;
  affiliate_rate: number | null;
}

export const getStoreAffiliateProducts = async (storeId: number, params: { search?: string; page?: number }) => {
  const res = await api.get(`seller/stores/${storeId}/affiliate/products`, { params: { ...params, per_page: 15 } });
  return res.data as { data: StoreAffiliateProduct[]; meta: { current_page: number; last_page: number; total: number } };
};

export const updateStoreAffiliateProducts = async (
  storeId: number,
  payload: { product_ids: number[]; enabled: boolean; rate?: number | null },
) => {
  const res = await api.put(`seller/stores/${storeId}/affiliate/products`, payload);
  return res.data;
};

export const payStoreAffiliateWithdrawal = async (storeId: number, id: number): Promise<string> => {
  const res = await api.post(`seller/stores/${storeId}/affiliate/withdrawals/${id}/pay`);
  return res.data.data.pay_url;
};
