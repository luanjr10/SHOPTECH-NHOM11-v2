import { apiAuthGet, apiDelete, apiPost, apiPut } from "../libs/api";
import { type CartSummary } from "../types/cart";

interface CartResponse {
  success: boolean;
  message?: string;
  data: CartSummary;
}

export const getCart = async (): Promise<CartSummary> =>
  (await apiAuthGet<CartResponse>("/cart")).data;

export const addToCart = async (
  productId: number,
  sku: string | null,
  quantity: number,
): Promise<CartSummary> =>
  (
    await apiPost<CartResponse>("/cart/items", {
      product_id: productId,
      sku,
      quantity,
    })
  ).data;

export const updateCartItem = async (
  itemId: number,
  quantity: number,
): Promise<CartSummary> =>
  (await apiPut<CartResponse>(`/cart/items/${itemId}`, { quantity })).data;

export const removeCartItem = async (itemId: number): Promise<CartSummary> =>
  (await apiDelete<CartResponse>(`/cart/items/${itemId}`)).data;

export const clearCart = async (): Promise<CartSummary> =>
  (await apiDelete<CartResponse>("/cart")).data;
