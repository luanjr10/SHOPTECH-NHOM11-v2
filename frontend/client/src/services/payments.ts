import { apiPost } from "../libs/api";

interface PaymentUrlResponse {
  success: boolean;
  data: { pay_url: string };
}

const createPayUrl = async (gateway: string, orderId: number): Promise<string> =>
  (await apiPost<PaymentUrlResponse>(`/payments/${gateway}/create`, { order_id: orderId })).data.pay_url;

export const createMomoPayment = (orderId: number) => createPayUrl("momo", orderId);

export const createVnpayPayment = (orderId: number) => createPayUrl("vnpay", orderId);

/** Thẻ ATM nội địa qua OnePay. */
export const createOnepayPayment = (orderId: number) => createPayUrl("onepay", orderId);

/** SePay: link tới trang trung gian của backend, trang này tự gửi form có chữ ký sang SePay. */
export const createSepayPayment = (orderId: number) => createPayUrl("sepay", orderId);
