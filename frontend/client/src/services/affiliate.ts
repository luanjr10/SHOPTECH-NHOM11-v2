import { apiAuthGet, apiGet, apiPost } from "../libs/api";

export interface AffiliateStoreSummary {
  store: { id: number; name: string; slug: string; logo: string | null };
  settings: { enabled: boolean; rate: number; hold_days: number; min_withdrawal: number };
  balances: {
    available: number;
    pending: number;
    withdrawn: number;
    withdrawing: number;
    total_earned: number;
  };
}

export interface AffiliateTotals {
  available: number;
  pending: number;
  withdrawing: number;
  withdrawn: number;
  total_earned: number;
}

export interface AffiliateSummary {
  referral_code: string;
  totals: AffiliateTotals;
  stores: AffiliateStoreSummary[];
}

export interface AffiliateProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  original_price: number;
  discount_percent: number;
  thumbnail: string | null;
  store: { id: number; name: string; slug: string };
  rate: number;
  commission_estimate: number;
}

export interface AffiliateProductPage {
  data: AffiliateProduct[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface AffiliateCommission {
  id: number;
  order_amount: string;
  rate: string;
  amount: string;
  status: "pending" | "cancelled";
  available_at: string;
  created_at: string;
  referred_user: { id: number; name: string } | null;
  store: { id: number; name: string } | null;
}

export interface AffiliateWithdrawal {
  id: number;
  amount: string;
  bank_name: string;
  bank_account: string;
  account_holder: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
  store: { id: number; name: string } | null;
}

export interface WithdrawalPayload {
  store_id: number;
  amount: number;
  momo_phone: string;
  account_holder: string;
}

interface Paginated<T> {
  data: T[];
}

export const getAffiliateSummary = async (): Promise<AffiliateSummary> =>
  (await apiAuthGet<{ data: AffiliateSummary }>("/affiliate/summary")).data;

export const getAffiliateCommissions = async (): Promise<AffiliateCommission[]> =>
  (await apiAuthGet<{ data: Paginated<AffiliateCommission> }>("/affiliate/commissions")).data.data;

export const getAffiliateWithdrawals = async (): Promise<AffiliateWithdrawal[]> =>
  (await apiAuthGet<{ data: Paginated<AffiliateWithdrawal> }>("/affiliate/withdrawals")).data.data;

export const requestAffiliateWithdrawal = (payload: WithdrawalPayload) =>
  apiPost<{ success: boolean; message: string }>("/affiliate/withdrawals", payload);

export const getAffiliateProducts = (params: {
  search?: string;
  store_id?: number;
  page?: number;
  per_page?: number;
}): Promise<AffiliateProductPage> => apiGet<AffiliateProductPage>("/affiliate/products", params);
