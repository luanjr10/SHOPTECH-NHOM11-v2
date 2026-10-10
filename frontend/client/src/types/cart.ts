import { type ProductVariantAttributes } from "./product";

export interface CartItemResponse {
  id: number;
  product: {
    id: number;
    name: string;
    slug?: string;
    thumbnail: string | null;
    store_id?: number | null;
  } | null;
  variant: { sku: string; attributes: ProductVariantAttributes } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  available_stock: number;
  unavailable: boolean;
  stock_insufficient: boolean;
}

export interface CartSummary {
  items: CartItemResponse[];
  total_item: number;
  total_quantity: number;
  subtotal: number;
}
