import { apiAuthGet, apiDelete, apiPatch, apiPost } from "../libs/api";

export interface WishlistItem {
  product_id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  discount_percent: number;
  current_price: number;
  in_stock: boolean;
  target_price: number | null;
  target_reached: boolean;
  added_at: string;
}

export const getWishlist = async (): Promise<WishlistItem[]> =>
  (await apiAuthGet<{ data: WishlistItem[] }>("/wishlist")).data;

export const getWishlistIds = async (): Promise<number[]> =>
  (await apiAuthGet<{ data: number[] }>("/wishlist/ids")).data;

export const addToWishlist = (productId: number, targetPrice?: number | null) =>
  apiPost("/wishlist", { product_id: productId, target_price: targetPrice ?? undefined });

export const setWishlistTarget = (productId: number, targetPrice: number | null) =>
  apiPatch(`/wishlist/${productId}`, { target_price: targetPrice });

export const removeFromWishlist = (productId: number) => apiDelete(`/wishlist/${productId}`);
