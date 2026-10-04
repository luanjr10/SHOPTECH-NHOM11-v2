import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import * as cartService from "../services/cart";
import { type CartSummary } from "../types/cart";

interface CartContextValue {
  cart: CartSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, sku: string | null, quantity: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const EMPTY_CART: CartSummary = { items: [], total_item: 0, total_quantity: 0, subtotal: 0 };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      setCart(await cartService.getCart());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async (productId: number, sku: string | null, quantity: number) => {
    setCart(await cartService.addToCart(productId, sku, quantity));
  };

  const updateItem = async (itemId: number, quantity: number) => {
    setCart(await cartService.updateCartItem(itemId, quantity));
  };

  const removeItem = async (itemId: number) => {
    setCart(await cartService.removeCartItem(itemId));
  };

  const clear = async () => {
    setCart(await cartService.clearCart());
  };

  return (
    <CartContext.Provider
      value={{ cart: cart ?? EMPTY_CART, loading, refresh, addItem, updateItem, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart phải nằm trong <CartProvider>");
  }
  return ctx;
}
