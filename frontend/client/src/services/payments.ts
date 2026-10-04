import { apiPost } from "../libs/api";

interface PaymentUrlResponse {
  success: boolean;
  data: { pay_url: string };
}

export const createMomoPayment = async (orderId: number): Promise<string> =>
  (await apiPost<PaymentUrlResponse>("/payments/momo/create", { order_id: orderId })).data.pay_url;

export const createVnpayPayment = async (orderId: number): Promise<string> =>
  (await apiPost<PaymentUrlResponse>("/payments/vnpay/create", { order_id: orderId })).data.pay_url;
