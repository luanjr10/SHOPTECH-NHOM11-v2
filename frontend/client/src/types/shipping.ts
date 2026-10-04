export interface ShippingFeeByStore {
  store_id: number;
  store_name: string;
  fee: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  same_province_express: boolean;
}

export interface ShippingQuote {
  total_fee: number;
  expected_delivery_time: string | null;
  by_store: ShippingFeeByStore[];
}
