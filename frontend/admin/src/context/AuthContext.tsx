import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as authService from "../services/auth.services";
import type { AuthUser } from "../services/auth.services";
import * as sellerService from "../services/seller.services";
import type { SellerStore } from "../types/seller.types";

const ACTIVE_STORE_KEY = "active_store_id";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  /** Seller Center: gian hàng của seller và gian hàng đang quản lý */
  stores: SellerStore[];
  activeStore: SellerStore | null;
  setActiveStore: (store: SellerStore) => void;
  refreshStores: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<SellerStore[]>([]);
  const [activeStore, setActiveStoreState] = useState<SellerStore | null>(null);

  const applyStores = useCallback((list: SellerStore[]) => {
    setStores(list);
    const savedId = Number(localStorage.getItem(ACTIVE_STORE_KEY));
    const found = list.find((s) => s.id === savedId) ?? list[0] ?? null;
    setActiveStoreState(found);
    if (found) localStorage.setItem(ACTIVE_STORE_KEY, String(found.id));
  }, []);

  const setActiveStore = useCallback((store: SellerStore) => {
    setActiveStoreState(store);
    localStorage.setItem(ACTIVE_STORE_KEY, String(store.id));
  }, []);

  const refreshStores = useCallback(async () => {
    applyStores(await sellerService.getMyStores());
  }, [applyStores]);

  /** Seller: tải danh sách gian hàng ngay sau khi biết người dùng. */
  const loadUser = useCallback(
    async (u: AuthUser) => {
      if (u.role === "seller") {
        await refreshStores().catch(() => applyStores([]));
      }
      setUser(u);
    },
    [refreshStores, applyStores],
  );

  useEffect(() => {
    authService
      .me()
      .then(loadUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadUser]);

  const login = async (loginId: string, password: string) => {
    const u = await authService.login(loginId, password);
    await loadUser(u);
    return u;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setStores([]);
    setActiveStoreState(null);
  };

  const updateUser = (u: AuthUser) => setUser(u);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser, stores, activeStore, setActiveStore, refreshStores }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng trong AuthProvider");
  return ctx;
}
