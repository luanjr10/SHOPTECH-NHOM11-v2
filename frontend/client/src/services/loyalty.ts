import { apiAuthGet, apiPost } from "../libs/api";
import type { LoyaltySummary, MyVoucher } from "../types/loyalty";

interface LoyaltyResponse {
  success: boolean;
  data: LoyaltySummary;
}

interface VouchersResponse {
  success: boolean;
  data: MyVoucher[];
}

interface ClaimResponse {
  success: boolean;
  message: string;
}

export const getLoyaltySummary = async (): Promise<LoyaltySummary> =>
  (await apiAuthGet<LoyaltyResponse>("/loyalty/summary")).data;

export const getMyVouchers = async (): Promise<MyVoucher[]> =>
  (await apiAuthGet<VouchersResponse>("/vouchers/mine")).data;

export const claimVoucher = async (couponId: number): Promise<ClaimResponse> =>
  apiPost<ClaimResponse>(`/vouchers/${couponId}/claim`);
