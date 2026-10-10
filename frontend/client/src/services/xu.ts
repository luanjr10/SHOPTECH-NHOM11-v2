import { apiAuthGet, apiPost } from "../libs/api";

export interface XuSummary {
  balance: number;
  checked_in_today: boolean;
  streak: number;
  next_reward: number;
  rules: {
    earn_percent_of_order: number;
    checkin_base: number;
    checkin_streak_bonus: number;
    checkin_streak_cycle: number;
    review_with_photo: number;
    review_text_only: number;
    max_redeem_percent: number;
  };
}

export interface XuTransaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export const getXuSummary = async (): Promise<XuSummary> =>
  (await apiAuthGet<{ data: XuSummary }>("/xu/summary")).data;

export const getXuTransactions = async (): Promise<XuTransaction[]> =>
  (await apiAuthGet<{ data: { data: XuTransaction[] } }>("/xu/transactions")).data.data;

export const checkInXu = async (): Promise<{ message: string; summary: XuSummary }> => {
  const res = await apiPost<{ message: string; data: { summary: XuSummary } }>("/xu/checkin");
  return { message: res.message, summary: res.data.summary };
};

export const getRedeemableXu = async (
  subtotal: number,
  discountAmount: number,
  discountIsFreeShip: boolean,
  discountIsStoreFunded = false,
): Promise<{ balance: number; max_usable: number }> =>
  (
    await apiPost<{ data: { balance: number; max_usable: number } }>("/xu/redeemable", {
      subtotal,
      discount_amount: discountAmount,
      discount_is_free_ship: discountIsFreeShip,
      discount_is_store_funded: discountIsStoreFunded,
    })
  ).data;
