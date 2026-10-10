import { apiAuthGet, apiGet, apiPost, apiUpload } from "../libs/api";

export interface TradeInCatalog {
  categories: Record<string, string>;
  conditions: Array<{ key: string; label: string; hint: string }>;
  stores: Array<{ id: number; name: string; slug: string; logo: string | null }>;
  models: Array<{ id: number; store_id: number; category: string; brand: string; name: string }>;
  credit_valid_days: number;
}

export interface TradeInEstimate {
  model: string;
  base_price: number;
  condition: string;
  condition_label: string;
  multiplier: number;
  box_bonus: number;
  charger_bonus: number;
  estimated_price: number;
}

export interface TradeInRequestItem {
  id: number;
  store: { id: number; name: string; slug: string } | null;
  model_name: string;
  condition: string;
  has_box: boolean;
  has_charger: boolean;
  estimated_price: string;
  final_price: string | null;
  status: "pending" | "approved" | "rejected" | "used";
  admin_note: string | null;
  coupon_code: string | null;
  images: string[] | null;
  created_at: string;
}

export const getTradeInCatalog = async (): Promise<TradeInCatalog> =>
  (await apiGet<{ data: TradeInCatalog }>("/trade-in/catalog")).data;

export const estimateTradeIn = async (payload: {
  trade_in_model_id: number;
  condition: string;
  has_box: boolean;
  has_charger: boolean;
}): Promise<TradeInEstimate> =>
  (await apiPost<{ data: TradeInEstimate }>("/trade-in/estimate", payload)).data;

export const getMyTradeInRequests = async (): Promise<TradeInRequestItem[]> =>
  (await apiAuthGet<{ data: TradeInRequestItem[] }>("/trade-in/requests")).data;

export const submitTradeIn = async (form: FormData): Promise<{ message: string }> =>
  apiUpload<{ message: string }>("/trade-in/requests", form);
