import api from "../api/axios";
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
