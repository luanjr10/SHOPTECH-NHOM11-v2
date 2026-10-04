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
