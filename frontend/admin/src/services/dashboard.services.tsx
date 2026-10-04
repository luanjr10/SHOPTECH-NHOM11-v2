import api from "../api/axios";
import { DashboardSummary, SellerDashboardSummary } from "../types/dashboard.types";

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get("admin/dashboard");
  return res.data.data;
};

export const getSellerDashboardSummary = async (storeId: number): Promise<SellerDashboardSummary> => {
  const res = await api.get(`seller/stores/${storeId}/dashboard`);
  return res.data.data;
};
