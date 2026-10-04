import api from "../api/axios";

export interface TierMeta {
  key: string;
  label: string;
  min_spent: number;
  color: string;
}

export interface Coupon {
  id: number;
  code: string;
  title?: string | null;
  description?: string | null;
  type: "percent" | "fixed" | "free_ship";
  target_tier?: string | null;
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
  value?: number;
  max_discount?: number | null;
  min_order_amount?: number;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export const getCoupons = async (params: { search?: string; page?: number } = {}) => {
  const res = await api.get("admin/coupons", { params });
  return res.data;
};

export const createCoupon = async (payload: CouponPayload) => {
  const res = await api.post("admin/coupons", payload);
  return res.data;
};

export const updateCoupon = async (id: number, payload: Partial<CouponPayload>) => {
  const res = await api.patch(`admin/coupons/${id}`, payload);
  return res.data;
};

export const deleteCoupon = async (id: number) => {
  const res = await api.delete(`admin/coupons/${id}`);
  return res.data;
};
