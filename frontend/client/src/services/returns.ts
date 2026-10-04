import { apiAuthGet, apiUpload } from "../libs/api";
import type { ReturnRequest, ReturnRequestType } from "../types/order";

interface ReturnRequestResponse {
  success: boolean;
  message: string;
  data: ReturnRequest;
}

export const submitReturnRequest = async (
  orderItemId: number,
  payload: { type: ReturnRequestType; reason: string; images: File[] },
): Promise<ReturnRequest> => {
  const form = new FormData();
  form.append("type", payload.type);
  form.append("reason", payload.reason);
  payload.images.forEach((file) => form.append("images[]", file));

  const res = await apiUpload<ReturnRequestResponse>(`/order-items/${orderItemId}/returns`, form);
  return res.data;
};

export const getReturnRequest = async (id: number): Promise<ReturnRequest> =>
  (await apiAuthGet<ReturnRequestResponse>(`/returns/${id}`)).data;
