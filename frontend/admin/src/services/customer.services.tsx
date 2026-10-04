import api from "../api/axios";

export interface CustomerRow {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  total_spent: number;
  orders_count: number;
  tier: string;
  tier_label: string;
}

export interface CustomerListParams {
  search?: string;
  tier?: string;
  page?: number;
  per_page?: number;
}

export const getCustomers = async (params: CustomerListParams = {}) => {
  const res = await api.get("admin/customers", { params });
  return res.data;
};

export const getCustomerDetail = async (id: number) => {
  const res = await api.get(`admin/customers/${id}`);
  return res.data;
};

// ---- Seller Center: khách hàng đã mua tại gian hàng

export const getStoreCustomers = async (storeId: number, params: CustomerListParams = {}) => {
  const res = await api.get(`seller/stores/${storeId}/customers`, { params });
  return res.data;
};

export const getStoreCustomerDetail = async (storeId: number, customerId: number) => {
  const res = await api.get(`seller/stores/${storeId}/customers/${customerId}`);
  return res.data;
};
