import { apiGet } from "../libs/api";

export interface CompareProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  price: number;
  discount_percent: number;
  final_price: number;
  brand: string | null;
  store: string | null;
  in_stock: boolean;
  rating: number;
  reviews_count: number;
}

export interface CompareResult {
  products: CompareProduct[];
  rows: Array<{ name: string; values: Array<string | null> }>;
  highlights: { cheapest: number | null; best_rated: number | null };
}

export interface CompareVerdict {
  text: string;
  source: "ai" | "basic";
}

export const getComparison = async (ids: number[]): Promise<CompareResult> =>
  (await apiGet<{ data: CompareResult }>("/compare", { ids: ids.join(",") })).data;

export const getCompareVerdict = async (ids: number[]): Promise<CompareVerdict> =>
  (await apiGet<{ data: CompareVerdict }>("/compare/verdict", { ids: ids.join(",") })).data;
