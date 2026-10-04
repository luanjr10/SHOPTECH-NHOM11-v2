import api, { BACKEND_URL } from "../api/axios";

export const getSellerApplications = async (status?: string, page = 1) => {
  const res = await api.get("admin/seller-applications", {
    params: { status: status || undefined, page, per_page: 10 },
  });
  return res.data;
};
export const getSellerApplicationDetail = async (id: number) => {
  const res = await api.get(`admin/seller-applications/${id}`);
  return res.data;
};
export const approveSellerApplication = async (id: number) => {
  const res = await api.post(`admin/seller-applications/${id}/approve`);
  return res.data;
};
export const rejectSellerApplication = async (id: number, reason?: string) => {
  const res = await api.post(`admin/seller-applications/${id}/reject`, {
    reject_reason: reason,
  });
  return res.data;
};

export const getAdminStores = async (status?: string) => {
  const res = await api.get("admin/stores", {
    params: { status, per_page: 50 },
  });
  return res.data;
};
export const setStoreStatus = async (
  id: number,
  status: "active" | "inactive",
) => {
  const res = await api.patch(`admin/stores/${id}/status`, { status });
  return res.data;
};

export const getCommissions = async () => {
  const res = await api.get("admin/commissions");
  return res.data;
};
export const upsertCommission = async (payload: {
  scope: "default" | "category" | "store";
  category_id?: number | null;
  store_id?: number | null;
  rate: number;
  is_active?: boolean;
}) => {
  const res = await api.post("admin/commissions", payload);
  return res.data;
};
export const deleteCommission = async (id: number) => {
  const res = await api.delete(`admin/commissions/${id}`);
  return res.data;
};

export const getWithdrawals = async (status?: string) => {
  const res = await api.get("admin/withdrawals", {
    params: { status, per_page: 50 },
  });
  return res.data;
};
export const approveWithdrawal = async (id: number) => {
  const res = await api.post(`admin/withdrawals/${id}/approve`);
  return res.data;
};
export const rejectWithdrawal = async (id: number, note?: string) => {
  const res = await api.post(`admin/withdrawals/${id}/reject`, { note });
  return res.data;
};

export const createWithdrawalPayment = async (id: number) => {
  const res = await api.post(`admin/withdrawals/${id}/pay`);
  return res.data;
};

export const getAdminOrders = async (params: { status?: string; page?: number; per_page?: number } = {}) => {
  const res = await api.get("admin/orders", { params });
  return res.data;
};
export const getAdminOrderDetail = async (id: number) => {
  const res = await api.get(`admin/orders/${id}`);
  return res.data;
};
export const emailAdminOrderInvoice = async (id: number, email?: string) => {
  const res = await api.post(`admin/orders/${id}/invoice/email`, { email });
  return res.data;
};
export const adminOrderInvoicePdfUrl = (id: number) => `${BACKEND_URL}/api/admin/orders/${id}/invoice/pdf`;

export const getAdminReviews = async (params: { rating?: number; store_id?: number; page?: number } = {}) => {
  const res = await api.get("admin/reviews", { params });
  return res.data;
};
export const deleteAdminReview = async (id: number) => {
  const res = await api.delete(`admin/reviews/${id}`);
  return res.data;
};

export const getAdminStoreFollows = async (params: { search?: string; store_id?: number; page?: number } = {}) => {
  const res = await api.get("admin/store-follows", { params });
  return res.data;
};

export const getPlatformFundsSummary = async () => {
  const res = await api.get("admin/platform-funds/summary");
  return res.data.data;
};
export const getPlatformFundsHeld = async (page = 1) => {
  const res = await api.get("admin/platform-funds/held", { params: { page, per_page: 15 } });
  return res.data;
};
export const getPlatformFundsSettlements = async (page = 1) => {
  const res = await api.get("admin/platform-funds/settlements", { params: { page, per_page: 15 } });
  return res.data;
};
