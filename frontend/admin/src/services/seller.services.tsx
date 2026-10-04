import api from "../api/axios";
import { SellerStore, StockAdjustment } from "../types/seller.types";

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
