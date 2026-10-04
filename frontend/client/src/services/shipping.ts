import { apiPost } from "../libs/api";
import { type ShippingQuote } from "../types/shipping";

export interface ShippingFeeItem {
  product_id: number;
  quantity: number;
}

export const calculateShippingFee = async (
  districtId: number,
  wardCode: string,
  items: ShippingFeeItem[],
  provinceId?: number,
): Promise<ShippingQuote> =>
  (
    await apiPost<{ data: ShippingQuote }>("/shipping/fee", {
      district_id: districtId,
      ward_code: wardCode,
      province_id: provinceId,
      items,
    })
  ).data;
