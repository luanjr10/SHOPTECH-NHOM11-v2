import { apiPost } from "../libs/api";

export interface CouponResult {
  code: string;
  discount_amount: number;
  discount_target: "subtotal" | "shipping";
  is_free_ship: boolean;
  capped?: boolean;
  store_funded?: boolean;
  original_discount?: number;
}

interface ApplyCouponResponse {
  success: boolean;
  data: CouponResult;
}

export const applyCoupon = async (
  code: string,
  subtotal: number,
  shippingFee = 0,
  receiverPhone?: string,
  storeShippingFees?: Record<number, number>,
): Promise<CouponResult> =>
  (
    await apiPost<ApplyCouponResponse>("/coupons/apply", {
      code,
      subtotal,
      shipping_fee: shippingFee,
      receiver_phone: receiverPhone || undefined,
      store_shipping_fees: storeShippingFees,
    })
  ).data;
