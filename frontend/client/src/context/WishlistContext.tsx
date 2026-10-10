import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import * as wishlistService from "../services/wishlist";

interface WishlistContextValue {
  isWished: (productId: number) => boolean;
  toggle: (productId: number) => Promise<boolean>;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    wishlistService
      .getWishlistIds()
      .then((list) => setIds(new Set(list)))
      .catch(() => setIds(new Set()));
  }, [user]);

  const isWished = useCallback((productId: number) => ids.has(productId), [ids]);

  /** Trả về false nếu chưa đăng nhập (để nơi gọi chuyển sang trang login). */
  const toggle = useCallback(
    async (productId: number) => {
      if (!user) return false;

      const wished = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wished) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        if (wished) await wishlistService.removeFromWishlist(productId);
        else await wishlistService.addToWishlist(productId);
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wished) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
      return true;
    },
    [ids, user],
  );

  return (
    <WishlistContext.Provider value={{ isWished, toggle, count: ids.size }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist phải nằm trong WishlistProvider");
  return ctx;
}
