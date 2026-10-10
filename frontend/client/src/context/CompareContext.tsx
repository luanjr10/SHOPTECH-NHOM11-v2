import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const MAX_COMPARE = 3;
const STORAGE_KEY = "shoptech_compare";

export interface CompareItem {
  id: number;
  name: string;
  thumbnail: string | null;
}

interface CompareContextValue {
  items: CompareItem[];
  has: (id: number) => boolean;
  /** Trả về false nếu danh sách đã đầy. */
  toggle: (item: CompareItem) => boolean;
  remove: (id: number) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function load(): CompareItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CompareItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage bị chặn → danh sách chỉ tồn tại trong phiên hiện tại
    }
  }, [items]);

  const has = useCallback((id: number) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback(
    (item: CompareItem) => {
      if (items.some((i) => i.id === item.id)) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        return true;
      }
      if (items.length >= MAX_COMPARE) return false;
      setItems((prev) => [...prev, item]);
      return true;
    },
    [items],
  );

  const remove = useCallback((id: number) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider value={{ items, has, toggle, remove, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare phải nằm trong CompareProvider");
  return ctx;
}
