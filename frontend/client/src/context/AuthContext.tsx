import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  type LoginPayload,
  type RegisterPayload,
} from "../services/auth";
import { type AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isSeller: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    fetchMe()
      .then((data) => {
        if (!ignore) setUser(data);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setUser(await loginUser(payload));
  };

  const register = async (payload: RegisterPayload) => {
    setUser(await registerUser(payload));
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const refresh = async () => {
    setUser(await fetchMe());
  };

  const updateUser = (next: AuthUser) => {
    setUser(next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSeller: user?.role === "seller",
        login,
        register,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải nằm trong <AuthProvider>");
  }
  return ctx;
}
